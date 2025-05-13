import type { Context } from "hono";
import { db, slackApp } from "../index.js";
import { fetchUserList } from "../repository/user.js";
import { runArpScan } from "../service/check.js";
import { WORKSPACE_ID } from "../constants/index.js";
import type { ReceiverEvent } from "@slack/bolt";

export const setupSlackEventListeners = () => {
  slackApp.event("app_mention", async ({ event, say }) => {
    // メッセージに「オフィス」が含まれているか確認
    if (event.text.includes("オフィス")) {
      // 処理開始を通知
      await say(
        `バッファローくんがオフィスの様子を見てくるよ...ちょっと待っててね :eyes:`
      );

      // 非同期で処理を実行
      setTimeout(async () => {
        try {
          // ユーザーリストを取得
          const userList = await fetchUserList(WORKSPACE_ID);

          // ARPスキャンを実行
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
                    d.macAddress.toLowerCase() ===
                    (device?.mac || "").toLowerCase()
                )
              )
            )
            .filter(Boolean);

          // 在席状況メッセージの作成
          let message;
          if (presentUsers.length) {
            message = `現在Wi-Fiに接続しているのは...この人たちだよ！:cow:\n${presentUsers
              .map((user) => `<@${user?.id}>`)
              .join("、")}`;
          } else {
            message = `:thinking_face: 今は誰もWi-Fiにいないみたい...オフィスは静まり返ってるよ :city_sunset:`;
          }

          // 結果をSlackに送信
          await say(message);
        } catch (error) {
          console.error(`オフィスチェックエラー: ${error}`);
          await say(
            `:warning: ごめんね、バッファローくんがつまずいちゃったみたい... エラー内容: ${error}`
          );
        }
      }, 100); // 非同期処理を開始するまでの短い遅延

      return;
    }
  });
};

export const slackApi = async (c: Context) => {
  const body = await c.req.json();

  // URL検証リクエストに対応
  if (body.type === "url_verification") {
    return c.json({ challenge: body.challenge });
  }

  try {
    // 通常イベント処理

    // Boltが期待する形式のオブジェクトを作成
    const event: ReceiverEvent = {
      body: body,
      ack: async (response: any) => {
        console.log("Slack ack response:", response);
        return Promise.resolve();
      },
    };

    // 正しい形式でprocessEventを呼び出し
    await slackApp.processEvent(event);
    return c.text("OK");
  } catch (error) {
    console.error("Slackイベント処理エラー:", error);
    return c.text("Error processing Slack event", 500);
  }
};
