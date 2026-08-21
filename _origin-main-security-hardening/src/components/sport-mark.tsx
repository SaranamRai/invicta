type SportMarkProps = {
  name: string;
  className?: string;
};

export function SportMark({ name, className }: SportMarkProps) {
  const normalizedName = name.trim().toLowerCase();
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (normalizedName.includes("cricket")) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
        <path d="M17 7l8 3-9 25-8-3zM25 10l4-3M13 38h21M29 29l8 8M34 27l4 4" {...common} />
        <circle cx="37" cy="12" r="3" {...common} />
      </svg>
    );
  }

  if (normalizedName.includes("badminton")) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
        <ellipse cx="19" cy="17" rx="10" ry="13" transform="rotate(-35 19 17)" {...common} />
        <path d="M25 27l14 14M12 11l15 12M10 17l12 10M18 6l10 12M31 8l4 8 4-8M33 16h4" {...common} />
      </svg>
    );
  }

  if (normalizedName.includes("football")) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
        <circle cx="24" cy="24" r="17" {...common} />
        <path d="M24 15l7 5-3 8h-8l-3-8zM24 15V7M31 20l8-3M28 28l5 8M20 28l-5 8M17 20l-8-3" {...common} />
      </svg>
    );
  }

  if (normalizedName.includes("volleyball")) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
        <circle cx="24" cy="24" r="17" {...common} />
        <path d="M24 7c4 5 5 10 3 15M8 20c7-2 13 0 18 4M16 39c1-7 5-12 11-16M40 27c-7 1-12-1-16-6M32 10c-7 1-12 5-14 11M31 37c-1-7-4-12-10-16" {...common} />
      </svg>
    );
  }

  if (normalizedName.includes("arm")) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
        <path d="M8 35h12l5-7 2-10 5 1 2 8 6 3v5H28l-5 6H8zM27 18l-4-5 3-5 5 4 2 7" {...common} />
      </svg>
    );
  }

  if (normalizedName.includes("chess")) {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
        <path d="M24 6a6 6 0 016 6c0 2.7-1.8 5-4.3 5.7L28 25h6l-3 8H17l-3-8h6l2.3-7.3A6 6 0 0124 6zM16 33h16l3 8H13zM19 25h10" {...common} />
        <path d="M21 12h6M24 9v6" {...common} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path d="M10 11h20v26H10zM30 11h8v26h-8M30 24h8M14 37l-3 5M26 37l3 5" {...common} />
      <circle cx="38" cy="16" r="3" {...common} />
    </svg>
  );
}
