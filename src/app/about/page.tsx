"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Share2, Video } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveSportsPanel } from "@/components/live-sports-panel";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "Sports", href: "/#sports" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`landing-display font-black italic tracking-tight ${compact ? "text-2xl" : "text-3xl"}`}>
      IN<span className="landing-gold-text">VICTA</span>
    </span>
  );
}

function MemberAvatar({ src, name }: { src?: string; name: string }) {
  const [hasError, setHasError] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={name}
        className="h-full w-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#f4c35a]/20 to-[#ad6c18]/20 text-[#f4c35a] font-black text-2xl uppercase tracking-wider">
      {initials}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="landing-page min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <LiveSportsPanel />
      
      {/* Header */}
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
                className={`relative text-xs font-bold uppercase tracking-[0.24em] transition-colors hover:text-[#f4c35a] ${index === 2 ? "text-[#f4c35a]" : "text-foreground/80"}`}
              >
                {link.label}
                {index === 2 && <span className="absolute -bottom-2 left-1/2 h-px w-6 -translate-x-1/2 bg-[#f4c35a]" />}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a
              href="/#contact"
              className="landing-slant hidden items-center gap-2 border border-[#f4c35a]/50 px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#f4c35a] transition-colors hover:bg-[#f4c35a] hover:text-black md:inline-flex"
            >
              Get In Touch <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </header>

      {/* Sidebar Social Links */}
      <aside className="fixed right-0 top-1/3 z-30 hidden flex-col items-center gap-4 rounded-l-md border border-r-0 border-border bg-landing-sidebar-bg px-3 py-5 backdrop-blur lg:flex">
        <span className="rotate-180 text-[9px] font-bold tracking-[0.35em] text-foreground/50 [writing-mode:vertical-rl]">
          FOLLOW US
        </span>
        <Share2 className="h-4 w-4 text-foreground/50 transition-colors hover:text-[#f4c35a]" />
        <MessageCircle className="h-4 w-4 text-foreground/50 transition-colors hover:text-[#f4c35a]" />
        <Video className="h-4 w-4 text-foreground/50 transition-colors hover:text-[#f4c35a]" />
      </aside>

      <main className="pt-28 pb-16">
        <section id="about" className="px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Title Block */}
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#f4c35a]">About Us</p>
              <h1 className="landing-display mt-3 text-4xl font-black uppercase tracking-[0.1em] sm:text-5xl">
                Building the Future of Sports Management Through Technology
              </h1>
              <div className="mx-auto mt-6 h-1 w-12 bg-[#f4c35a]" />
              <p className="mt-8 text-sm font-semibold leading-relaxed text-foreground/70 sm:text-base">
                INVICTA is a modern Sport Management Web Application designed to streamline sports event organization, athlete management, team coordination, and performance tracking. This project was developed by a dedicated team of students from the <span className="text-foreground font-extrabold">School of Computer Science and Engineering (SoCSE)</span> with the goal of creating a user-friendly and efficient platform for the sports community.
              </p>
              <p className="mt-4 text-sm font-semibold leading-relaxed text-foreground/70 sm:text-base">
                Our team combined expertise in frontend development, backend development, and UI/UX design to transform the idea of a digital sports management solution into a functional and scalable web application.
              </p>
            </div>

            {/* Team Members Grid */}
            <div className="mt-20">
              <h3 className="text-center text-xs font-black uppercase tracking-[0.3em] text-[#f4c35a] mb-12">Meet Our Team</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Angel Thami */}
                <div className="group rounded-2xl border border-border bg-card/60 p-6 flex flex-col items-center text-center transition-all duration-300 hover:border-accent hover:shadow-xl hover:scale-[1.02]">
                  <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-border/80 group-hover:border-accent transition-colors shadow-lg">
                    <MemberAvatar src="/angel%20atamp.jpeg" name="Angel Thami" />
                  </div>
                  <h4 className="sport-heading mt-6 text-xl font-black text-foreground">Angel Thami</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#f4c35a] mt-1.5">Frontend Developer</p>
                  <p className="mt-4 text-xs font-semibold leading-relaxed text-foreground/60">
                    Responsible for designing and developing the user-facing components of INVICTA. Focused on creating an intuitive, responsive, and engaging user experience while ensuring seamless interaction between users and the platform.
                  </p>
                </div>

                {/* Saranam Rai */}
                <div className="group rounded-2xl border border-border bg-card/60 p-6 flex flex-col items-center text-center transition-all duration-300 hover:border-accent hover:shadow-xl hover:scale-[1.02]">
                  <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-border/80 group-hover:border-accent transition-colors shadow-lg">
                    <MemberAvatar src="/saranam%20stamp.jpeg" name="Saranam Rai" />
                  </div>
                  <h4 className="sport-heading mt-6 text-xl font-black text-foreground">Saranam Rai</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#f4c35a] mt-1.5">Backend Developer</p>
                  <p className="mt-4 text-xs font-semibold leading-relaxed text-foreground/60">
                    Developed and managed the server-side architecture, database connectivity, authentication systems, and core application logic. Ensured secure and efficient data processing throughout the platform.
                  </p>
                </div>

                {/* Rinchen Sherpa */}
                <div className="group rounded-2xl border border-border bg-card/60 p-6 flex flex-col items-center text-center transition-all duration-300 hover:border-accent hover:shadow-xl hover:scale-[1.02]">
                  <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-border/80 group-hover:border-accent transition-colors shadow-lg">
                    <MemberAvatar src="/rinchen%20stamp.jpeg" name="Rinchen Sherpa" />
                  </div>
                  <h4 className="sport-heading mt-6 text-xl font-black text-foreground">Rinchen Sherpa</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#f4c35a] mt-1.5">UI/UX Designer</p>
                  <p className="mt-4 text-xs font-semibold leading-relaxed text-foreground/60">
                    Designed the visual identity, user interface layouts, and user experience flow of the application. Focused on creating a clean, modern, and accessible design that enhances usability across devices.
                  </p>
                </div>

                {/* Sachin Kumar Sharma */}
                <div className="group rounded-2xl border border-border bg-card/60 p-6 flex flex-col items-center text-center transition-all duration-300 hover:border-accent hover:shadow-xl hover:scale-[1.02]">
                  <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-border/80 group-hover:border-accent transition-colors shadow-lg">
                    <MemberAvatar name="Sachin Kumar Sharma" />
                  </div>
                  <h4 className="sport-heading mt-6 text-xl font-black text-foreground">Sachin Kumar Sharma</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#f4c35a] mt-1.5">Full Stack Developer</p>
                  <p className="mt-4 text-xs font-semibold leading-relaxed text-foreground/60">
                    Developed API integrations, database schemas, and administrative control flows. Focused on bridging frontend interactive state with backend services to build a cohesive and highly performant platform.
                  </p>
                </div>
              </div>
            </div>

            {/* Our Contribution */}
            <div className="mt-24 border-t border-border pt-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f4c35a]">Our Contribution</p>
                <h3 className="landing-display mt-3 text-2xl font-black uppercase tracking-wide text-foreground">
                  SoCSE Collaboration
                </h3>
                <p className="mt-5 text-sm font-semibold leading-relaxed text-foreground/60">
                  As students of the <span className="text-foreground font-extrabold">School of Computer Science and Engineering (SoCSE)</span>, we collaborated to apply our academic knowledge and technical skills to a real-world project. Through teamwork, innovation, and problem-solving, we developed INVICTA to address the challenges faced in sports event and athlete management.
                </p>
                <p className="mt-4 text-sm font-semibold leading-relaxed text-foreground/60">
                  This project reflects our passion for technology, software development, and creating solutions that can make sports administration more efficient and accessible.
                </p>
              </div>

              {/* Our Mission */}
              <div className="bg-secondary/40 border border-border p-8 rounded-2xl relative">
                <p className="text-[9px] font-black uppercase tracking-widest text-accent mb-4">Our Mission</p>
                <blockquote className="text-base font-bold italic leading-relaxed text-foreground/80 pl-4 border-l-2 border-accent">
                  "INVICTA was created with a shared vision—to simplify sports management and create a platform where athletes and organizers can connect seamlessly. This project reflects our learning, teamwork, and passion for building impactful solutions through technology."
                </blockquote>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
