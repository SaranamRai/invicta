import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { LiveScoreFloatingButton } from "@/components/layout/live-score-floating-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";
import { MedhaviLogo } from "@/components/medhavi-logo";
import { SportMark } from "@/components/sport-mark";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

const primaryActions = [
  { label: "View Matches", href: "/matches", summary: "Upcoming and live fixtures" },
  { label: "View Standings", href: "/standings", summary: "See league tables and rankings" },
  { label: "Explore Sports", href: "/sports", summary: "Browse games, teams and categories" },
  { label: "Register Team", href: "/public-register", summary: "Join the tournament" },
];

const overviewCards = [
  { label: "Tournament status", value: "Open for participation", hint: "Check the latest updates and registration details" },
  { label: "Upcoming fixtures", value: "Live schedule", hint: "Track match dates, venues and match status" },
  { label: "Standings", value: "Updated results", hint: "Monitor team performance across sports" },
  { label: "Support", value: "Staff access", hint: "Login for volunteers and coordinators" },
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
      <header className="fixed inset-x-0 top-0 z-40 px-2 pt-2 sm:px-5 sm:pt-5">
        <div className="landing-navbar mx-auto flex max-w-[1400px] flex-col items-stretch justify-between gap-2 rounded-[22px] border border-[#e4dccd] bg-[#f4f1ee]/80 px-2 py-2 shadow-[0_12px_26px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:gap-5 lg:px-5 lg:flex-nowrap">
          <Link href="/" aria-label="MSU Invicta home" className="flex min-w-0 items-center justify-center gap-3 sm:justify-start">
            <MedhaviLogo className="h-10 w-28 sm:h-12 sm:w-36 lg:h-16 lg:w-52" />
            <InvictaLogo className="h-9 w-28 sm:h-10 sm:w-32 lg:h-12 lg:w-48" />
          </Link>

          <nav className="order-3 flex w-full items-center justify-center gap-1 overflow-x-auto rounded-full border border-[#d8d2ca] bg-white/15 p-1 sm:gap-2 lg:order-none lg:w-auto lg:overflow-visible">
            {navLinks.map((link, index) => (
              <Link
                key={link.label}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-2 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition-all hover:bg-[#f4d27b]/20 hover:text-[#d99d2b] sm:px-3 sm:text-[10px] lg:px-4 lg:text-[11px] ${index === 0 ? "bg-[#f2c66b] text-[#141414] shadow-sm" : "text-[#1b1b1b]/75"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center justify-center gap-2 sm:gap-3 lg:justify-end">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="relative isolate overflow-hidden pt-28 pb-10 sm:pt-32 lg:pt-36">
          <div className="landing-hero-shell relative mx-auto max-w-[1400px] overflow-hidden rounded-[28px] border border-[#ede2d0] bg-[#f6f1ea] px-3 pb-8 pt-6 shadow-[0_18px_38px_rgba(15,23,42,0.06)] sm:px-6 sm:pb-10 lg:px-10 lg:pt-8 xl:px-12">
            <div className="landing-hero-light absolute inset-0" />
            <div className="landing-hero-photo absolute inset-0">
              <div className="landing-hero-image absolute inset-0" />
              <div className="landing-hero-overlay absolute inset-0" />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#07111f] via-[#07111f]/55 to-transparent" />
            <div className="relative z-10 mx-auto max-w-[1280px] px-2 pb-2 pt-4 sm:px-4 lg:pb-6">
              <div className="flex flex-col gap-3 lg:gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.42em] text-[#f7d77a] sm:text-xs lg:text-sm">
                  Invicta | Sports Tournament Management Platform
                </p>

                <div className="max-w-[1050px]">
                  <h1 className="landing-display text-[2.3rem] font-black leading-[0.82] tracking-[-0.045em] text-[#07111f] drop-shadow-[0_10px_22px_rgba(0,0,0,0.38)] sm:text-[4.8rem] lg:text-[9rem]">
                    <span className="landing-building-word block">BUILDING</span>
                    <span className="landing-gold-text block">CHAMPIONS</span>
                  </h1>
                </div>

                <p className="max-w-[900px] text-[8px] font-black uppercase leading-[1.8] tracking-[0.18em] text-[#e2e8f0] drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)] sm:text-[10px] lg:text-[13px]">
                  Follow live scores, explore sports, register teams,
                  <br className="hidden sm:block" />
                  and track tournament progress in one simple place.
                </p>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Link
                    href="/matches"
                    className="landing-slant group inline-flex w-full items-center justify-center gap-3 bg-[#e5ad3b] px-5 py-3 text-[9px] font-black uppercase tracking-[0.24em] text-black shadow-[0_12px_22px_rgba(229,173,59,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#f0bf59] sm:w-auto sm:px-6 sm:py-4 sm:text-xs"
                  >
                    Explore Now
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-4 pt-2 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm shadow-black/5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
                <h3 className="mt-3 text-2xl font-black text-foreground">{card.value}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 pb-8 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
            {primaryActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-accent hover:bg-accent/5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-foreground">{action.label}</p>
                  <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{action.summary}</p>
              </Link>
            ))}
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
