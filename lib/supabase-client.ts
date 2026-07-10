import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ブラウザ側で共有するSupabaseクライアント(1インスタンス)。
// storage.ts(データ)と auth.ts(認証)の両方がこれを使う。
// 環境変数未設定時は null を返し、呼び出し側がlocalStorageにフォールバックする。

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return client;
}
