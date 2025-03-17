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
