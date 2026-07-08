import type { Platform } from "@/lib/shift";

// ライダープロフィール(マイページ/タイムラインで使用)。
// 端末ローカル保存。Supabase接続時にprofilesテーブルへ移行し、
// 他ユーザーから閲覧可能な公開プロフィールになる前提の構造。

export const RIDE_STYLES = [
  { value: "fulltime", label: "専業" },
  { value: "side", label: "副業" },
  { value: "weekend", label: "週末だけ" },
] as const;

export const VEHICLES = [
  { value: "bicycle", label: "自転車" },
  { value: "moped", label: "原付" },
  { value: "motorcycle", label: "バイク" },
  { value: "kei", label: "軽貨物" },
] as const;

export type RideStyle = (typeof RIDE_STYLES)[number]["value"];
export type Vehicle = (typeof VEHICLES)[number]["value"];

export type Profile = {
  name: string;
  bio: string;
  apps: Platform[];
  style: RideStyle;
  vehicle: Vehicle;
};

export const DEFAULT_PROFILE: Profile = {
  name: "名もなきライダー",
  bio: "",
  apps: [],
  style: "side",
  vehicle: "bicycle",
};

const KEY = "delilog.profile.v1";

export function getProfile(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: Profile): void {
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function styleLabel(style: RideStyle): string {
  return RIDE_STYLES.find((s) => s.value === style)?.label ?? "";
}

export function vehicleLabel(vehicle: Vehicle): string {
  return VEHICLES.find((v) => v.value === vehicle)?.label ?? "";
}
