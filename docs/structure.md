# ディレクトリ構成および説明

以下は本プロジェクトのディレクトリ構成例です。

```
/
├── docs
│   ├── project.md
│   └── structure.md
├── src
│   ├── constants
│   │   └── index.ts
│   ├── firebase
│   │   ├── init.ts
│   │   └── models
│   │       ├── base.ts
│   │       ├── user.ts
│   │       └── version.ts
│   ├── index.ts
│   ├── repository
│   │   └── user.ts
│   └── usecase
├── .env
├── .env.template
├── .firebaserc
├── .gitignore
├── manifest.yml
├── package.json
├── package-lock.json
├── README.md
├── service-account.json
└── tsconfig.json
```

## ディレクトリ/ファイル解説

- **docs/**  
  プロジェクトの概要や全体構成など、ドキュメント類をまとめるディレクトリです。新規メンバーやステークホルダーへ説明する際に活用します。

- **src/**  
  メインのアプリケーションロジックを配置するディレクトリです。Firebase 連携や Hono サーバーの実装などをここに実装します。

- **src/constants/**  
  アプリケーション全体で使用する定数を定義するディレクトリです。

- **src/firebase/**  
  Firebase Admin SDK の初期化や、Firestore のモデル定義を配置するディレクトリです。

- **src/firebase/models/**  
  Firestore のデータモデルを定義するファイルを配置するディレクトリです。ユーザー情報やバージョン情報などのモデルが含まれています。

- **src/repository/**  
  データアクセス層のコードを配置するディレクトリです。Firestore からのデータ取得や保存のロジックを実装します。

- **src/usecase/**  
  ビジネスロジックを実装するディレクトリです。リポジトリ層を利用して具体的な機能を実装します。

- **src/index.ts**  
  アプリケーションのエントリーポイントとなるファイルです。Hono サーバーの設定や起動処理を行います。

- **.env**  
  環境変数を設定するファイルです。Firebase 認証情報などの機密情報が含まれます。

- **.env.template**  
  `.env`ファイルのテンプレートです。実際の値を設定せずに、必要な環境変数の種類を示しています。

- **.firebaserc**  
  Firebase プロジェクトの設定ファイルです。

- **manifest.yml**  
  アプリケーションのデプロイ設定を記述するファイルです。

- **service-account.json**  
  Firebase Admin SDK の認証に使用するサービスアカウントの鍵ファイルです。

- **README.md**  
  プロジェクトの基本的な概要やローカルでの起動方法、環境変数のセットアップなどを説明するファイルです。

- **package.json / tsconfig.json**  
  Node.js (TypeScript) 関連の依存関係やコンパイル設定が記載されたファイルです。`npm` コマンドでの操作に利用されます。
