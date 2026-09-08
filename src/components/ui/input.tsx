import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 placeholder:text-slate-400 focus:border-blue-500", className)} {...props} />;
}
