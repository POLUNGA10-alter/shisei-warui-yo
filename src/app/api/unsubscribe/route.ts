/**
 * Push通知 解除API: POST /api/unsubscribe
 *
 * 【このファイルの役割】
 * ユーザーが「通知をOFF」にした時に呼ばれるAPI。
 * Supabaseのdevice_tokensテーブルで is_active を false にする。
 *
 * 【なぜ削除ではなく「無効化」か】
 * ユーザーが再度ONにした時に、同じトークンを再利用できるため。
 * 削除してしまうと、再登録時にFirebaseから新しいトークンを取り直す必要がある。
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "トークンが必要です" },
        { status: 400 }
      );
    }

    // is_active を false にして、Cron Jobの対象外にする
    const { error } = await getSupabaseAdmin()
      .from("device_tokens")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("fcm_token", token);

    if (error) {
      console.error("[Unsubscribe] Supabase error:", error);
      return NextResponse.json(
        { error: "解除に失敗しました" },
        { status: 500 }
      );
    }

    console.log("[Unsubscribe] 通知解除:", token.substring(0, 20) + "...");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Unsubscribe] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 }
    );
  }
}
