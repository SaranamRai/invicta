import { Mars, Venus } from "lucide-react";
import { cn } from "@/lib/utils";

type GenderMarkProps = {
  gender: "Male" | "Female" | string;
  className?: string;
};

export function GenderMark({ gender, className }: GenderMarkProps) {
  const isFemale = gender.toLowerCase() === "female";
  const Icon = isFemale ? Venus : Mars;

  return (
    <span
      role="img"
      aria-label={`${gender} category`}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md border border-current/20 bg-current/10", className)}
    >
      <Icon aria-hidden="true" className="h-[70%] w-[70%]" strokeWidth={1.8} />
    </span>
  );
}
