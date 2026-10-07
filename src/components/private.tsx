import type { ReactNode } from "react";
import { useApp } from "../state";
import { Skeleton } from "./common";
export function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useApp();
  return loading || !session ? <Skeleton /> : children;
}
