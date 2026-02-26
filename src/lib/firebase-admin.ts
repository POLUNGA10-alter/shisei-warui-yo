/**
 * Firebase Admin SDK 初期化（サーバーサイド用）
 *
 * 【このファイルの役割】
 * サーバー側（APIルート・Cron Job）からFirebaseの機能を使うための設定。
 * 
 * 【firebase（クライアント）との違い】
 * - firebase（src/lib/firebase.ts）: ブラウザで動く。トークン取得など。
 * - firebase-admin（このファイル）: サーバーで動く。Push通知の送信など。
 *   → 管理者権限を持つので、ブラウザには絶対に露出させない
 *
 * 【サービスアカウントとは】
 * Firebaseが発行する「サーバー用の身分証明書」。
 * これを使うことで、サーバーからFirebaseのAPI（Push通知送信など）を呼べる。
 * 
 * 【遅延初期化】
 * ビルド時にはまだ環境変数が設定されていない場合があるため、
 * getAdminMessaging() 関数を呼んだ時に初めて初期化する（遅延初期化パターン）。
 * 
 * 環境変数で以下を設定する必要がある：
 * - FIREBASE_CLIENT_EMAIL: サービスアカウントのメールアドレス
 * - FIREBASE_PRIVATE_KEY: サービスアカウントの秘密鍵
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let adminApp: App | null = null;
let adminMessaging: Messaging | null = null;

/**
 * Firebase Admin Messagingインスタンスを取得する。
 * 初回呼び出し時にのみ初期化を行う（遅延初期化）。
 * 環境変数が設定されていない場合はnullを返す。
 */
export function getAdminMessaging(): Messaging | null {
  // すでに初期化済みならそのまま返す
  if (adminMessaging) return adminMessaging;

  // 必要な環境変数が揃っているかチェック
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    console.warn("[Firebase Admin] 環境変数が不足しています。Push通知送信は無効です。");
    return null;
  }

  try {
    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          // 環境変数に入れると改行が「\\n」になるので、実際の改行に変換する
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      adminApp = getApps()[0];
    }

    adminMessaging = getMessaging(adminApp);
    return adminMessaging;
  } catch (err) {
    console.error("[Firebase Admin] 初期化エラー:", err);
    return null;
  }
}
