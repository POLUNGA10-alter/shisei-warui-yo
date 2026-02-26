/**
 * Push通知カスタムフック: usePushNotification
 *
 * 【このファイルの役割】
 * Push通知に必要な一連の処理をまとめた「便利セット」。
 * どのコンポーネント（画面部品）からでも呼び出せる。
 *
 * 【Push通知の仕組み全体像】
 *
 *   ユーザーのブラウザ        Firebase（Google）       あなたのサーバー
 *   ─────────────      ──────────────      ──────────────
 *   ① 通知を許可する
 *          │
 *          ▼
 *   ② トークンをもらう ──→ 「このブラウザ宛の
 *      （デバイストークン）    住所」を発行
 *          │
 *          ▼
 *   ③ トークンを保存 ─────────────────────→ Supabase DBに保存
 *
 *   （後日、通知を送りたい時）
 *
 *   サーバーからFirebaseに
 *   「このトークン宛に送って」──→ Firebaseが配達 ──→ ブラウザに通知が届く
 *
 * 【デバイストークンとは】
 * 「このブラウザ・このデバイス宛の郵便番号」のようなもの。
 * Firebaseはこのトークンを使って、正しいブラウザに通知を届ける。
 * トークンはブラウザごとに異なる（PCとスマホでは別のトークン）。
 *
 * 【カスタムフックとは】
 * Reactのルールとして「use〇〇」という名前の関数を作ると、
 * useState や useEffect などのReact機能を内部で使える。
 * 複数の画面で同じ処理を使い回すために作る。
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { messaging } from "@/lib/firebase";

/** フックが返す値の型定義 */
interface UsePushNotification {
  /** Push通知がサポートされているか */
  isSupported: boolean;
  /** 通知の許可状態: "default"(未回答) / "granted"(許可) / "denied"(拒否) */
  permission: NotificationPermission;
  /** 取得したデバイストークン（許可前はnull） */
  token: string | null;
  /** 処理中かどうか（ボタンのローディング表示に使う） */
  loading: boolean;
  /** エラーメッセージ（問題なければnull） */
  error: string | null;
  /** 通知許可を求めてトークンを取得する関数 */
  requestPermission: () => Promise<void>;
}

export function usePushNotification(): UsePushNotification {
  // --- 状態変数 ---
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- ページ読み込み時: ブラウザの対応チェック ---
  useEffect(() => {
    // ブラウザがPush通知に対応しているか確認する3つの条件:
    // 1. Notification API が存在する
    // 2. Service Worker が使える
    // 3. Firebase Messagingの初期化に成功している
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      messaging !== null;

    setIsSupported(supported);

    // 現在の許可状態を取得（"default" / "granted" / "denied"）
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // --- ページ読み込み時: すでに許可済みならトークンを自動取得 ---
  useEffect(() => {
    if (permission === "granted" && messaging && !token) {
      getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      })
        .then((currentToken) => {
          if (currentToken) {
            setToken(currentToken);
            console.log("[Push] 既存トークン取得:", currentToken.substring(0, 20) + "...");
          }
        })
        .catch((err) => {
          console.warn("[Push] トークン自動取得失敗:", err);
        });
    }
  }, [permission, token]);

  // --- フォアグラウンドメッセージの受信 ---
  // アプリを開いている時に届いたメッセージの処理
  useEffect(() => {
    if (!messaging) return;

    // onMessage: アプリが画面に表示されている時にメッセージが届いた時の処理
    const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
      console.log("[Push] フォアグラウンドメッセージ受信:", payload);

      // フォアグラウンドではFirebaseが自動で通知を出さないので、手動で表示する
      const title = payload.notification?.title || "姿勢悪いよ";
      const body = payload.notification?.body || "姿勢をチェックしましょう！";

      // ブラウザのNotification APIで通知を表示
      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icon-192.png",
          tag: "posture-reminder",
        });
      }
    });

    // クリーンアップ: コンポーネントが消える時に購読解除
    return () => unsubscribe();
  }, []);

  // --- 通知許可を求める関数 ---
  const requestPermission = useCallback(async () => {
    if (!isSupported || !messaging) {
      setError("このブラウザはPush通知に対応していません");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ① ブラウザの通知許可ダイアログを表示
      //    ユーザーが「許可」「ブロック」を選ぶまで待つ
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError("通知が許可されませんでした");
        setLoading(false);
        return;
      }

      // ② Service Worker を登録
      //    ブラウザに「firebase-messaging-sw.js を常駐プログラムとして登録して」と依頼
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      console.log("[Push] Service Worker 登録完了");

      // ③ デバイストークンを取得
      //    Firebaseに「このブラウザに通知を送るためのアドレスをください」と依頼
      //    vapidKey: VAPID鍵（Firebaseで発行した身分証明書のようなもの）
      //    serviceWorkerRegistration: さっき登録したService Worker
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        setToken(currentToken);
        console.log("[Push] トークン取得成功:", currentToken.substring(0, 20) + "...");

        // ④ トークンをlocalStorageに保存（次回アクセス時の確認用）
        localStorage.setItem("fcm-token", currentToken);
      } else {
        setError("トークンの取得に失敗しました");
      }
    } catch (err) {
      console.error("[Push] エラー:", err);
      setError("Push通知の設定に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    token,
    loading,
    error,
    requestPermission,
  };
}
