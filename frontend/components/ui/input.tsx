import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-2xl bg-black text-white border border-neutral-700 px-4 py-3 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#a020f0]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input"; 