import { Hono } from "hono";
import bolt from "@slack/bolt";
const { App } = bolt;
import admin from "firebase-admin";
import dotenv from "dotenv";
import { serve } from "@hono/node-server";

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
const db = admin.firestore();

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
