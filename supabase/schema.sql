-- DeliLog 初期スキーマ
-- Supabaseダッシュボードの SQL Editor で実行する。
-- 前提: Authentication > Sign In / Up で「Anonymous sign-ins」を有効化しておくこと。
-- users テーブルは auth.users(Supabase Auth)をそのまま利用する。

-- 稼働記録
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  platform text not null check (platform in ('uber', 'demaecan', 'menu', 'rocketnow', 'other')),
  revenue_yen integer not null check (revenue_yen >= 0),
  deliveries integer check (deliveries >= 0),
  minutes_worked integer check (minutes_worked >= 0),
  source text not null default 'manual' check (source in ('screenshot', 'manual')),
  raw_screenshot_url text,
  created_at timestamptz not null default now()
);

alter table public.shifts enable row level security;

create policy "select own shifts" on public.shifts
  for select using (auth.uid() = user_id);
create policy "insert own shifts" on public.shifts
  for insert with check (auth.uid() = user_id);
create policy "delete own shifts" on public.shifts
  for delete using (auth.uid() = user_id);

create index shifts_user_date_idx on public.shifts (user_id, date desc);

-- スクショ解析の生出力(プロンプト改善用に必ず残す)
-- 書き込みはサーバー(service role)のみ。ポリシーを作らないことで匿名アクセスを遮断する。
create table public.parse_logs (
  id uuid primary key default gen_random_uuid(),
  model text,
  raw_output jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.parse_logs enable row level security;
