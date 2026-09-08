import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-blue-700 text-white shadow-sm hover:bg-blue-800",
        secondary: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        danger: "bg-rose-600 text-white hover:bg-rose-700",
      },
      size: { default: "min-h-12", lg: "min-h-14 px-6 text-base", icon: "size-12 p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
