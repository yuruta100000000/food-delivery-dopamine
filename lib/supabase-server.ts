import { createClient } from "@supabase/supabase-js";

// 解析の生出力を parse_logs に保存する(プロンプト改善用に必ず残す方針)。
// Supabase未設定時はサーバーログのみに残す。
// 個人情報注意: 保存するのはAIの構造化出力(売上関連フィールド)のみで、
// スクショ画像や注文者情報は含まれない。

export async function saveParseLog(input: {
  model: string;
  rawText: string;
}): Promise<void> {
  console.log(
    "[parse_log]",
    JSON.stringify({ at: new Date().toISOString(), model: input.model, raw: input.rawText }),
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return;

  try {
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    let rawOutput: unknown;
    try {
      rawOutput = JSON.parse(input.rawText);
    } catch {
      rawOutput = { text: input.rawText };
    }
    const { error } = await supabase
      .from("parse_logs")
      .insert({ model: input.model, raw_output: rawOutput });
    if (error) console.error("[parse_log] supabase insert failed", error.message);
  } catch (err) {
    console.error("[parse_log] supabase error", err);
  }
}
