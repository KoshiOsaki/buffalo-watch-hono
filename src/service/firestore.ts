import type { Context } from "hono";
import { db } from "../index.js";

/**
 * Firestoreの接続テスト
 */
export const firestoreTestApi = async (c: Context) => {
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
};
