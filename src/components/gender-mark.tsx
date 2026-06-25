type GenderMarkProps = {
  gender: "Male" | "Female" | string;
  className?: string;
};

export function GenderMark({ gender, className }: GenderMarkProps) {
  // Use the requested gender logo for both male and female
  return (
    <img 
      src="/gender-logo.png" 
      alt={`${gender} category`} 
      className={`object-contain ${className || ''}`}
    />
  );
}
