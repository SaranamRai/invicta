import { Mars, Venus } from "lucide-react";

type GenderMarkProps = {
  gender: "Male" | "Female" | string;
  className?: string;
};

export function GenderMark({ gender, className }: GenderMarkProps) {
  const normalized = gender.trim().toLowerCase();
  if (normalized !== "male" && normalized !== "female") return null;
  const Icon = normalized === "female" ? Venus : Mars;
  const color = normalized === "female" ? "text-pink-400" : "text-blue-400";
  return <Icon aria-label={`${gender} category`} role="img" className={`${color} ${className || ""}`} strokeWidth={2.25} />;
}
