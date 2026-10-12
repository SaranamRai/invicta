import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glass?: boolean;
  variant?: "default" | "scoreboard" | "accent";
}

export function Card({ children, className, glass = false, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-300",
        variant === "default" && "bg-card text-card-foreground shadow-sm border-border p-4 sm:p-5",
        variant === "scoreboard" && "bg-slate-900 text-white border-white/10 p-4 shadow-xl sm:p-5",
        variant === "accent" && "bg-accent text-accent-foreground border-accent p-4 shadow-lg sm:p-5",
        glass && "bg-white/10 backdrop-blur-md border-white/20 dark:bg-slate-900/40 dark:border-slate-700/50 p-4 sm:p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-6 space-y-1", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-xl font-bold leading-none tracking-tight sport-heading", className)}>{children}</h3>;
}


export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("", className)}>{children}</div>;
}
