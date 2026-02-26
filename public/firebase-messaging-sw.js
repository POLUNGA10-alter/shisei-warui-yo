/**
 * Firebase Messaging Service Worker
 *
 * 【このファイルの役割】
 * ブラウザの裏側（バックグラウンド）で動き続ける常駐プログラム。
 * アプリを閉じていても、Firebaseからの Push メッセージを受信して通知を表示する。
 *
 * 【なぜ public/ フォルダに置くのか】
 * Service Workerはブラウザが直接読み込むファイルなので、
 * Reactのビルドプロセスを通さず、そのままWebサーバーに配置する必要がある。
 * public/ フォルダのファイルはそのまま公開される。
 *
 * 【なぜファイル名が firebase-messaging-sw.js なのか】
 * Firebase SDKがこの名前のService Workerを自動で探す仕様。
 * 名前を変えると動かない。
 *
 * 【処理の流れ】
 * 1. Firebase SDKを読み込む（importScripts）
 * 2. Firebaseに接続情報を渡して初期化
 * 3. バックグラウンドメッセージを受信したらブラウザ通知として表示
 */

// Firebase SDK をCDN（インターネット上の配布サーバー）から読み込む
// ※ Service Worker内では import 文が使えないため、この方法で読み込む
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

// Firebase 接続情報（.env.local が使えないので直接記述）
// ※ これらはフロントエンド用の公開キーなので、ここに書いても安全
firebase.initializeApp({
  apiKey: "AIzaSyCDp99Ti9ho9nMn22DEt6lgQ4ZRGh8DQbA",
  authDomain: "shisei-warui-yo.firebaseapp.com",
  projectId: "shisei-warui-yo",
  storageBucket: "shisei-warui-yo.firebasestorage.app",
  messagingSenderId: "994689038212",
  appId: "1:994689038212:web:5f181d57537df018a24fd1",
});

// Push通知機能（Messaging）を取得
const messaging = firebase.messaging();

/**
 * バックグラウンドメッセージの受信ハンドラ
 *
 * アプリが開かれていない時（バックグラウンド）にFirebaseからメッセージが届くと、
 * この関数が呼ばれる。受け取ったデータをブラウザ通知として表示する。
 *
 * payload（ペイロード）= メッセージの中身。以下の構造:
 * {
 *   notification: { title: "姿勢チェック", body: "背筋を伸ばしましょう！" },
 *   data: { ... }  ← 追加データ（任意）
 * }
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[Service Worker] バックグラウンドメッセージ受信:", payload);

  // 通知のタイトルと本文を取得（なければデフォルト値を使う）
  const title = payload.notification?.title || "姿勢悪いよ";
  const body = payload.notification?.body || "姿勢をチェックしましょう！";

  // ブラウザ通知のオプション
  const options = {
    body: body,
    icon: "/icon-192.png",       // 通知に表示するアイコン
    badge: "/icon-192.png",      // Androidの小さいアイコン
    tag: "posture-reminder",     // 同じタグの通知は上書き（重複防止）
    renotify: true,              // 同じタグでも再通知する
    vibrate: [200, 100, 200],    // バイブレーション: 振動→停止→振動
  };

  // self = Service Worker自身を指す
  // showNotification() でブラウザ通知を表示する
  self.registration.showNotification(title, options);
});

/**
 * 通知クリック時の処理
 *
 * ユーザーが通知をタップ/クリックした時にアプリを開く。
 * すでに開いているタブがあればそこにフォーカス、なければ新しいタブで開く。
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); // 通知を閉じる

  // アプリのURLを開く（または既存タブにフォーカス）
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // すでにアプリを開いているタブがあればそこにフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // なければ新しいタブで開く
      return self.clients.openWindow("/");
    })
  );
});
