import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, buildUserText } from "@/prompts/parse-screenshot";
import { parsedShiftSchema, parsedShiftJsonSchema } from "@/lib/shift";
import { saveParseLog } from "@/lib/supabase-server";

// スクショ解析API: 画像を受け取り OpenAI(vision + structured outputs)で構造化して返す。
// 個人情報注意: スクショには注文者情報が写り込む可能性がある。
// このAPIは売上関連フィールドのみを抽出・返却し、画像そのものは保存しない。
// 注文者情報のテキスト抽出は行わない方針(プロンプト側でも明示)。

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// 精度と費用のバランスはモデルで調整する。Vercelの環境変数 OPENAI_MODEL で差し替え可能
const DEFAULT_MODEL = "gpt-4.1-mini";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI解析が未設定です(OPENAI_API_KEY がありません)。手動入力で記録できます。",
      },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const formData = await req.formData();
    const entry = formData.get("image");
    if (entry instanceof File) file = entry;
  } catch {
    // fall through to the null check below
  }

  if (!file) {
    return NextResponse.json(
      { error: "画像が送信されていません。" },
      { status: 400 },
    );
  }

  const mediaType = file.type as (typeof SUPPORTED_MEDIA_TYPES)[number];
  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
    return NextResponse.json(
      {
        error: `未対応の画像形式です(${file.type || "不明"})。スクリーンショット(PNG/JPEG)をアップロードしてください。`,
      },
      { status: 415 },
    );
  }

  const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const todayIso = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  });

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const client = new OpenAI();

  try {
    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${imageBase64}`,
                detail: "high",
              },
            },
            { type: "text", text: buildUserText(todayIso) },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "parsed_shift",
          strict: true,
          schema: parsedShiftJsonSchema as unknown as Record<string, unknown>,
        },
      },
    });

    const choice = response.choices[0];
    if (choice?.message.refusal) {
      return NextResponse.json(
        { error: "この画像は解析できませんでした。手動入力してください。" },
        { status: 422 },
      );
    }

    const rawText = choice?.message.content;
    if (!rawText) {
      return NextResponse.json(
        { error: "解析結果を取得できませんでした。手動入力してください。" },
        { status: 422 },
      );
    }

    // 解析の生出力は parse_logs に必ず残す(プロンプト改善用)。
    // Supabase未設定時はサーバーログのみ。
    await saveParseLog({ model, rawText });

    const raw = JSON.parse(rawText);
    // strict mode都合で platform の「不明」は "unknown" で受けている → null に正規化
    if (raw.platform === "unknown") raw.platform = null;

    const parsed = parsedShiftSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[parse] schema validation failed", parsed.error.issues);
      return NextResponse.json(
        { error: "解析結果の形式が不正でした。手動入力してください。" },
        { status: 422 },
      );
    }

    return NextResponse.json({ result: parsed.data });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      console.error(
        "[parse] OpenAI API error",
        JSON.stringify({ status: err.status, code: err.code, message: err.message }),
      );
      // OpenAIは残高不足も429で返すため、コードで切り分けて正しい対処を伝える
      if (err.code === "insufficient_quota") {
        return NextResponse.json(
          {
            error:
              "OpenAIのクレジット残高が不足しています。platform.openai.com の Billing でチャージしてください。",
          },
          { status: 502 },
        );
      }
      if (err.status === 429) {
        return NextResponse.json(
          { error: "AIが混み合っています。少し待ってから再試行してください。" },
          { status: 429 },
        );
      }
      if (err.status === 401) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY が無効です。Vercelの環境変数を確認してください。" },
          { status: 502 },
        );
      }
      if (err.status === 404) {
        return NextResponse.json(
          {
            error: `モデル「${model}」が利用できません。環境変数 OPENAI_MODEL を変更してください。`,
          },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: "AI解析でエラーが発生しました。手動入力してください。" },
        { status: 502 },
      );
    }
    console.error("[parse] unexpected error", err);
    return NextResponse.json(
      { error: "解析に失敗しました。手動入力してください。" },
      { status: 500 },
    );
  }
}
