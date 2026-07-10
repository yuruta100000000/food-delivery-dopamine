import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase-client";

// 認証レイヤー。
// - Supabase未設定: mode "local"(この端末のみ。ログイン概念なし)
// - Supabase設定済み: 匿名セッション(自動)+ Googleログイン(任意)
// 匿名ユーザーがGoogleでログインする時は linkIdentity で同一user_idのまま昇格し、
// 記録が消えないようにする(Supabase側で Manual Linking を有効化しておくこと)。

export type AuthState = {
  mode: "local" | "anonymous" | "google";
  email: string | null;
};

export async function getAuthState(): Promise<AuthState> {
  const client = getSupabaseBrowser();
  if (!client) return { mode: "local", email: null };
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (!user || user.is_anonymous) return { mode: "anonymous", email: null };
  return { mode: "google", email: user.email ?? null };
}

// Googleログイン(OAuthリダイレクト)。戻り先は呼び出し元ページ。
export async function signInWithGoogle(): Promise<void> {
  const client = getSupabaseBrowser();
  if (!client) throw new Error("Supabaseが未接続です。");
  const redirectTo = window.location.origin + window.location.pathname;

  const { data } = await client.auth.getSession();
  const user = data.session?.user;

  // 匿名セッションがある場合はIDを引き継いで昇格(記録を失わない)
  if (user?.is_anonymous) {
    const { error } = await client.auth.linkIdentity({
      provider: "google",
      options: { redirectTo },
    });
    if (!error) return;
    // Manual Linking無効などで失敗した場合は通常ログインにフォールバック
    console.warn("[auth] linkIdentity failed, falling back to signInWithOAuth:", error.message);
  }

  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw new Error(`Googleログインに失敗しました: ${error.message}`);
}

export async function signOutUser(): Promise<void> {
  const client = getSupabaseBrowser();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw new Error(`ログアウトに失敗しました: ${error.message}`);
}

// 認証状態の変化(OAuthリダイレクト帰着含む)を購読する。戻り値は解除関数。
export function onAuthChange(callback: () => void): () => void {
  const client = getSupabaseBrowser();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}

export { supabaseConfigured };
