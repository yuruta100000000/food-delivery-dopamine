"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import NumberTicker from "@/components/NumberTicker";
import ProgressRing from "@/components/ProgressRing";
import { IconFlame, IconSpark } from "@/components/icons";
import { PLATFORMS, type Platform } from "@/lib/shift";
import { listShifts, type Shift } from "@/lib/storage";
import { GOAL_PRESETS, getWeeklyGoal, setWeeklyGoal } from "@/lib/goal";
import {
  DEFAULT_PROFILE,
  RIDE_STYLES,
  VEHICLES,
  getProfile,
  saveProfile,
  styleLabel,
  vehicleLabel,
  type Profile,
} from "@/lib/profile";
import { MILESTONES, aggregate, computeLevel, unlockedIds } from "@/lib/level";
import { computeStreak, formatYen, sumRevenue, todayIso } from "@/lib/stats";

// マイページ: 配達員としての活動履歴が積み上がる公開プロフィール(の原型)。
// Supabase接続後は他ユーザーから見られる前提の構成。

export default function MyPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [goal, setGoal] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(DEFAULT_PROFILE);
  const [goalDraft, setGoalDraft] = useState("");

  const today = todayIso();

  useEffect(() => {
    listShifts()
      .then(setShifts)
      .catch(() => setShifts([]));
    const p = getProfile();
    setProfile(p);
    setDraft(p);
    setGoal(getWeeklyGoal());
  }, []);

  const agg = useMemo(() => aggregate(shifts, today), [shifts, today]);
  const level = computeLevel(agg.totalRevenue);
  const unlocked = useMemo(() => unlockedIds(agg), [agg]);
  const streak = computeStreak(shifts, today);
  const firstDate = useMemo(
    () => (shifts.length ? shifts.reduce((a, s) => (s.date < a ? s.date : a), shifts[0].date) : null),
    [shifts],
  );

  function startEdit() {
    setDraft(profile);
    setGoalDraft(goal != null ? String(goal) : "");
    setEditing(true);
  }

  function commitEdit() {
    const next = { ...draft, name: draft.name.trim() || DEFAULT_PROFILE.name };
    saveProfile(next);
    setProfile(next);
    const g = Number(goalDraft);
    if (g > 0) {
      setWeeklyGoal(g);
      setGoal(g);
    }
    setEditing(false);
  }

  function toggleApp(app: Platform) {
    setDraft((d) => ({
      ...d,
      apps: d.apps.includes(app)
        ? d.apps.filter((a) => a !== app)
        : [...d.apps, app],
    }));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-28 pt-6">
      <div className="stars absolute inset-x-0 top-0 h-56" aria-hidden />

      <header className="anim-rise relative mb-7">
        <p className="kicker text-white/35">Rider Profile</p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar name={profile.name} size={64} me />
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-2xl text-white">{profile.name}</h1>
            <p className="mt-1 text-xs font-bold text-amber-300/90">
              <span className="kicker mr-2 text-white/35">Rank {level.level}</span>
              {level.title}
            </p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="row-press shrink-0 rounded-full border border-white/12 px-4 py-1.5 text-[11px] font-bold text-white/50"
            >
              編集
            </button>
          )}
        </div>
        {!editing && profile.bio && (
          <p className="mt-4 text-xs leading-relaxed text-white/50">{profile.bio}</p>
        )}
      </header>

      {editing ? (
        /* 編集モード */
        <section className="anim-rise relative space-y-6">
          <div>
            <p className="text-[10px] tracking-wider text-white/35">表示名</p>
            <input
              className="input-line mt-1"
              value={draft.name}
              maxLength={20}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <p className="text-[10px] tracking-wider text-white/35">自己紹介</p>
            <textarea
              className="input-line mt-1 min-h-[64px] resize-none text-sm"
              value={draft.bio}
              maxLength={140}
              placeholder="例: 都内を夜メインで走ってます。目標は週5万。"
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
          </div>
          <div>
            <p className="text-[10px] tracking-wider text-white/35">使用アプリ</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PLATFORMS.filter((p) => p.value !== "other").map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => toggleApp(p.value)}
                  className={`row-press rounded-full border px-4 py-1.5 text-[11px] font-bold transition ${
                    draft.apps.includes(p.value)
                      ? "border-orange-500/70 text-orange-400"
                      : "border-white/12 text-white/45"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] tracking-wider text-white/35">稼働スタイル</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {RIDE_STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, style: s.value })}
                    className={`row-press rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
                      draft.style === s.value
                        ? "border-orange-500/70 text-orange-400"
                        : "border-white/12 text-white/45"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-wider text-white/35">車両</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {VEHICLES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, vehicle: v.value })}
                    className={`row-press rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
                      draft.vehicle === v.value
                        ? "border-orange-500/70 text-orange-400"
                        : "border-white/12 text-white/45"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] tracking-wider text-white/35">週間目標(円)</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {GOAL_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setGoalDraft(String(p))}
                  className={`row-press num rounded-full border px-4 py-1.5 text-[11px] font-bold ${
                    Number(goalDraft) === p
                      ? "border-orange-500/70 text-orange-400"
                      : "border-white/12 text-white/45"
                  }`}
                >
                  {p / 10000}万
                </button>
              ))}
              <input
                type="number"
                inputMode="numeric"
                placeholder="自由入力"
                className="input-line num w-28 text-sm"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
              />
            </div>
          </div>
          <div className="pt-2">
            <button type="button" onClick={commitEdit} className="btn-primary">
              保存する
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-4 block w-full py-1 text-center text-sm font-semibold text-white/35"
            >
              キャンセル
            </button>
          </div>
        </section>
      ) : (
        <div className="relative space-y-9">
          {/* ライダー情報 */}
          <section className="anim-rise" style={{ animationDelay: "0.06s" }}>
            <div className="hairline-t hairline-b grid grid-cols-3 py-4">
              <div className="text-center">
                <p className="text-[10px] text-white/35">稼働スタイル</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {styleLabel(profile.style)}
                </p>
              </div>
              <div className="border-l border-white/8 text-center">
                <p className="text-[10px] text-white/35">車両</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {vehicleLabel(profile.vehicle)}
                </p>
              </div>
              <div className="border-l border-white/8 text-center">
                <p className="text-[10px] text-white/35">週間目標</p>
                <p className="num mt-1 text-sm font-bold text-white">
                  {goal != null ? formatYen(goal) : "—"}
                </p>
              </div>
            </div>
            {profile.apps.length > 0 && (
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-white/30">使用アプリ</span>
                {profile.apps.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold text-white/55"
                  >
                    {PLATFORMS.find((p) => p.value === a)?.label}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 累計 */}
          <section className="anim-rise" style={{ animationDelay: "0.12s" }}>
            <p className="kicker text-white/35">Total Journey</p>
            <div className="mt-3 grid grid-cols-3">
              <div>
                <p className="num text-[22px] leading-tight text-white">
                  <NumberTicker value={agg.totalRevenue} format={formatYen} />
                </p>
                <p className="mt-1 text-[10px] text-white/35">総売上</p>
              </div>
              <div className="border-l border-white/8 pl-4">
                <p className="num text-[22px] leading-tight text-white">
                  <NumberTicker value={agg.totalDeliveries} />
                  <span className="text-sm text-white/40">件</span>
                </p>
                <p className="mt-1 text-[10px] text-white/35">総配達</p>
              </div>
              <div className="border-l border-white/8 pl-4">
                <p className="num text-[22px] leading-tight text-white">
                  <NumberTicker value={Math.round(agg.totalDistance)} />
                  <span className="text-sm text-white/40">km</span>
                </p>
                <p className="mt-1 text-[10px] text-white/35">旅した距離</p>
              </div>
            </div>
            <div className="hairline-t mt-4 flex items-center justify-between pt-3 text-[11px] text-white/40">
              <span className="flex items-center gap-1.5">
                <IconFlame
                  size={13}
                  className={streak > 0 ? "text-orange-400" : "text-white/20"}
                />
                連続稼働 <span className="num text-white/70">{streak}日</span>
              </span>
              {firstDate && (
                <span className="num">
                  {firstDate.replaceAll("-", ".")} から走っている
                </span>
              )}
            </div>
          </section>

          {/* ランク */}
          <section
            className="anim-rise flex items-center gap-5"
            style={{ animationDelay: "0.18s" }}
          >
            <ProgressRing size={64} stroke={5} progress={level.progress}>
              <span className="num text-lg text-white">{level.level}</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold text-white">
                  <span className="kicker mr-2 text-white/35">Rank {level.level}</span>
                  {level.title}
                </p>
                <p className="num text-[10px] text-white/25">
                  next {formatYen(level.toNext)}
                </p>
              </div>
              <div className="mt-2.5 h-px w-full bg-white/10">
                <div
                  className="h-px bg-gradient-to-r from-orange-500 to-amber-400"
                  style={{
                    width: `${level.progress * 100}%`,
                    boxShadow: "0 0 8px rgba(249,115,22,0.55)",
                  }}
                />
              </div>
            </div>
          </section>

          {/* 実績図鑑 */}
          <section className="anim-rise" style={{ animationDelay: "0.24s" }}>
            <div className="flex items-baseline justify-between">
              <p className="kicker text-white/35">Achievements</p>
              <p className="num text-[11px] text-white/40">
                {unlocked.size}
                <span className="text-white/25"> / {MILESTONES.length}</span>
              </p>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-6">
              {MILESTONES.map((m) => {
                const got = unlocked.has(m.id);
                return (
                  <li
                    key={m.id}
                    className="hairline-b flex items-center gap-2.5 py-3"
                  >
                    <IconSpark
                      size={14}
                      className={got ? "text-amber-300" : "text-white/12"}
                    />
                    <span
                      className={`text-[11px] font-bold ${
                        got ? "text-white/85" : "text-white/22"
                      }`}
                    >
                      {m.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className="pb-2 text-center text-[10px] leading-relaxed text-white/20">
            このプロフィールは、正式公開後に他のライダーから見られるようになります
          </p>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
