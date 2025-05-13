import { Hono } from "hono";
import bolt from "@slack/bolt";
const { App } = bolt;
import admin from "firebase-admin";
import dotenv from "dotenv";
import { serve } from "@hono/node-server";
import { firestoreTestApi } from "./service/firestore.js";
import { checkApi } from "./service/check.js";
import { createUserApi } from "./service/create-user.js";
import { setupSlackEventListeners, slackApi } from "./service/slack.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

dotenv.config();

const app = new Hono();

// ESモジュールで__dirnameの代わりに使用
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Slackアプリの初期化
export const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});
// Slackイベントリスナーの設定
setupSlackEventListeners();

// Firestoreの初期化
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
export const db = admin.firestore();

// ルートエンドポイント
app.get("/", (c) => {
  return c.text("Buffalo Watch API サーバーが稼働中です！");
});
// ARPコマンドを実行して在席ユーザーを確認するエンドポイント
app.get("/check", checkApi);
// ユーザー作成フォームを表示するエンドポイント
// TODO: 切り出すとバグる
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
app.post("/create-user", createUserApi);
// Firestoreの接続テスト用エンドポイント
app.get("/api/firestore-test", firestoreTestApi);
// Slackイベントのエンドポイント
app.post("/slack/events", slackApi);

// サーバー起動
const port = parseInt(process.env.PORT || "3000", 10);
console.log(`サーバーを起動します: http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port: port,
});

export default app;
