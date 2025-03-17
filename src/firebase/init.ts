import { App } from "@slack/bolt";
import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

// サービスアカウントキーのパス
// FIXME: requireを使っているから必要?
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
export const serviceAccount: ServiceAccount = require("./service-account.json");

// Firebase Admin SDK の初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = admin.firestore(); // Firestore インスタンス

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});
