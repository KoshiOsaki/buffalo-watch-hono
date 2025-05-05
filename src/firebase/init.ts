// import admin from "firebase-admin";
// import type { ServiceAccount } from "firebase-admin";
// import serviceAccountJson from "../../service-account.json" assert { type: "json" };

// // サービスアカウントキーのパス
// export const serviceAccount = serviceAccountJson as ServiceAccount;

// // Firebase Admin SDK の初期化
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// export const firestore = admin.firestore(); // Firestore インスタンス
