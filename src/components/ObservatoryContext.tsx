"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Condition } from "@/lib/sim/engine";

interface Ctx {
  size: number;
  condition: Condition;
  setSize: (n: number) => void;
  setCondition: (c: Condition) => void;
}

const ObservatoryCtx = createContext<Ctx | null>(null);

/** Shares lab settings (network size, conditions) with the comparison section. */
export function ObservatoryProvider({ children }: { children: React.ReactNode }) {
  const [size, setSize] = useState(24);
  const [condition, setCondition] = useState<Condition>("stable");
  const value = useMemo(() => ({ size, condition, setSize, setCondition }), [size, condition]);
  return <ObservatoryCtx.Provider value={value}>{children}</ObservatoryCtx.Provider>;
}

export function useObservatory(): Ctx {
  const v = useContext(ObservatoryCtx);
  if (!v) throw new Error("useObservatory must be used inside ObservatoryProvider");
  return v;
}
