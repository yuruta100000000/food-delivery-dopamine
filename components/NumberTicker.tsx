"use client";

import { useEffect, useRef, useState } from "react";

// 数字が走って止まる(オドメーター的な気持ちよさ)。
// マウント時と値の変化時に、現在表示値から目標値までイージングで遷移する。

type Props = {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
};

export default function NumberTicker({
  value,
  format = (n) => n.toLocaleString("ja-JP"),
  durationMs = 900,
  className,
}: Props) {
  const [displayed, setDisplayed] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (value - from) * eased);
      setDisplayed(current);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = value;
    };
  }, [value, durationMs]);

  return <span className={className}>{format(displayed)}</span>;
}
