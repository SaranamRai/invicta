import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { LiveScoreFloatingButton } from "@/components/layout/live-score-floating-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";
import { MedhaviLogo } from "@/components/medhavi-logo";
import { SportMark } from "@/components/sport-mark";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "Sports", href: "/#sports" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

const sports = [
  "Cricket",
  "Badminton",
  "Football",
  "Volleyball",
  "Arm Wrestling",
  "Table Tennis",
  "Chess",
];

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="landing-navbar mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-background/72 px-3 py-3 shadow-2xl shadow-black/10 backdrop-blur-2xl sm:gap-5 sm:px-5 lg:flex-nowrap">
          <Link href="/" aria-label="MSU Invicta home" className="flex min-w-0 items-center gap-3">
            <MedhaviLogo className="h-12 w-36 sm:h-14 sm:w-44 lg:h-16 lg:w-52" />
            <InvictaLogo className="h-10 w-32 sm:h-11 sm:w-40 lg:h-12 lg:w-48" />
          </Link>

          <nav className="order-3 flex w-full items-center justify-center gap-1 rounded-xl border border-border/70 bg-card/55 p-1 sm:gap-2 lg:order-none lg:w-auto">
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:bg-accent/15 hover:text-[#d99d2b] sm:px-4 sm:text-[11px] ${index === 0 ? "bg-accent text-accent-foreground shadow-sm" : "text-foreground/72"}`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="relative isolate flex min-h-screen items-center overflow-hidden pb-16 pt-40 sm:pt-36 lg:pt-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_34%,rgba(229,173,59,0.22),transparent_34%),linear-gradient(120deg,var(--landing-overlay-98)_0%,var(--landing-overlay-90)_45%,var(--landing-overlay-photo)_100%)]" />
          <div className="landing-hero-photo absolute inset-0">
            <div className="landing-hero-image absolute inset-0" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--landing-photo-fade-solid)_0%,var(--landing-photo-fade-mid)_36%,transparent_72%)]" />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[var(--landing-overlay-bottom)] via-[var(--landing-overlay-bottom-soft)] to-transparent" />
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[var(--landing-overlay-top)] to-transparent" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--landing-overlay-98)_0%,var(--landing-overlay-90)_35%,var(--landing-overlay-48)_64%,var(--landing-overlay-42)_100%)]" />
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

            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
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
            <InvictaLogo className="h-14 w-52" />
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
            <div className="mt-5 flex flex-col gap-3 text-sm text-foreground/60 md:items-end">
              <a href="mailto:msuinvicta2026@gmail.com" className="inline-flex items-center gap-2 hover:text-[#f4c35a]">
                <Mail size={15} />
                msuinvicta2026@gmail.com
              </a>
              <a href="tel:+919883924453" className="inline-flex items-center gap-2 hover:text-[#f4c35a]">
                <Phone size={15} />
                +91 9883924453
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-7xl flex-col justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/35 sm:flex-row">
          <span>© 2026 Invicta. All rights reserved.</span>
          <span className="text-sm font-black text-foreground/75 normal-case sm:text-base">Managed & Powered by SoCSE</span>
          <span>Medhavi Skills University</span>
        </div>
      </footer>
      <LiveScoreFloatingButton />
    </div>
  );
}
