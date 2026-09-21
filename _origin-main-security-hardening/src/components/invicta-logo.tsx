import { cn } from "@/lib/utils";

type InvictaLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function InvictaLogo({ className, imageClassName }: InvictaLogoProps) {
  return (
    <span className={cn("inline-flex h-12 w-44 items-center justify-center overflow-hidden", className)}>
      <img
        src="/invicta-logo-transparent.png"
        alt="INVICTA"
        className={cn("block h-full max-h-full w-full object-contain", imageClassName)}
      />
    </span>
  );
}
