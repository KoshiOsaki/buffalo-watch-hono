# Slack Slash Command "Who" アプリ

このリポジトリは、Slack で `/who` コマンドを実行すると、オフィス内の誰が現在在席しているかを返す PoC 用アプリです。

## 前提

- GCP(Firestore) のプロジェクトが既に作成済み
- Slack App が既に作成済み (Bolt を利用)
- Mac などの端末で Hono サーバーを起動し、`arp -a` コマンドを実行できる状態
- ngrok などを利用して、ローカルサーバーに外部からアクセス可能にしておく

## セットアップ手順

1. **本リポジトリをクローン**

   ```bash
   git clone https://github.com/your-repo/example-who-app.git
   cd example-who-app
   ```

2. **環境変数ファイルのコピー**

   ```bash
   cp .env.sample .env
   ```

   - `.env` 内に、Slack のトークンや Firestore の認証情報などを設定してください

3. **依存パッケージのインストール**

   ```bash
   npm install
   ```

4. **ローカルサーバーの起動 (Hono)**

   ```bash
   # 例: npm script を用いる場合
   npm run dev
   ```

   - 起動ポートやアクセスパスは `src/main.ts` などを参照してください
   - `ngrok http 3000` などで外部に公開しておき、Slack からアクセスできるようにします

5. **Slack App 設定 (Slash Command)**

   - Slack の API ページ(https://api.slack.com/) で作成したアプリにアクセス
   - **Slash Commands** を選択して、新しいコマンド `/who` を登録
     - Request URL に `https://<あなたの ngrok ドメイン>/check` など Hono のエンドポイントを設定
     - メソッドやトークンは適宜設定
   - **Interactivity & Shortcuts** (もしくは Bolt 用のイベント購読) も必要に応じて設定

6. **動作確認**
   - Slack 上で `/who` コマンドを入力
   - Firestore に登録されているユーザー情報と `arp -a` の結果を突合せして、在席者の一覧が返ってきたら成功

## コマンド一覧

- `npm run dev` : ローカル開発サーバーを起動
- `npm run build` : TypeScript をコンパイル
- `npm run start` : ビルド後のファイルからアプリを起動
- `npm test` : テストを実行 (テストを導入している場合)

## ライブラリ・フレームワーク

- [Bolt for JavaScript](https://slack.dev/bolt-js/) : Slack アプリケーション開発用
- [Hono](https://hono.dev/) : Fastly, Cloudflare Workers 等にも対応可能な Web フレームワーク
- [TypeScript](https://www.typescriptlang.org/) : 型定義付きの JavaScript
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) : Firestore を操作するためのライブラリ

## 注意事項

- 本アプリは PoC (Proof of Concept) を想定しており、セキュリティやスケーラビリティに関する検討は最小限です
- MAC アドレスの取得や Firestore への登録情報、プライバシーに関するルールは社内規定に従って運用してください
- 30 時間程度で開発できる簡易プロダクトを想定しています

---

以上がセットアップおよび概要ドキュメントの一例です。実際の環境や要件に合わせて適宜修正してください。
