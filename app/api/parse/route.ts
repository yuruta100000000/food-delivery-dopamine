import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, buildUserText } from "@/prompts/parse-screenshot";
import { parsedShiftSchema, parsedShiftJsonSchema } from "@/lib/shift";

// スクショ解析API: 画像を受け取り Claude(vision)で構造化して返す。
// 個人情報注意: スクショには注文者情報が写り込む可能性がある。
// このAPIは売上関連フィールドのみを抽出・返却し、画像そのものは保存しない
// (Supabase Storage 導入後も、保存するのは画像と売上フィールドのみで、
//  注文者情報のテキスト抽出は行わない方針)。

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI解析が未設定です(ANTHROPIC_API_KEY がありません)。手動入力で記録できます。",
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

  const mediaType = file.type as SupportedMediaType;
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

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      system: buildSystemPrompt(),
      output_config: {
        format: {
          type: "json_schema",
          schema: parsedShiftJsonSchema,
        },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            { type: "text", text: buildUserText(todayIso) },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "この画像は解析できませんでした。手動入力してください。" },
        { status: 422 },
      );
    }

    const rawText = response.content.find((b) => b.type === "text")?.text;
    if (!rawText) {
      return NextResponse.json(
        { error: "解析結果を取得できませんでした。手動入力してください。" },
        { status: 422 },
      );
    }

    // TODO(Supabase導入時): 解析の生出力を parse_logs テーブルに必ず保存する
    // (プロンプト改善用)。それまではサーバーログに残す。
    console.log("[parse_log]", JSON.stringify({ at: new Date().toISOString(), rawText }));

    const parsed = parsedShiftSchema.safeParse(JSON.parse(rawText));
    if (!parsed.success) {
      console.error("[parse] schema validation failed", parsed.error.issues);
      return NextResponse.json(
        { error: "解析結果の形式が不正でした。手動入力してください。" },
        { status: 422 },
      );
    }

    return NextResponse.json({ result: parsed.data });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "アクセスが集中しています。少し待ってから再試行してください。" },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[parse] Anthropic API error", err.status, err.message);
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
