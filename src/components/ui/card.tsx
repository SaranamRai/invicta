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
        variant === "default" && "bg-card text-card-foreground shadow-sm border-border p-3.5 sm:p-4",
        variant === "scoreboard" && "bg-slate-900 text-white border-white/10 p-3.5 shadow-xl sm:p-4",
        variant === "accent" && "bg-accent text-accent-foreground border-accent p-3.5 shadow-lg sm:p-4",
        glass && "bg-white/10 backdrop-blur-md border-white/20 dark:bg-slate-900/40 dark:border-slate-700/50 p-3.5 sm:p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4 space-y-1", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-lg font-bold leading-tight tracking-tight sport-heading sm:text-xl", className)}>{children}</h3>;
}


export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("", className)}>{children}</div>;
}
