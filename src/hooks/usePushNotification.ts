/**
 * Push通知カスタムフック: usePushNotification
 *
 * 【このファイルの役割】
 * Push通知に必要な一連の処理をまとめた「便利セット」。
 * どのコンポーネント（画面部品）からでも呼び出せる。
 *
 * 【サーバーサイドPush通知の仕組み全体像】
 *
 *   ユーザーのブラウザ        Vercel（サーバー）        Supabase DB          Firebase
 *   ─────────────      ──────────────      ──────────        ────────
 *   ① 通知を許可する
 *          │
 *          ▼
 *   ② トークンをもらう ──────────────────────────────────────→ トークン発行
 *          │
 *          ▼
 *   ③ /api/subscribe ──→ トークン+間隔を保存 ──→ device_tokens
 *
 *   ④ 毎分Cronが実行
 *                        /api/cron/notify ──→ 「通知すべきユーザー」を検索
 *                                          ←── 該当ユーザー一覧
 *                        FCM送信依頼 ────────────────────────→ Push通知配達
 *                                                              │
 *   ⑤ ブラウザを閉じていても通知が届く ←────────────────────────┘
 *
 *   ⑥ 通知をOFFにする
 *   /api/unsubscribe ──→ is_active=false ──→ DB更新（Cronの対象外に）
 *
 * 【デバイストークンとは】
 * 「このブラウザ・このデバイス宛の郵便番号」のようなもの。
 * Firebaseはこのトークンを使って、正しいブラウザに通知を届ける。
 * トークンはブラウザごとに異なる（PCとスマホでは別のトークン）。
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
  /** サーバーサイド通知が有効かどうか */
  isActive: boolean;
  /** 通知を許可してサーバーに登録する関数 */
  subscribe: (intervalMinutes: number) => Promise<void>;
  /** サーバーサイド通知を解除する関数 */
  unsubscribe: () => Promise<void>;
  /** 間隔を変更する関数（すでに登録済みの場合） */
  updateInterval: (intervalMinutes: number) => Promise<void>;
}

export function usePushNotification(): UsePushNotification {
  // --- 状態変数 ---
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  // --- ページ読み込み時: ブラウザの対応チェック ---
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      messaging !== null;

    setIsSupported(supported);

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    // localStorageから通知の有効/無効状態を復元
    if (typeof window !== "undefined") {
      const savedActive = localStorage.getItem("push-active");
      if (savedActive === "true") {
        setIsActive(true);
      }
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
  useEffect(() => {
    if (!messaging) return;

    const unsubscribeMsg = onMessage(messaging, (payload: MessagePayload) => {
      console.log("[Push] フォアグラウンドメッセージ受信:", payload);

      const title = payload.notification?.title || "姿勢悪いよ";
      const body = payload.notification?.body || "姿勢をチェックしましょう！";

      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/icon-192.png",
          tag: "posture-reminder",
        });
      }
    });

    return () => unsubscribeMsg();
  }, []);

  // --- FCMトークンを取得する内部関数 ---
  const obtainToken = useCallback(async (): Promise<string | null> => {
    if (!messaging) return null;

    // ① ブラウザの通知許可ダイアログを表示
    const perm = await Notification.requestPermission();
    setPermission(perm);

    if (perm !== "granted") {
      setError("通知が許可されませんでした");
      return null;
    }

    // ② Service Worker を登録
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    console.log("[Push] Service Worker 登録完了");

    // ③ デバイストークンを取得
    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      setToken(currentToken);
      localStorage.setItem("fcm-token", currentToken);
      console.log("[Push] トークン取得成功:", currentToken.substring(0, 20) + "...");
      return currentToken;
    }

    setError("トークンの取得に失敗しました");
    return null;
  }, []);

  // --- 通知をONにする: 許可 + サーバーに登録 ---
  const subscribe = useCallback(async (intervalMinutes: number) => {
    if (!isSupported || !messaging) {
      setError("このブラウザはPush通知に対応していません");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // トークンを取得（すでにあればそのまま使う）
      const currentToken = token || await obtainToken();
      if (!currentToken) {
        setLoading(false);
        return;
      }

      // ④ サーバーにトークンと間隔を登録
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: currentToken,
          interval_minutes: intervalMinutes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "登録に失敗しました");
      }

      setIsActive(true);
      localStorage.setItem("push-active", "true");
      console.log("[Push] サーバー登録完了（間隔:", intervalMinutes, "分）");
    } catch (err) {
      console.error("[Push] Subscribe エラー:", err);
      setError("Push通知の設定に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [isSupported, token, obtainToken]);

  // --- 通知をOFFにする: サーバーのis_activeをfalseに ---
  const unsubscribe = useCallback(async () => {
    const currentToken = token || localStorage.getItem("fcm-token");
    if (!currentToken) {
      setIsActive(false);
      localStorage.setItem("push-active", "false");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: currentToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "解除に失敗しました");
      }

      setIsActive(false);
      localStorage.setItem("push-active", "false");
      console.log("[Push] サーバー通知解除完了");
    } catch (err) {
      console.error("[Push] Unsubscribe エラー:", err);
      setError("通知の解除に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // --- 間隔を変更する（再登録） ---
  const updateInterval = useCallback(async (intervalMinutes: number) => {
    if (!isActive) return;
    await subscribe(intervalMinutes);
  }, [isActive, subscribe]);

  return {
    isSupported,
    permission,
    token,
    loading,
    error,
    isActive,
    subscribe,
    unsubscribe,
    updateInterval,
  };
}
