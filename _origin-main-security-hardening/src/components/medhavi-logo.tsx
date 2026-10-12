import { cn } from "@/lib/utils";

type MedhaviLogoProps = {
  className?: string;
  imageClassName?: string;
};

export function MedhaviLogo({ className, imageClassName }: MedhaviLogoProps) {
  return (
    <span className={cn("msu-logo-frame inline-flex h-14 w-52 items-center justify-center overflow-hidden", className)}>
      <img
        src="/medhavi-skills-university.png"
        alt="Medhavi Skills University"
        className={cn("block h-full max-h-full w-full object-contain mix-blend-multiply", imageClassName)}
      />
    </span>
  );
}
