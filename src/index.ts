import { Hono } from "hono";
import bolt from "@slack/bolt";
const { App } = bolt;
import admin from "firebase-admin";
import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import { fetchUserList, updateUser } from "./repository/user.js";
import { WORKSPACE_ID } from "./constants/index.js";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { Device, User } from "./firebase/models/user.js";

// ESモジュールで__dirnameの代わりに使用
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = new Hono();

// Slackアプリの初期化
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Firestoreの初期化
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
export const db = admin.firestore();

// Slackイベントのリスナー
slackApp.event("app_mention", async ({ event, say }) => {
  await say(`こんにちは <@${event.user}>! Firestoreにメッセージを保存します。`);

  await db.collection("messages").add({
    user: event.user,
    text: event.text,
    timestamp: event.ts,
  });

  await say("メッセージがFirestoreに保存されました！");
});

// ルートエンドポイント
app.get("/", (c) => {
  return c.text("Buffalo Watch API サーバーが稼働中です！");
});

// ARPコマンドを実行して在席ユーザーを確認するエンドポイント
app.get("/check", async (c) => {
  const userList = await fetchUserList(WORKSPACE_ID);

  return new Promise((resolve) => {
    exec("arp -a", (error, stdout, stderr) => {
      if (error) {
        console.error(`ARPコマンド実行エラー: ${stderr}`);
        resolve(
          c.json(
            {
              status: "error",
              message: "デバイスリストの取得に失敗しました",
              error: stderr,
            },
            500
          )
        );
        return;
      }

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
      resolve(
        c.json({
          status: "success",
          message: message,
          presentUsers: presentUsers,
          connectedDevices: connectedDevices,
        })
      );
    });
  });
});

// ユーザー作成フォームを表示するエンドポイント
app.get("/user-form", async (c) => {
  try {
    const filePath = path.join(__dirname, "templates", "user-form.html");
    const htmlContent = fs.readFileSync(filePath, "utf-8");
    return c.html(htmlContent);
  } catch (error) {
    console.error("HTMLファイル読み込みエラー:", error);
    return c.text("ユーザーフォームの読み込みに失敗しました", 500);
  }
});

// ユーザー作成APIエンドポイント
app.post("/create-user", async (c) => {
  try {
    const data = await c.req.json();

    // バリデーション
    if (
      !data.id ||
      !data.name ||
      !Array.isArray(data.deviceList) ||
      data.deviceList.length === 0
    ) {
      return c.json(
        {
          status: "error",
          message: "必須フィールドが不足しています（id, name, deviceList）",
        },
        400
      );
    }

    // デバイスリストのバリデーション
    for (const device of data.deviceList) {
      if (!device.type || !device.name || !device.macAddress) {
        return c.json(
          {
            status: "error",
            message: "各デバイスには type, name, macAddress が必要です",
          },
          400
        );
      }

      // デバイスタイプのバリデーション
      if (device.type !== "PC" && device.type !== "iPhone") {
        return c.json(
          {
            status: "error",
            message:
              "デバイスタイプは 'PC' または 'iPhone' である必要があります",
          },
          400
        );
      }
    }

    // ユーザーデータの作成
    const user: User = {
      id: data.id,
      name: data.name,
      deviceList: data.deviceList as Device[],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // ワークスペースID（デフォルト値または指定された値）
    const workspaceId = data.workspaceId || "default";

    // Firestoreにユーザーを保存
    await updateUser(workspaceId, user);

    return c.json({
      status: "success",
      message: "ユーザーが正常に作成されました",
      user: user,
    });
  } catch (error) {
    console.error("ユーザー作成エラー:", error);
    return c.json(
      {
        status: "error",
        message: "ユーザーの作成に失敗しました",
        error: (error as Error).message,
      },
      500
    );
  }
});

// Firestoreの接続テスト用エンドポイント
app.get("/api/firestore-test", async (c) => {
  try {
    // 現在の時刻を取得
    const timestamp = new Date().toISOString();

    // テスト用のデータをFirestoreに書き込む
    const testDocRef = db.collection("connection_tests").doc();
    await testDocRef.set({
      timestamp: timestamp,
      message: "Firestore接続テスト",
      success: true,
    });

    // 書き込んだデータを取得
    const docSnapshot = await testDocRef.get();
    const data = docSnapshot.data();

    return c.json({
      status: "success",
      message: "Firestoreへの接続に成功しました",
      testData: data,
    });
  } catch (error) {
    console.error("Firestore接続テストエラー:", error);
    return c.json(
      {
        status: "error",
        message: "Firestoreへの接続に失敗しました",
        error: (error as Error).message,
      },
      500
    );
  }
});

// Slackイベントのエンドポイント
app.post("/slack/events", async (c) => {
  const body = await c.req.json();
  await slackApp.processEvent(body);
  return c.text("OK");
});

// サーバー起動
const port = parseInt(process.env.PORT || "3000", 10);
console.log(`サーバーを起動します: http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port: port,
});

export default app;
