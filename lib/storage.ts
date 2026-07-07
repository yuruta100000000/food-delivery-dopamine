import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Platform } from "@/lib/shift";

// 稼働記録の保存レイヤー(クライアント側)。
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていれば
// Supabase(匿名Auth)に保存し、未設定ならlocalStorageに保存する。
// → Supabase未設定でも「自分が毎日使える」状態を維持するため。

export type Shift = {
  id: string;
  date: string; // YYYY-MM-DD
  platform: Platform;
  revenue_yen: number;
  deliveries: number | null;
  minutes_worked: number | null;
  distance_km: number | null;
  source: "screenshot" | "manual";
  created_at: string;
};

export type ShiftInput = Omit<Shift, "id" | "created_at">;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const storageMode: "supabase" | "local" =
  SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "local";

// ---- localStorage 実装 ----

const LOCAL_KEY = "delilog.shifts.v1";

function localList(): Shift[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Shift[]) : [];
  } catch {
    return [];
  }
}

function localSave(shifts: Shift[]) {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(shifts));
}

// ---- Supabase 実装 ----

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return supabase;
}

// 匿名ログイン(SupabaseダッシュボードでAnonymous sign-insを有効化しておくこと)
async function ensureSession(client: SupabaseClient): Promise<void> {
  const { data } = await client.auth.getSession();
  if (data.session) return;
  const { error } = await client.auth.signInAnonymously();
  if (error) throw new Error(`匿名ログインに失敗しました: ${error.message}`);
}

// ---- 公開API ----

export async function listShifts(): Promise<Shift[]> {
  if (storageMode === "local") {
    return localList().sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const client = getSupabase();
  await ensureSession(client);
  const { data, error } = await client
    .from("shifts")
    .select("id, date, platform, revenue_yen, deliveries, minutes_worked, distance_km, source, created_at")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`記録の取得に失敗しました: ${error.message}`);
  return (data ?? []) as Shift[];
}

export async function addShift(input: ShiftInput): Promise<Shift> {
  if (storageMode === "local") {
    const shift: Shift = {
      ...input,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    localSave([shift, ...localList()]);
    return shift;
  }
  const client = getSupabase();
  await ensureSession(client);
  const { data, error } = await client
    .from("shifts")
    .insert(input)
    .select("id, date, platform, revenue_yen, deliveries, minutes_worked, distance_km, source, created_at")
    .single();
  if (error) throw new Error(`記録の保存に失敗しました: ${error.message}`);
  return data as Shift;
}

export async function deleteShift(id: string): Promise<void> {
  if (storageMode === "local") {
    localSave(localList().filter((s) => s.id !== id));
    return;
  }
  const client = getSupabase();
  await ensureSession(client);
  const { error } = await client.from("shifts").delete().eq("id", id);
  if (error) throw new Error(`記録の削除に失敗しました: ${error.message}`);
}
