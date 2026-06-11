import Link from "next/link";
import {
  ArrowRight,
  Mail,
  MessageCircle,
  Share2,
  Video,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveSportsPanel } from "@/components/live-sports-panel";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "Sports", href: "/#sports" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

type SportMarkProps = {
  name: string;
};

function SportMark({ name }: SportMarkProps) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "Cricket") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M17 7l8 3-9 25-8-3zM25 10l4-3M13 38h21M29 29l8 8M34 27l4 4" {...common} />
        <circle cx="37" cy="12" r="3" {...common} />
      </svg>
    );
  }

  if (name === "Badminton") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <ellipse cx="19" cy="17" rx="10" ry="13" transform="rotate(-35 19 17)" {...common} />
        <path d="M25 27l14 14M12 11l15 12M10 17l12 10M18 6l10 12M31 8l4 8 4-8M33 16h4" {...common} />
      </svg>
    );
  }

  if (name === "Football") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="17" {...common} />
        <path d="M24 15l7 5-3 8h-8l-3-8zM24 15V7M31 20l8-3M28 28l5 8M20 28l-5 8M17 20l-8-3" {...common} />
      </svg>
    );
  }

  if (name === "Volleyball") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="17" {...common} />
        <path d="M24 7c4 5 5 10 3 15M8 20c7-2 13 0 18 4M16 39c1-7 5-12 11-16M40 27c-7 1-12-1-16-6M32 10c-7 1-12 5-14 11M31 37c-1-7-4-12-10-16" {...common} />
      </svg>
    );
  }

  if (name === "Arm Wrestling") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 35h12l5-7 2-10 5 1 2 8 6 3v5H28l-5 6H8zM27 18l-4-5 3-5 5 4 2 7" {...common} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M10 11h20v26H10zM30 11h8v26h-8M30 24h8M14 37l-3 5M26 37l3 5" {...common} />
      <circle cx="38" cy="16" r="3" {...common} />
    </svg>
  );
}

const sports = [
  "Cricket",
  "Badminton",
  "Football",
  "Volleyball",
  "Arm Wrestling",
  "Table Tennis",
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`landing-display font-black italic tracking-tight ${compact ? "text-2xl" : "text-3xl"}`}>
      IN<span className="landing-gold-text">VICTA</span>
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <LiveSportsPanel />
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" aria-label="Invicta home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-9 md:flex">
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                className={`relative text-xs font-bold uppercase tracking-[0.24em] transition-colors hover:text-[#f4c35a] ${index === 0 ? "text-[#f4c35a]" : "text-foreground/80"}`}
              >
                {link.label}
                {index === 0 && <span className="absolute -bottom-2 left-1/2 h-px w-6 -translate-x-1/2 bg-[#f4c35a]" />}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a
              href="#contact"
              className="landing-slant hidden items-center gap-2 border border-[#f4c35a]/50 px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#f4c35a] transition-colors hover:bg-[#f4c35a] hover:text-black md:inline-flex"
            >
              Get In Touch <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </header>

      <aside className="fixed right-0 top-1/3 z-30 hidden flex-col items-center gap-4 rounded-l-md border border-r-0 border-border bg-landing-sidebar-bg px-3 py-5 backdrop-blur lg:flex">
        <span className="rotate-180 text-[9px] font-bold tracking-[0.35em] text-foreground/50 [writing-mode:vertical-rl]">
          FOLLOW US
        </span>
        <Share2 className="h-4 w-4 text-foreground/50 transition-colors hover:text-[#f4c35a]" />
        <MessageCircle className="h-4 w-4 text-foreground/50 transition-colors hover:text-[#f4c35a]" />
        <Video className="h-4 w-4 text-foreground/50 transition-colors hover:text-[#f4c35a]" />
      </aside>

      <main>
        <section id="home" className="relative flex min-h-screen items-center overflow-hidden pb-16 pt-28">
          <div className="absolute inset-0 bg-[url('/badminton-bg.png')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--landing-overlay-98)_0%,var(--landing-overlay-90)_36%,var(--landing-overlay-48)_68%,var(--landing-overlay-42)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--landing-overlay-bottom)_0%,transparent_45%,var(--landing-overlay-top)_100%)]" />
          <div className="landing-hero-glow absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#d99d2b]/10 blur-3xl" />

          <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-4xl">
              <p className="mb-5 text-[10px] font-black uppercase tracking-[0.38em] text-[#f4c35a] sm:text-xs">
                Medhavi Skills University Sports
              </p>
              <h1 className="landing-display text-[3.25rem] font-black italic leading-[0.82] tracking-[-0.035em] sm:text-8xl lg:text-[8.5rem]">
                <span className="block">BUILT FOR</span>
                <span className="landing-gold-text block">CHAMPIONS</span>
              </h1>
              <p className="mt-8 max-w-lg text-sm font-semibold uppercase leading-7 tracking-[0.2em] text-foreground/60 sm:text-base">
                Passion in every game.
                <br />
                Performance that defines you.
              </p>

              <Link
                href="/public-dashboard"
                className="landing-slant group mt-10 inline-flex items-center gap-3 bg-[#e5ad3b] px-9 py-4 text-xs font-black uppercase tracking-[0.22em] text-black transition-all hover:bg-[#f7cf70]"
              >
                Explore Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        <section id="sports" className="border-y border-border bg-background px-5 py-20 sm:px-8 transition-colors duration-300">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-[#f4c35a]">Invicta Sports</p>
            <h2 className="landing-display mt-3 text-center text-3xl font-black uppercase tracking-[0.13em] sm:text-4xl">
              One Spirit. Every Game.
            </h2>

            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {sports.map((sport) => (
                <Link key={sport} href="/sports" className="group flex flex-col items-center gap-4">
                  <div className="landing-sport-card landing-slant grid aspect-square w-full place-items-center border border-landing-card-border bg-gradient-to-br from-landing-card-bg to-transparent transition-all group-hover:border-[#f4c35a]/80 group-hover:bg-[#f4c35a]/10">
                    <span className="h-14 w-14 text-[#e5ad3b] transition-transform duration-300 group-hover:scale-110">
                      <SportMark name={sport} />
                    </span>
                  </div>
                  <span className="text-center text-[9px] font-black uppercase tracking-[0.18em] text-foreground/50 transition-colors group-hover:text-[#f4c35a]">
                    {sport}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-landing-footer-bg border-t border-landing-footer-border px-5 py-14 sm:px-8 transition-colors duration-300">
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-landing-footer-border pb-12 md:grid-cols-3 md:items-start">
          <div>
            <Logo compact />
            <p className="mt-4 max-w-sm text-sm leading-6 text-foreground/50">
              The official public sports experience for MSU Invicta.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.24em] text-foreground">Quick Links</h3>
            <div className="mt-5 flex flex-col gap-3 text-sm text-foreground/60">
              <Link href="/public-dashboard" className="hover:text-[#f4c35a]">Public Dashboard</Link>
              <Link href="/sports" className="hover:text-[#f4c35a]">Sports</Link>
              <Link href="/matches" className="hover:text-[#f4c35a]">Live Matches</Link>
              <Link href="/about" className="hover:text-[#f4c35a]">About Us</Link>
            </div>
          </div>

          <div className="md:text-right">
            <h3 className="text-xs font-black uppercase tracking-[0.24em] text-foreground">Contact</h3>
            <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-[#f4c35a]">
              <Mail size={15} />
              Contact the Invicta team
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-7xl flex-col justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/35 sm:flex-row">
          <span>© 2026 Invicta. All rights reserved.</span>
          <span className="text-accent/50 font-black">POWERED BY SoCSE</span>
          <span>Medhavi Skills University</span>
        </div>
      </footer>
    </div>
  );
}
