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
import { supabaseAdmin } from "@/lib/supabase";

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

    if (!interval_minutes || typeof interval_minutes !== "number") {
      return NextResponse.json(
        { error: "間隔（分）が必要です" },
        { status: 400 }
      );
    }

    // Supabaseにトークンを保存（upsert: あれば更新、なければ挿入）
    const { error } = await supabaseAdmin
      .from("device_tokens")
      .upsert(
        {
          fcm_token: token,
          interval_minutes,
          is_active: true,
          last_notified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "fcm_token", // 同じトークンがあれば更新
        }
      );

    if (error) {
      console.error("[Subscribe] Supabase error:", error);
      return NextResponse.json(
        { error: "トークンの保存に失敗しました" },
        { status: 500 }
      );
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
