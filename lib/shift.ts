import { z } from "zod";

// スクショ解析結果(=手動修正フォームの型でもある)。
// 個人情報注意: スクショには注文者名・住所等が写り込む可能性があるため、
// 解析後にアプリが保持するのは以下の売上関連フィールドのみとする。
// それ以外の情報(注文者情報・地図・チャット内容など)は抽出も保存もしない。

export const PLATFORMS = [
  { value: "uber", label: "Uber Eats" },
  { value: "demaecan", label: "出前館" },
  { value: "menu", label: "menu" },
  { value: "rocketnow", label: "ロケットナウ" },
  { value: "other", label: "その他" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

export const parsedShiftSchema = z.object({
  found: z.boolean(),
  platform: z.enum(["uber", "demaecan", "menu", "rocketnow", "other"]).nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  revenue_yen: z.number().int().nonnegative().nullable(),
  deliveries: z.number().int().nonnegative().nullable(),
  minutes_worked: z.number().int().nonnegative().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().nullable(),
});

export type ParsedShift = z.infer<typeof parsedShiftSchema>;

// OpenAI structured outputs(strict mode)に渡す JSON Schema。
// strict modeの制約(enumにnull不可等)のため、platformの「不明」は
// "unknown" で受けてサーバー側で null に変換する。
// zodスキーマ(parsedShiftSchema)と必ず同期させること(最終検証はzod側)。
export const parsedShiftJsonSchema = {
  type: "object",
  properties: {
    found: {
      type: "boolean",
      description: "画像がデリバリーアプリの売上・稼働画面として読み取れたか",
    },
    platform: {
      type: "string",
      enum: ["uber", "demaecan", "menu", "rocketnow", "other", "unknown"],
      description: "配達プラットフォーム。判別できなければ unknown",
    },
    date: {
      type: ["string", "null"],
      description:
        "稼働日 YYYY-MM-DD(ゼロ埋め)。画面に年がない場合は基準日から補完。不明ならnull",
    },
    revenue_yen: {
      type: ["integer", "null"],
      description: "売上金額(円・整数)。不明ならnull",
    },
    deliveries: {
      type: ["integer", "null"],
      description: "配達件数。不明ならnull",
    },
    minutes_worked: {
      type: ["integer", "null"],
      description: "稼働時間(分)。オンライン時間があれば優先。不明ならnull",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "読み取り全体の確信度",
    },
    notes: {
      type: ["string", "null"],
      description: "読み取りに関する補足(期間集計の画面だった等)。なければnull",
    },
  },
  required: [
    "found",
    "platform",
    "date",
    "revenue_yen",
    "deliveries",
    "minutes_worked",
    "confidence",
    "notes",
  ],
  additionalProperties: false,
} as const;
