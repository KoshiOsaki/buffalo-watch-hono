import type { Context } from "hono";
import { updateUser } from "../repository/user.js";
import type { Device, User } from "../firebase/models/user.js";
import { WORKSPACE_ID } from "../constants/index.js";

export const createUserApi = async (c: Context) => {
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
    const workspaceId = data.workspaceId || WORKSPACE_ID;

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
};
