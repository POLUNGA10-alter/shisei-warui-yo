"use client";

import { useState, useEffect } from "react";
import { INTERVAL_OPTIONS } from "@/data/stretches";
import { usePushNotification } from "@/hooks/usePushNotification";

export default function PostureReminder() {
  // --- State ---
  // 初期値は20（SSR対応）。マウント後にlocalStorageから復元してUIを正しく反映
  const [intervalMin, setIntervalMin] = useState(20);

  // マウント後にlocalStorageから間隔を復元（SSRと不一致にならないようuseEffectで実施）
  useEffect(() => {
    const saved = localStorage.getItem("shisei-interval");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) setIntervalMin(parsed);
    }
  }, []);

  // --- Firebase Push通知フック ---
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    loading: pushLoading,
    error: pushError,
    isActive: isPushActive,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
    updateInterval: pushUpdateInterval,
  } = usePushNotification();

  // --- 通知許可を求める ---
  const requestNotificationPermission = async () => {
    await pushSubscribe(intervalMin);
  };

  // --- 通知をOFFにする ---
  const disableNotifications = async () => {
    await pushUnsubscribe();
  };

  // --- 間隔変更時にサーバーの間隔も更新 + localStorageに保存 ---
  const handleIntervalChange = (newInterval: number) => {
    setIntervalMin(newInterval);
    localStorage.setItem("shisei-interval", String(newInterval));
    if (isPushActive) {
      pushUpdateInterval(newInterval);
    }
  };

  // --- Push通知ON時に現在の間隔をlocalStorageに保存（初期登録時の同期） ---
  useEffect(() => {
    if (isPushActive) {
      localStorage.setItem("shisei-interval", String(intervalMin));
    }
  }, [isPushActive, intervalMin]);

  return (
    <div className="w-full">
      {/* ヒーローセクション */}
      <section className="w-full bg-gradient-to-b from-primary-50 to-white px-4 pb-6 pt-10 text-center">
        <div className="mx-auto max-w-md">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            姿勢悪いよ
          </h1>
          <p className="text-sm text-gray-500">
            定期的に姿勢をチェック
          </p>
        </div>
      </section>

      {/* メイン機能エリア */}
      <section className="w-full px-4 py-6">
        <div className="mx-auto max-w-md space-y-6">

          {/* 間隔設定 */}
          <div className="card">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              ⏰ リマインド間隔
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleIntervalChange(opt.value)}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition-all touch-target ${
                    intervalMin === opt.value
                      ? "bg-primary-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* iOS Safari: PWAとしてインストールを促すガイド */}
          {!isPushSupported && typeof window !== "undefined" && /iPhone|iPad/.test(navigator.userAgent) && !(window.navigator as any).standalone && (
            <div className="card bg-blue-50 dark:bg-blue-900/20">
              <p className="mb-1 text-sm font-medium text-blue-800 dark:text-blue-300">
                📲 iPhoneでPush通知を使うには
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                ① 画面下の <span className="inline-block">共有ボタン（↑）</span>をタップ<br/>
                ② 「ホーム画面に追加」を選択<br/>
                ③ 追加したアイコンからアプリを開く<br/>
                → Push通知が使えるようになります
              </p>
            </div>
          )}

          {/* 通知設定: まだ許可していない場合 */}
          {isPushSupported && !isPushActive && pushPermission !== "denied" && (
            <div className="card bg-primary-50 dark:bg-primary-900/20">
              <p className="mb-2 text-sm text-primary-800 dark:text-primary-300">
                🔔 通知をオンにすると、アプリを閉じていてもリマインドします
              </p>
              <button
                onClick={requestNotificationPermission}
                disabled={pushLoading}
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 touch-target"
              >
                {pushLoading ? "設定中..." : "🔔 Push通知をオンにする"}
              </button>
              {pushError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{pushError}</p>
              )}
            </div>
          )}

          {/* 通知設定: ブラウザで拒否された場合 */}
          {isPushSupported && pushPermission === "denied" && (
            <div className="card bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                🔕 通知がブロックされています。ブラウザの設定から許可してください。
              </p>
            </div>
          )}

          {/* 通知設定: ON状態 */}
          {isPushSupported && isPushActive && (
            <div className="card bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✅ Push通知ON
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {intervalMin}分ごとに通知が届きます（アプリを閉じてもOK）
                  </p>
                </div>
                <button
                  onClick={disableNotifications}
                  disabled={pushLoading}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {pushLoading ? "処理中..." : "OFFにする"}
                </button>
              </div>
              {pushError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{pushError}</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 使い方セクション */}
      <section className="w-full bg-gray-50 px-4 py-8 dark:bg-gray-950">
        <div className="mx-auto max-w-md">
          <h2 className="mb-4 text-center text-lg font-bold text-gray-800 dark:text-gray-200">
            使い方
          </h2>
          <div className="space-y-3">
            {[
              { step: "1", emoji: "⏰", text: "リマインド間隔を選ぶ" },
              { step: "2", emoji: "🔔", text: "「Push通知をオンにする」をタップ" },
              { step: "3", emoji: "📱", text: "アプリを閉じてもOK！時間が来たら通知でお知らせ" },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-3 card p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg dark:bg-primary-900/30">
                  {item.emoji}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
