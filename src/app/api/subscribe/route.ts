/**
 * Push通知 購読API: POST /api/subscribe
 *
 * 【このファイルの役割】
 * ユーザーが「通知をON」にした時に呼ばれるAPI。
 * FCMデバイストークンとリマインド間隔をSupabaseに保存する。
 *
 * 【処理の流れ】
 * 1. フロントエンドから token と interval_minutes を受け取る
 * 2. Supabaseの device_tokens テーブルに保存（upsert: あれば更新、なければ挿入）
 * 3. 成功/失敗をレスポンスとして返す
 *
 * 【upsertとは】
 * INSERT（新規追加）+ UPDATE（更新）の合体。
 * 同じトークンが既にDBにあれば、間隔等を更新する。
 * なければ新しい行として追加する。
 * → 同じユーザーが設定を変えた時にデータが重複しない。
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// 許可するリマインド間隔（分）のホワイトリスト
const ALLOWED_INTERVALS = [10, 15, 20, 30, 45, 60];

// FCMトークンの最小・最大長（一般的なFCMトークンは100〜300文字）
const FCM_TOKEN_MIN_LENGTH = 100;
const FCM_TOKEN_MAX_LENGTH = 300;

// FCMトークンの文字種（Base64URL + コロン）
const FCM_TOKEN_PATTERN = /^[A-Za-z0-9\-_:]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, interval_minutes } = body;

    // バリデーション（入力チェック）
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "トークンが必要です" },
        { status: 400 }
      );
    }

    // FCMトークンの長さ・文字種チェック
    if (
      token.length < FCM_TOKEN_MIN_LENGTH ||
      token.length > FCM_TOKEN_MAX_LENGTH ||
      !FCM_TOKEN_PATTERN.test(token)
    ) {
      return NextResponse.json(
        { error: "無効なトークンです" },
        { status: 400 }
      );
    }

    if (!interval_minutes || typeof interval_minutes !== "number") {
      return NextResponse.json(
        { error: "間隔（分）が必要です" },
        { status: 400 }
      );
    }

    // interval_minutesのホワイトリストチェック
    if (!ALLOWED_INTERVALS.includes(interval_minutes)) {
      return NextResponse.json(
        { error: "無効なリマインド間隔です" },
        { status: 400 }
      );
    }

    const now = new Date();

    // 既存トークンがあるか確認
    const { data: existing } = await getSupabaseAdmin()
      .from("device_tokens")
      .select("id, last_notified_at")
      .eq("fcm_token", token)
      .single();

    if (existing) {
      // 既存トークン: interval_minutesとis_activeだけ更新（last_notified_atはリセットしない）
      const { error } = await getSupabaseAdmin()
        .from("device_tokens")
        .update({
          interval_minutes,
          is_active: true,
          updated_at: now.toISOString(),
        })
        .eq("fcm_token", token);

      if (error) {
        console.error("[Subscribe] Supabase update error:", error);
        return NextResponse.json({ error: "トークンの更新に失敗しました" }, { status: 500 });
      }
      console.log("[Subscribe] 既存トークン更新（last_notified_atは維持）:", token.substring(0, 20) + "...");
    } else {
      // 新規トークン: last_notified_atを「interval分前」にセット → 次のcron（最大1分後）に即通知
      const firstNotifyTime = new Date(now.getTime() - interval_minutes * 60 * 1000);
      const { error } = await getSupabaseAdmin()
        .from("device_tokens")
        .insert({
          fcm_token: token,
          interval_minutes,
          is_active: true,
          last_notified_at: firstNotifyTime.toISOString(),
          updated_at: now.toISOString(),
        });

      if (error) {
        console.error("[Subscribe] Supabase insert error:", error);
        return NextResponse.json({ error: "トークンの保存に失敗しました" }, { status: 500 });
      }
      console.log("[Subscribe] 新規トークン登録（即時通知設定）:", token.substring(0, 20) + "...");
    }

    console.log("[Subscribe] トークン登録成功:", token.substring(0, 20) + "...");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Subscribe] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
