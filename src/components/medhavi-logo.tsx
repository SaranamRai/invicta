import { cn } from "@/lib/utils";

type MedhaviLogoProps = {
  className?: string;
  imageClassName?: string;
};

export function MedhaviLogo({ className, imageClassName }: MedhaviLogoProps) {
  return (
    <span className={cn("inline-flex h-12 w-44 items-center justify-center overflow-hidden", className)}>
      <img
        src="/msu-logo-transparent.png"
        alt="Medhavi Skills University"
        className={cn("block h-full max-h-full w-full object-contain", imageClassName)}
      />
    </span>
  );
}
