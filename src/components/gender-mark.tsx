type GenderMarkProps = {
  gender: "Male" | "Female" | string;
  className?: string;
};

export function GenderMark({ gender, className }: GenderMarkProps) {
  const isFemale = String(gender).toLowerCase() === "female";

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <circle
        cx="24"
        cy="17"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      {isFemale ? (
        <>
          <path d="M24 26v14M17 34h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
          <path d="M18 24c-3 2-5 5-6 9M30 24c3 2 5 5 6 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" opacity=".45" />
        </>
      ) : (
        <>
          <path d="M31 10h9v9M30 11l9-9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          <path d="M18 25c-3 3-5 7-5 12M30 25c3 3 5 7 5 12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" opacity=".45" />
        </>
      )}
    </svg>
  );
}
