import type { Context } from "hono";
import { db, slackApp } from "../index.js";

// Slackイベントのリスナーを設定
export const setupSlackEventListeners = () => {
  slackApp.event("app_mention", async ({ event, say }) => {
    await say(
      `こんにちは <@${event.user}>! Firestoreにメッセージを保存します。`
    );

    await db.collection("messages").add({
      user: event.user,
      text: event.text,
      timestamp: event.ts,
    });

    await say("メッセージがFirestoreに保存されました！");
  });
};

export const slackApi = async (c: Context) => {
  const body = await c.req.json();
  await slackApp.processEvent(body);
  return c.text("OK");
};
