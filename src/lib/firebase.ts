/**
 * Firebase 初期化
 *
 * 【このファイルの役割】
 * Firebaseに「自分はこのプロジェクトのアプリです」と名乗るファイル。
 * APIキーなどの接続情報を渡して、Firebaseとの通信を開始する。
 *
 * 【なぜ必要か】
 * Firebase SDKは「どのプロジェクトに接続するか」を知らないと動けない。
 * このファイルで1回だけ初期化（initializeApp）すれば、
 * 他のファイルから getMessaging() 等でPush通知機能を呼び出せるようになる。
 *
 * 【ポイント】
 * - getApps().length === 0 のチェック: 二重初期化を防止
 *   （Reactは画面の再描画で何度もコードが実行されるため）
 * - typeof window !== "undefined": サーバー側（Node.js）では
 *   ブラウザ専用のMessaging機能は使えないので、ブラウザ環境のみで有効化
 */

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, type Messaging } from "firebase/messaging";

// .env.local から読み取った接続情報
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase アプリの初期化（まだ初期化されていない場合のみ）
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firebase Cloud Messaging（Push通知機能）の取得
// ブラウザ環境でのみ使える（サーバー側では null）
let messaging: Messaging | null = null;
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch {
    // ブラウザがPush通知に対応していない場合
    console.warn("Firebase Messaging is not supported in this browser");
  }
}

export { app, messaging };
