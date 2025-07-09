import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Badge({ className, ...props }: BadgeProps) {
  return (
    <div className={cn("inline-flex items-center rounded-full bg-accent/20 text-accent px-3 py-1 text-sm font-bold", className)} {...props} />
  );
} 