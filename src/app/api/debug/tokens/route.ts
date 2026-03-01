import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, type DeviceTokenRow } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("device_tokens")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const rows = (data ?? []) as DeviceTokenRow[];

  const debug = rows.map((row) => {
    const lastNotified = new Date(row.last_notified_at);
    const nextNotifyTime = new Date(lastNotified.getTime() + row.interval_minutes * 60 * 1000);
    const remainingSec = Math.round((nextNotifyTime.getTime() - now.getTime()) / 1000);
    return {
      id: row.id,
      token_prefix: row.fcm_token.substring(0, 20) + "...",
      interval_minutes: row.interval_minutes,
      is_active: row.is_active,
      last_notified_at: row.last_notified_at,
      next_notify_at: nextNotifyTime.toISOString(),
      remaining_seconds: remainingSec,
      will_notify_now: remainingSec <= 0,
    };
  });

  return NextResponse.json({ now: now.toISOString(), total: rows.length, tokens: debug });
}
