import type { Context } from "hono";
import { exec } from "child_process";
import { fetchUserList } from "../repository/user.js";
import { WORKSPACE_ID } from "../constants/index.js";

/**
 * ARPコマンドを実行して在席ユーザーを確認する
 */
export const checkApi = async (c: Context) => {
  const userList = await fetchUserList(WORKSPACE_ID);

  try {
    const stdout = await execCommand("arp -a");

    // ARPテーブルからMACアドレスを抽出
    const connectedDevices = stdout
      .split("\n")
      .map((line) => {
        // MACアドレスのパターンを検出（OSによって出力形式が異なる場合があるため調整が必要かも）
        const match = line.match(/\((.*?)\).*?at (.*?) on/);
        return match ? { ip: match[1], mac: match[2].toLowerCase() } : null;
      })
      .filter(Boolean);

    // 接続デバイスとユーザーリストのdeviceのmacAddressを照合
    const presentUsers = connectedDevices
      .map((device) =>
        userList.find((user) =>
          user.deviceList.find((d) => d.macAddress === device?.mac || "")
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
