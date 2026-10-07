import { lazy, Suspense, type ReactNode } from "react";
const Content = lazy(() => import("./dialog-content"));
export function Modal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return props.open ? (
    <Suspense fallback={null}>
      <Content {...props} />
    </Suspense>
  ) : null;
}
