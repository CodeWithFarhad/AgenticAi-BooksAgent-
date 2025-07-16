import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-[#23263A] border border-neutral-800 shadow-lg p-0", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 border-b border-neutral-800", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-2xl font-extrabold text-white", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 font-medium text-neutral-200", className)} {...props} />;
}

// Enhanced AuthCard: Premium glassmorphism, animated border, logo slot, and modern layout
export function AuthCard({
  title,
  description,
  children,
  footer,
  logo,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  logo?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full max-w-sm rounded-2xl p-[1.5px] bg-gradient-to-br from-[#4F46E5] via-[#23263A] to-[#000] shadow-xl overflow-hidden",
        className
      )}
      style={{backdropFilter: 'blur(10px)'}}
    >
      <div className="absolute inset-0 z-0 opacity-30 bg-gradient-to-br from-white/10 via-[#4F46E5]/10 to-black/30 animate-pulse" />
      <div className="relative z-10 flex flex-col items-center px-4 py-4 bg-[#23263A]/90 rounded-2xl shadow-lg">
        {logo && <div className="mb-1">{logo}</div>}
        <div className="w-full text-center mb-2">
          <h2 className="text-xl font-extrabold text-white drop-shadow mb-0 font-sans tracking-tight flex items-center justify-center gap-2">
            {title}
          </h2>
          {description && <p className="text-sm text-neutral-300 mb-0 font-medium">{description}</p>}
        </div>
        <div className="w-full flex flex-col gap-2">{children}</div>
        {footer && <div className="w-full mt-3">{footer}</div>}
      </div>
    </div>
  );
} 