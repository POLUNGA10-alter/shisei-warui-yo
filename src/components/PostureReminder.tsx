"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  POSTURE_MESSAGES,
  PRAISE_MESSAGES,
  STRETCHES,
  INTERVAL_OPTIONS,
  type Stretch,
} from "@/data/stretches";
import { usePushNotification } from "@/hooks/usePushNotification";

/** ランダムに1つ選ぶ */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 秒を mm:ss に変換 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type AppState = "idle" | "running" | "alert" | "stretching";

export default function PostureReminder() {
  // --- State ---
  const [state, setState] = useState<AppState>("idle");
  const [intervalMin, setIntervalMin] = useState(20);
  const [remaining, setRemaining] = useState(0);
  const [alertMessage, setAlertMessage] = useState("");
  const [praiseMessage, setPraiseMessage] = useState("");
  const [showPraise, setShowPraise] = useState(false);
  const [currentStretch, setCurrentStretch] = useState<Stretch | null>(null);
  const [stretchTimer, setStretchTimer] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stretchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Firebase Push通知フック ---
  // Push通知の許可状態・トークン取得・サーバー登録をまとめたフック
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

  // --- 今日のカウント復元 ---
  useEffect(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem("shisei-count");
    if (saved) {
      const data = JSON.parse(saved);
      if (data.date === today) {
        setTodayCount(data.count);
      }
    }
  }, []);

  // カウント保存
  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem("shisei-count", JSON.stringify({ date: today, count: todayCount }));
  }, [todayCount]);

  // --- 通知を送る ---
  // ブラウザの Notification API で直接通知を出す（フォアグラウンド時）
  // バックグラウンド時はService Workerが自動で処理するので、ここでは画面表示中の通知のみ
  const sendNotification = useCallback((message: string) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    if (pushPermission === "granted") {
      try {
        new Notification("姿勢チェック", {
          body: message,
          icon: "/icon-192.png",
          tag: "posture-reminder",
        });
      } catch {
        // モバイルではnew Notification()が失敗する場合がある
      }
    }
  }, [pushPermission]);

  // --- タイマー開始 ---
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const totalSeconds = intervalMin * 60;
    setRemaining(totalSeconds);
    setState("running");

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          const msg = pickRandom(POSTURE_MESSAGES);
          setAlertMessage(msg);
          setState("alert");
          sendNotification(msg);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [intervalMin, sendNotification]);

  // --- タイマー停止 ---
  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stretchTimerRef.current) clearInterval(stretchTimerRef.current);
    setState("idle");
    setRemaining(0);
    setCurrentStretch(null);
  }, []);

  // --- 姿勢OK ---
  const handlePostureOk = useCallback(() => {
    setTodayCount((prev) => prev + 1);
    setPraiseMessage(pickRandom(PRAISE_MESSAGES));
    setShowPraise(true);
    setTimeout(() => setShowPraise(false), 2000);
    startTimer();
  }, [startTimer]);

  // --- ストレッチ開始 ---
  const startStretch = useCallback((stretch: Stretch) => {
    setCurrentStretch(stretch);
    setStretchTimer(stretch.duration);
    setState("stretching");

    if (stretchTimerRef.current) clearInterval(stretchTimerRef.current);
    stretchTimerRef.current = setInterval(() => {
      setStretchTimer((prev) => {
        if (prev <= 1) {
          if (stretchTimerRef.current) clearInterval(stretchTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // --- ストレッチ完了 ---
  const finishStretch = useCallback(() => {
    if (stretchTimerRef.current) clearInterval(stretchTimerRef.current);
    setCurrentStretch(null);
    setTodayCount((prev) => prev + 1);
    setPraiseMessage("ストレッチ完了！体が喜んでいます");
    setShowPraise(true);
    setTimeout(() => setShowPraise(false), 2500);
    startTimer();
  }, [startTimer]);

  // --- 通知許可を求める ---
  // Firebase Push通知のトークン取得 + サーバーに登録
  const requestNotificationPermission = async () => {
    await pushSubscribe(intervalMin);
  };

  // --- 通知をOFFにする ---
  const disableNotifications = async () => {
    await pushUnsubscribe();
  };

  // --- 間隔変更時にサーバーの間隔も更新 ---
  const handleIntervalChange = (newInterval: number) => {
    setIntervalMin(newInterval);
    // Push通知がアクティブなら、サーバー側の間隔も更新
    if (isPushActive) {
      pushUpdateInterval(newInterval);
    }
  };

  // --- クリーンアップ ---
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stretchTimerRef.current) clearInterval(stretchTimerRef.current);
    };
  }, []);

  // --- 進捗率 ---
  const totalSeconds = intervalMin * 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  return (
    <div className="w-full">
      {/* 褒めメッセージ（トースト） */}
      {showPraise && (
        <div className="toast">
          {praiseMessage}
        </div>
      )}

      {/* ヒーローセクション */}
      <section className="w-full bg-gradient-to-b from-primary-50 to-white px-4 pb-6 pt-10 text-center dark:from-primary-900/20 dark:to-gray-950">
        <div className="mx-auto max-w-md">
          <p className="mb-2 text-5xl">🪑</p>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            姿勢悪いよ
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            定期的に姿勢をチェックして、猫背・肩こりを予防
          </p>
        </div>
      </section>

      {/* メイン機能エリア */}
      <section className="w-full px-4 py-6">
        <div className="mx-auto max-w-md space-y-6">

          {/* === IDLE 状態: 設定 & スタート === */}
          {state === "idle" && (
            <div className="space-y-6">
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

              {/* 通知設定: まだ許可していない場合 */}
              {isPushSupported && !isPushActive && pushPermission !== "denied" && (
                <div className="card bg-amber-50 dark:bg-amber-900/20">
                  <p className="mb-2 text-sm text-amber-800 dark:text-amber-300">
                    🔔 通知をオンにすると、アプリを閉じていてもリマインドします
                  </p>
                  <button
                    onClick={requestNotificationPermission}
                    disabled={pushLoading}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50 touch-target"
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

              {/* 通知設定: ON状態 → OFFにできる */}
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

              {/* スタートボタン */}
              <button
                onClick={startTimer}
                className="btn-primary w-full py-4 text-lg"
              >
                ▶ 姿勢チェック開始
              </button>

              {/* 今日の記録 */}
              {todayCount > 0 && (
                <div className="card bg-primary-50 text-center dark:bg-primary-900/20">
                  <p className="text-sm text-primary-700 dark:text-primary-400">
                    今日の姿勢チェック回数
                  </p>
                  <p className="mt-1 text-3xl font-bold text-primary-600 dark:text-primary-300">
                    {todayCount}回
                  </p>
                </div>
              )}
            </div>
          )}

          {/* === RUNNING 状態: カウントダウン === */}
          {state === "running" && (
            <div className="space-y-6">
              <div className="card p-8 text-center">
                <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                  次の姿勢チェックまで
                </p>
                <p className="text-5xl font-bold tabular-nums text-primary-600 dark:text-primary-400">
                  {formatTime(remaining)}
                </p>

                {/* プログレスバー */}
                <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                  {intervalMin}分ごとにチェックします
                </p>
              </div>

              {/* 今すぐチェックボタン */}
              <button
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  const msg = pickRandom(POSTURE_MESSAGES);
                  setAlertMessage(msg);
                  setState("alert");
                }}
                className="btn-secondary w-full"
              >
                今すぐ姿勢チェック
              </button>

              {/* 停止ボタン */}
              <button
                onClick={stopTimer}
                className="btn-ghost w-full text-sm"
              >
                ⏹ 停止する
              </button>

              {/* 今日のカウント */}
              <div className="text-center">
                <span className="inline-block rounded-xl bg-primary-50 px-4 py-1.5 text-sm text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  今日 {todayCount}回チェック済み ✓
                </span>
              </div>
            </div>
          )}

          {/* === ALERT 状態: 姿勢チェック！ === */}
          {state === "alert" && (
            <div className="space-y-6">
              {/* アラートカード */}
              <div className="card bg-gradient-to-b from-red-50 to-orange-50 p-8 text-center shadow-lg ring-red-100 dark:from-red-900/30 dark:to-orange-900/20 dark:ring-red-900/50 animate-pulse">
                <p className="text-6xl">⚠️</p>
                <p className="mt-4 text-xl font-bold text-red-700 dark:text-red-400">
                  {alertMessage}
                </p>
              </div>

              {/* アクションボタン */}
              <div className="space-y-3">
                <button
                  onClick={handlePostureOk}
                  className="btn-primary w-full py-4 text-lg"
                >
                  ✅ 姿勢を正した！
                </button>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  ストレッチもしませんか？👇
                </p>

                {/* ストレッチ選択 */}
                <div className="grid grid-cols-2 gap-2">
                  {STRETCHES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => startStretch(s)}
                      className="card p-3 text-left transition-all hover:shadow-md active:scale-[0.98] touch-target"
                    >
                      <span className="text-xl">{s.emoji}</span>
                      <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {s.targetArea}・{s.duration}秒
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === STRETCHING 状態: ストレッチ中 === */}
          {state === "stretching" && currentStretch && (
            <div className="space-y-6">
              <div className="card">
                <div className="text-center">
                  <span className="text-4xl">{currentStretch.emoji}</span>
                  <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                    {currentStretch.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {currentStretch.description}
                  </p>
                </div>

                {/* カウントダウン */}
                <div className="my-6 text-center">
                  <p className={`text-5xl font-bold tabular-nums ${
                    stretchTimer <= 5 && stretchTimer > 0
                      ? "text-red-500 animate-pulse"
                      : stretchTimer === 0
                        ? "text-primary-500"
                        : "text-gray-800 dark:text-gray-200"
                  }`}>
                    {stretchTimer === 0 ? "✨" : stretchTimer}
                    {stretchTimer > 0 && (
                      <span className="text-lg text-gray-400">秒</span>
                    )}
                  </p>
                </div>

                {/* ステップ */}
                <ol className="space-y-2">
                  {currentStretch.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                        {i + 1}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* 完了ボタン */}
              <button
                onClick={finishStretch}
                className={`w-full py-4 text-lg ${
                  stretchTimer === 0 ? "btn-primary" : "btn-secondary"
                }`}
              >
                {stretchTimer === 0 ? "🎉 ストレッチ完了！" : "⏭ スキップして完了"}
              </button>
            </div>
          )}

        </div>
      </section>

      {/* 使い方セクション */}
      {state === "idle" && (
        <section className="w-full bg-gray-50 px-4 py-8 dark:bg-gray-950">
          <div className="mx-auto max-w-md">
            <h2 className="mb-4 text-center text-lg font-bold text-gray-800 dark:text-gray-200">
              使い方
            </h2>
            <div className="space-y-3">
              {[
                { step: "1", emoji: "⏰", text: "リマインド間隔を決める（おすすめは20分）" },
                { step: "2", emoji: "▶️", text: "「開始」を押してデスクワーク" },
                { step: "3", emoji: "⚠️", text: "時間が来たら姿勢チェックをお知らせ" },
                { step: "4", emoji: "🧘", text: "姿勢を正す or ストレッチする" },
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
      )}
    </div>
  );
}
