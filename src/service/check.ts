import type { Context } from "hono";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { fetchUserList } from "../repository/user.js";
import { WORKSPACE_ID } from "../constants/index.js";
const execF = promisify(execFile);

const ARP_SCAN_ARGS = [
  "--localnet",
  "--interface=en0",
  "--retry=1",
  "--interval=100",
  "--timeout=200",
  "--ignoredups",
  "--plain", // IP  MAC  Vendor
  "--quiet",
];

const needsSudo = true; // sudo が不要なら false に
export const runArpScan = async (): Promise<string> => {
  const cmd = needsSudo
    ? ["sudo", "arp-scan", ...ARP_SCAN_ARGS]
    : ["arp-scan", ...ARP_SCAN_ARGS];
  const { stdout } = await execF(cmd[0], cmd.slice(1));
  return stdout;
};

export const checkApi = async (c: Context) => {
  const userList = await fetchUserList(WORKSPACE_ID);

  try {
    // const stdout = await execCommand("arp -a");
    const stdout = await runArpScan();
    // ARPテーブルからMACアドレスを抽出
    const connectedDevices = stdout
      .trim()
      .split("\n")
      .filter((l) => /^\d+\.\d+\.\d+\.\d+/.test(l)) // ヘッダ行の除去
      .map((l) => {
        const [ip, mac] = l.split(/\s+/);
        return { ip, mac: mac.toLowerCase() };
      });

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
