// イニシャルアバター。自分は残り火のリング、他人は静かなヘアライン。

type Props = {
  name: string;
  size?: number;
  me?: boolean;
};

export default function Avatar({ name, size = 40, me = false }: Props) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white/85"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: "rgba(255,255,255,0.05)",
        border: me
          ? "1.5px solid rgba(249,115,22,0.75)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: me ? "0 0 12px rgba(249,115,22,0.35)" : "none",
        fontFamily: "var(--font-zen), sans-serif",
      }}
    >
      {initial}
    </div>
  );
}
