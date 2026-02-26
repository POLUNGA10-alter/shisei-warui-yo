/**
 * Supabase クライアント設定
 *
 * 【このファイルの役割】
 * Supabase（データベースサービス）に接続するためのクライアントを作る。
 * 2種類のクライアントを用意している：
 *
 * 1. supabase（ブラウザ用） — フロントエンドから使う。制限付きの権限。
 * 2. supabaseAdmin（サーバー用） — APIルートから使う。フル権限。
 *
 * 【なぜ2種類必要か】
 * - ブラウザ用（anon key）: ユーザーが見える場所で使うので、権限が制限されている
 * - サーバー用（service role key）: サーバー内部でだけ使うので、全テーブルに読み書きできる
 *   → Cron JobでPush通知を送る時に使う
 *
 * 【Supabaseとは】
 * PostgreSQLデータベースをクラウドで提供するサービス。
 * Firebase Realtime DBのオープンソース版のようなもの。
 * テーブル作成・データの読み書き・認証などができる。
 */

import { createClient } from "@supabase/supabase-js";

// ブラウザ用クライアント（制限付き権限）
// NEXT_PUBLIC_ で始まる環境変数はブラウザからも読める
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// サーバー用クライアント（フル権限）
// SUPABASE_SERVICE_ROLE_KEY はサーバー側でのみ使用（ブラウザに露出しない）
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
