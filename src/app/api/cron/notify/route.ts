/**
 * Push通知送信 Cron Job: GET /api/cron/notify
 *
 * 【このファイルの役割】
 * Vercel Cron Jobsによって毎分自動実行されるAPI。
 * 「前回の通知から、設定した間隔が経過したユーザー」を探して、
 * Firebase Cloud Messaging経由でPush通知を送る。
 *
 * 【処理の流れ】
 * 1. Supabaseから is_active=true のデバイストークン一覧を取得
 * 2. 各トークンについて「前回通知 + 間隔」が現在時刻を超えているか判定
 * 3. 超えていたらFCMでPush通知を送信
 * 4. last_notified_at を現在時刻に更新
 *
 * 【Cron Jobとは】
 * 「決まった時間に自動で実行される処理」のこと。
 * Vercelでは vercel.json にスケジュールを書くだけで自動実行してくれる。
 * このAPIは毎分（* * * * *）実行される想定。
 *
 * 【セキュリティ】
 * CRON_SECRET で保護。Vercelが自動で付けるヘッダーで認証する。
 * 外部から勝手に叩かれても、秘密キーがないと拒否する。
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, type DeviceTokenRow } from "@/lib/supabase";
import { getAdminMessaging } from "@/lib/firebase-admin";

// 姿勢チェックメッセージ（ランダムで1つ選ぶ）
const POSTURE_MESSAGES = [
  "姿勢が崩れていませんか？背筋を伸ばしましょう！",
  "猫背になっていませんか？シャキッと！",
  "肩が上がっていませんか？力を抜きましょう",
  "画面に近づきすぎていませんか？少し離れましょう",
  "背中が丸まっていませんか？胸を張りましょう",
  "首が前に出ていませんか？顎を引きましょう",
  "そろそろ姿勢チェックの時間です🪑",
  "デスクワーカーの大敵は猫背です",
  "一度立ち上がって伸びをしませんか？",
  "深呼吸して、姿勢をリセットしましょう",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(request: NextRequest) {
  try {
    // --- セキュリティチェック ---
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("[Cron] 認証失敗: 不正なアクセス");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Firebase Admin の取得（遅延初期化） ---
    const messaging = getAdminMessaging();
    if (!messaging) {
      console.error("[Cron] Firebase Admin が初期化できません（環境変数を確認）");
      return NextResponse.json(
        { error: "Firebase Admin not configured" },
        { status: 500 }
      );
    }

    // --- アクティブなデバイストークンを取得 ---
    const { data, error: fetchError } = await getSupabaseAdmin()
      .from("device_tokens")
      .select("*")
      .eq("is_active", true);

    if (fetchError) {
      console.error("[Cron] DB取得エラー:", fetchError);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    const tokens = (data ?? []) as DeviceTokenRow[];

    if (tokens.length === 0) {
      return NextResponse.json({ message: "通知対象なし", sent: 0 });
    }

    const now = new Date();
    let sentCount = 0;
    let errorCount = 0;
    const errorDetails: { token: string; error: string }[] = [];

    // --- 各トークンについてチェック & 送信 ---
    for (const tokenRow of tokens) {
      const lastNotified = new Date(tokenRow.last_notified_at);
      const intervalMs = tokenRow.interval_minutes * 60 * 1000;
      const nextNotifyTime = new Date(lastNotified.getTime() + intervalMs);

      // まだ次の通知時間になっていない場合はスキップ
      if (now < nextNotifyTime) {
        continue;
      }

      // Push通知を送信
      const message = pickRandom(POSTURE_MESSAGES);
      try {
        await messaging.send({
          token: tokenRow.fcm_token,
          notification: {
            title: "🪑 姿勢悪いよ",
            body: message,
          },
          webpush: {
            notification: {
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              tag: "posture-reminder",
              // 同じtagの通知は上書きされる（通知が溜まらない）
              renotify: true,
            },
            fcmOptions: {
              link: "https://shisei-warui-yo.vercel.app",
            },
          },
        });

        // 送信成功 → last_notified_at を更新
        await getSupabaseAdmin()
          .from("device_tokens")
          .update({ last_notified_at: now.toISOString() })
          .eq("id", tokenRow.id);

        sentCount++;
        console.log(`[Cron] 送信成功: ${tokenRow.fcm_token.substring(0, 15)}...`);
      } catch (sendError: unknown) {
        errorCount++;
        const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
        console.error(`[Cron] 送信失敗: ${errorMessage}`);
        errorDetails.push({ token: tokenRow.fcm_token.substring(0, 20), error: errorMessage });

        // トークンが無効（アンインストール等）ならis_activeをfalseにする
        const lowerError = errorMessage.toLowerCase();
        if (
          lowerError.includes("not-registered") ||
          lowerError.includes("notregistered") ||
          lowerError.includes("invalid-registration-token") ||
          lowerError.includes("unregistered") ||
          lowerError.includes("invalid_argument")
        ) {
          await getSupabaseAdmin()
            .from("device_tokens")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", tokenRow.id);
          console.log(`[Cron] 無効トークンを無効化: ${tokenRow.fcm_token.substring(0, 15)}...`);
        }
      }
    }

    return NextResponse.json({
      message: `送信完了: ${sentCount}件成功, ${errorCount}件失敗`,
      sent: sentCount,
      errors: errorCount,
      total: tokens.length,
      errorDetails,
    });
  } catch (err) {
    console.error("[Cron] 予期しないエラー:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
