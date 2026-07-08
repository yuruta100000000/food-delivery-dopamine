// 細線のカスタムSVGアイコン(絵文字は使わない)。
// stroke: currentColor / 1.5px で統一。

type IconProps = {
  size?: number;
  className?: string;
};

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

/* シャッター(記録する) */
export function IconAperture({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v6.2" />
      <path d="M19.8 7.5l-5.4 3.1" />
      <path d="M19.8 16.5l-5.4-3.1" />
      <path d="M12 21v-6.2" />
      <path d="M4.2 16.5l5.4-3.1" />
      <path d="M4.2 7.5l5.4 3.1" />
    </svg>
  );
}

/* 波形(旅の記録) */
export function IconPulse({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 14.5l3.2-4.2 3 6 3.4-9 3 7.2 2.2-3h3.2" />
    </svg>
  );
}

/* 炎(連続稼働) */
export function IconFlame({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 21c-3.6 0-6-2.3-6-5.6 0-2.4 1.5-4.2 2.8-5.8C10 8.1 11 6.9 11 5c0-.7-.1-1.3-.3-2 3.6 1.4 7.3 5.6 7.3 11.4 0 4-2.4 6.6-6 6.6z" />
      <path d="M12 21c-1.6 0-2.7-1.2-2.7-2.9 0-1.6 1.2-2.7 2.2-4.1 1.5 1 3.2 2.5 3.2 4.3 0 1.6-1.1 2.7-2.7 2.7z" />
    </svg>
  );
}

/* きらめき(実績) */
export function IconSpark({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.4L12 17l-1.9-5.6L4.5 10l5.6-1.4L12 3z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
    </svg>
  );
}

/* 距離(道) */
export function IconRoute({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="6" cy="18.5" r="2" />
      <circle cx="18" cy="5.5" r="2" />
      <path d="M8 18.5h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16" strokeDasharray="0.1 3.2" />
    </svg>
  );
}
