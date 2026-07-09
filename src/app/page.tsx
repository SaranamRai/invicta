import Link from "next/link";
import { ArrowRight, Camera, Mail, Phone, PlayCircle, Share2 } from "lucide-react";
import { LiveScoreFloatingButton } from "@/components/layout/live-score-floating-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";
import { MedhaviLogo } from "@/components/medhavi-logo";
import { SportMark } from "@/components/sport-mark";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "About Us", href: "/about" },
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
      <aside className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
        <div className="flex flex-col items-center gap-4 rounded-l-2xl border border-r-0 border-border bg-background/80 px-3 py-5 shadow-xl backdrop-blur">
          <span className="writing-mode-vertical text-[9px] font-black uppercase tracking-[0.24em] text-foreground/45 [writing-mode:vertical-rl]">
            Follow Us
          </span>
          <span className="h-8 w-px bg-border" />
          {[
            { label: "Instagram", href: "https://www.instagram.com/", icon: Camera },
            { label: "Facebook", href: "https://www.facebook.com/", icon: Share2 },
            { label: "YouTube", href: "https://www.youtube.com/", icon: PlayCircle },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              aria-label={item.label}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-foreground/60 transition-colors hover:border-[#f4c35a] hover:text-[#f4c35a]"
            >
              <item.icon size={16} />
            </a>
          ))}
        </div>
      </aside>
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" aria-label="MSU Invicta home" className="flex items-center gap-4">
            <MedhaviLogo className="h-16 w-44 sm:h-20 sm:w-56" />
            <InvictaLogo className="h-12 w-40 sm:h-14 sm:w-52" />
          </Link>

          <nav className="flex items-center gap-4 sm:gap-8">
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                className={`relative whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:text-[#f4c35a] sm:text-xs sm:tracking-[0.24em] ${index === 0 ? "text-[#f4c35a]" : "text-foreground/80"}`}
              >
                {link.label}
                {index === 0 && <span className="absolute -bottom-2 left-1/2 h-px w-6 -translate-x-1/2 bg-[#f4c35a]" />}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="relative flex min-h-screen items-center overflow-hidden pb-16 pt-32 sm:pt-28">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_34%,rgba(229,173,59,0.18),transparent_34%),linear-gradient(120deg,var(--landing-overlay-98)_0%,var(--landing-overlay-90)_48%,var(--landing-overlay-photo)_100%)]" />
          <div className="landing-hero-photo absolute inset-y-6 right-[-30%] w-[128%] sm:inset-y-8 sm:right-[-18%] sm:w-[88%] lg:right-[-7%] lg:w-[68%]">
            <div className="h-full w-full bg-[url('/landingpage.jpeg')] bg-contain bg-center bg-no-repeat" />
            <div className="absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-[var(--landing-photo-fade-solid)] via-[var(--landing-photo-fade-mid)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--landing-overlay-bottom)] to-transparent" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--landing-overlay-98)_0%,var(--landing-overlay-90)_38%,var(--landing-overlay-48)_68%,var(--landing-overlay-42)_100%)]" />
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
