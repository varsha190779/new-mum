"use client";

import { useEffect, useState } from "react";

interface Option<T extends string | number> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="min-w-0">
      <div className="eyebrow mb-1.5 pl-1">{label}</div>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex max-w-full rounded-full border border-line bg-paper p-1"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={[
                "whitespace-nowrap rounded-full font-medium transition-all duration-200",
                size === "md" ? "h-9 px-3.5 text-[13px] sm:px-4" : "h-8 px-3 text-xs",
                active ? "bg-white text-ink shadow-soft ring-1 ring-line" : "text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ControlButton({
  children,
  onClick,
  variant = "ghost",
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary"
          ? "bg-ink text-white hover:bg-ink-2"
          : "border border-line-2 bg-white text-ink hover:border-ink-4",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}
