import type { Context } from "hono";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { fetchUserList } from "../repository/user.js";
import { WORKSPACE_ID } from "../constants/index.js";
import fs from "fs";
import path from "path";
import os from "os";
const execF = promisify(execFile);

// ネットワークインターフェースを自動検出する関数
export const getNetworkInterface = async (): Promise<string> => {
  try {
    // Linux環境の場合、ip route getコマンドを使用
    if (os.platform() === "linux") {
      const stdout = await execCommand("ip route get 8.8.8.8");
      const match = stdout.match(/dev\s+(\S+)/);
      if (match && match[1]) {
        return match[1]; // 例: enp2s0
      }
    }

    // macOSの場合
    if (os.platform() === "darwin") {
      // macOSではen0が一般的
      return "en0";
    }

    // 他のプラットフォームやコマンドが失敗した場合のフォールバック
    // ネットワークインターフェースを取得
    const interfaces = os.networkInterfaces();
    for (const [name, netInterface] of Object.entries(interfaces)) {
      // 有効なIPv4アドレスを持つ最初の非ループバックインターフェースを使用
      const ipv4Interface = netInterface?.find(
        (iface) => iface.family === "IPv4" && !iface.internal
      );
      if (ipv4Interface) {
        return name;
      }
    }

    // デフォルト値
    console.warn(
      "ネットワークインターフェースを自動検出できませんでした。デフォルト値を使用します。"
    );
    return "en0";
  } catch (error) {
    console.error(`ネットワークインターフェース検出エラー: ${error}`);
    return "en0"; // エラー時のデフォルト値
  }
};

// ARP_SCAN_ARGSはrunArpScan内で動的に設定するように変更
const BASE_ARP_SCAN_ARGS = [
  "--localnet",
  "--retry=1",
  "--interval=100",
  "--timeout=200",
  "--ignoredups",
  "--plain", // IP  MAC  Vendor
  "--quiet",
];

const needsSudo = true; // sudo が不要なら false に
export const runArpScan = async (): Promise<string> => {
  // 動的にネットワークインターフェースを取得
  const networkInterface = await getNetworkInterface();

  // インターフェース引数を追加
  const arpScanArgs = [
    ...BASE_ARP_SCAN_ARGS,
    `--interface=${networkInterface}`,
  ];

  const cmd = needsSudo
    ? ["sudo", "arp-scan", ...arpScanArgs]
    : ["arp-scan", ...arpScanArgs];
  const { stdout } = await execF(cmd[0], cmd.slice(1));
  return stdout;
};

// ログディレクトリの設定
const LOG_DIR = path.join(process.cwd(), "logs");

// 日付ごとのログファイル名を生成
const getLogFilePath = (): string => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD形式
  return path.join(LOG_DIR, `arp-scan-${today}.log`);
};

// ログディレクトリが存在しない場合は作成
const ensureLogDir = (): void => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

// スキャン結果をログに記録
const logScanResult = (scanName: string, result: string): void => {
  ensureLogDir();
  const logFile = getLogFilePath();
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${scanName}\n${result}\n\n`;

  fs.appendFileSync(logFile, logEntry);
};

// 1分間隔で2回スキャンを実行して結果を統合する関数
export const runDoubleArpScan = async (): Promise<
  { ip: string; mac: string }[]
> => {
  // 1回目のスキャン
  const firstScan = await runArpScan();
  logScanResult("FIRST_SCAN", firstScan);

  // 1分待機
  await new Promise((resolve) => setTimeout(resolve, 60000));

  // 2回目のスキャン
  const secondScan = await runArpScan();
  logScanResult("SECOND_SCAN", secondScan);

  // 両方のスキャン結果からデバイスリストを抽出
  const parseDevices = (stdout: string) => {
    return stdout
      .trim()
      .split("\n")
      .filter((l) => /^\d+\.\d+\.\d+\.\d+/.test(l)) // ヘッダ行の除去
      .map((l) => {
        const [ip, mac] = l.split(/\s+/);
        return { ip, mac: mac.toLowerCase() };
      });
  };

  const firstDevices = parseDevices(firstScan);
  const secondDevices = parseDevices(secondScan);

  // 両方の結果を統合し、MACアドレスでユニークにする
  const allDevices = [...firstDevices, ...secondDevices];
  const uniqueDevices = Array.from(
    new Map(allDevices.map((device) => [device.mac, device])).values()
  );

  return uniqueDevices;
};

export const checkApi = async (c: Context) => {
  const userList = await fetchUserList(WORKSPACE_ID);

  try {
    // 1分間隔で2回スキャンを実行
    const connectedDevices = await runDoubleArpScan();

    // 接続デバイスとユーザーリストのdeviceのmacAddressを照合
    const presentUsers = connectedDevices
      .map((device) =>
        userList.find((user) =>
          user.deviceList.find(
            (d) =>
              d.macAddress.toLowerCase() === (device?.mac || "").toLowerCase()
          )
        )
      )
      .filter(Boolean);

    // 在席状況メッセージの作成
    const message = presentUsers.length
      ? `オフィスにいるのは：${presentUsers
          .map((user) => user?.name)
          .join("、")}`
      : "誰もオフィスにいません";

    // 結果をJSONで返す
    return c.json({
      status: "success",
      message: message,
      presentUsers: presentUsers,
      connectedDevices: connectedDevices,
    });
  } catch (error) {
    console.error(`ARPコマンド実行エラー: ${error}`);
    return c.json(
      {
        status: "error",
        message: "デバイスリストの取得に失敗しました",
        error: String(error),
      },
      500
    );
  }
};

/**
 * コマンドを実行するPromiseを返す関数
 */
function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
        return;
      }
      resolve(stdout);
    });
  });
}
