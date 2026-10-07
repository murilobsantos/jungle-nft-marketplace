import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
const variants = cva(
  "inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110",
        outline: "border border-primary text-primary bg-transparent",
        ghost: "text-primary bg-transparent hover:bg-card",
      },
      size: {
        default: "px-5 py-2.5 text-sm",
        icon: "p-2",
        sm: "px-3 py-1.5 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(variants({ variant, size, className }))} {...props} />
  );
}
