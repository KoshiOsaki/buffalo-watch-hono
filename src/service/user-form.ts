import type { Context } from "hono";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESモジュールで__dirnameの代わりに使用
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const UserFormApi = async (c: Context) => {
  try {
    const filePath = path.join(__dirname, "templates", "user-form.html");
    const htmlContent = fs.readFileSync(filePath, "utf-8");
    return c.html(htmlContent);
  } catch (error) {
    console.error("HTMLファイル読み込みエラー:", error);
    return c.text("ユーザーフォームの読み込みに失敗しました", 500);
  }
};
