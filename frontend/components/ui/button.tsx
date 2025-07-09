import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-bold text-lg transition-colors",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

// GoogleButton: white button with Google logo and text
export function GoogleButton({ children = "Continue with Google", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex items-center justify-center gap-3 w-full bg-white text-neutral-900 font-semibold border border-neutral-300 rounded-2xl px-4 py-3 text-lg shadow transition hover:bg-neutral-100 active:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#a020f0]",
        className
      )}
      {...props}
    >
      <svg width="22" height="22" viewBox="0 0 48 48" className="inline-block" aria-hidden="true"><g><path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.3-5.7 7-11.3 7-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2.9 7.2 2.4l6-6C34.5 5.5 29.5 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5c11 0 20.5-8.5 20.5-20.5 0-1.4-.1-2.7-.4-4z"/><path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c2.7 0 5.2.9 7.2 2.4l6-6C34.5 5.5 29.5 3.5 24 3.5c-7.2 0-13.4 4.1-16.7 10.2z"/><path fill="#FBBC05" d="M24 44.5c5.5 0 10.5-1.8 14.4-4.9l-6.7-5.5c-2 1.4-4.5 2.2-7.7 2.2-5.6 0-10.3-3.7-12-8.7l-6.6 5.1C7.5 40.1 15.1 44.5 24 44.5z"/><path fill="#EA4335" d="M43.6 20.5h-1.9V20H24v8h11.3c-0.7 2-2.1 3.7-4.1 4.9l6.7 5.5c-0.6.6 6.1-4.5 6.1-13.4 0-1.4-.1-2.7-.4-4z"/></g></svg>
      {children}
    </button>
  );
} 