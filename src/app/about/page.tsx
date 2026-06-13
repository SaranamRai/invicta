"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Phone, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/#contact" },
];

const teamMembers = [
  {
    name: "Rinchen Sherpa",
    role: "UI/UX Designer",
    image: "/rinn.png",
    imageClassName: "object-[center_44%]",
    skills: ["Visual Identity", "UI Layouts", "User Experience"],
    details:
      "Designed the visual identity, user interface layouts, and user experience flow of the application. Focused on creating a clean, modern, and accessible design that enhances usability across devices.",
  },
  {
    name: "Saranam Rai",
    role: "Backend Developer",
    image: "/saru.png",
    imageClassName: "object-[center_42%]",
    skills: ["Backend Architecture", "Database", "Authentication"],
    details:
      "Developed and managed the server-side architecture, database connectivity, authentication systems, and core application logic. Ensured secure and efficient data processing throughout the platform.",
  },
  {
    name: "Angel Thami",
    role: "Frontend Developer",
    image: "/angel%20stamp.jpeg",
    skills: ["Frontend Components", "Responsive UI", "User Interaction"],
    details:
      "Responsible for designing and developing the user-facing components of INVICTA. Focused on creating an intuitive, responsive, and engaging user experience while ensuring seamless interaction between users and the platform.",
  },
  {
    name: "Sachin Kumar Sharma",
    role: "Mentor",
    image: "/sachin%20sir%20stamp.jpeg",
    skills: ["Mentorship", "Project Guidance", "Product Direction"],
    details:
      "Mentored and guided us throughout the development of the INVICTA project, helping us transform our ideas into a practical sports management platform.",
  },
];

function MemberAvatar({ src, name, imageClassName = "object-center" }: { src?: string; name: string; imageClassName?: string }) {
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
        className={`h-full w-full object-cover ${imageClassName}`}
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
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const profileRef = useRef<HTMLDivElement | null>(null);

  const selectedMemberData = teamMembers.find((member) => member.name === selectedMember) || null;

  const openMember = (name: string) => {
    setSelectedMember(name);
  };

  const closeProfile = () => {
    const previouslySelected = selectedMember;
    setSelectedMember(null);
    window.setTimeout(() => {
      if (previouslySelected) cardRefs.current[previouslySelected]?.focus();
    }, 80);
  };

  useEffect(() => {
    if (!selectedMember) return;

    profileRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProfile();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMember]);

  return (
    <div className="landing-page min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-5 py-5 sm:justify-between sm:px-8 lg:px-10">
          <Link href="/" aria-label="Invicta home">
            <InvictaLogo className="h-12 w-44 sm:h-14 sm:w-56" />
          </Link>

          <nav className="flex items-center gap-4 sm:gap-8">
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                className={`relative whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:text-[#f4c35a] sm:text-xs sm:tracking-[0.24em] ${index === 1 ? "text-[#f4c35a]" : "text-foreground/80"}`}
              >
                {link.label}
                {index === 1 && <span className="absolute -bottom-2 left-1/2 h-px w-6 -translate-x-1/2 bg-[#f4c35a]" />}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

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
              <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
                <a
                  href="mailto:msuinvicta2026@gmail.com"
                  className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-4 text-sm font-black text-foreground transition-colors hover:border-[#f4c35a] hover:text-[#f4c35a]"
                >
                  <Mail size={18} />
                  msuinvicta2026@gmail.com
                </a>
                <a
                  href="tel:9883924453"
                  className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-4 text-sm font-black text-foreground transition-colors hover:border-[#f4c35a] hover:text-[#f4c35a]"
                >
                  <Phone size={18} />
                  9883924453
                </a>
              </div>
            </div>

            {/* Team Members Grid */}
            <div className="relative mt-20">
              <h3 className="text-center text-xs font-black uppercase tracking-[0.3em] text-[#f4c35a] mb-12">Meet Our Team</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {teamMembers.map((member) => {
                  const isSelected = selectedMember === member.name;
                  const hasSelection = selectedMember !== null;

                  return (
                    <motion.button
                      key={member.name}
                      ref={(node) => {
                        cardRefs.current[member.name] = node;
                      }}
                      type="button"
                      layoutId={`member-card-${member.name}`}
                      aria-expanded={isSelected}
                      aria-label={`Open profile for ${member.name}`}
                      disabled={hasSelection && !isSelected}
                      onClick={() => openMember(member.name)}
                      whileHover={hasSelection ? undefined : { y: -8, scale: 1.025 }}
                      whileTap={hasSelection ? undefined : { scale: 0.985 }}
                      transition={{ type: "spring", stiffness: 120, damping: 24, mass: 0.9 }}
                      className={`group relative flex min-h-[17rem] cursor-pointer flex-col items-center rounded-2xl border bg-card/60 p-6 text-center outline-none transition-[filter,opacity,border-color,box-shadow] duration-500 ease-out focus-visible:ring-2 focus-visible:ring-[#f4c35a] ${
                        isSelected ? "border-accent shadow-2xl shadow-[#f4c35a]/15" : "border-border hover:border-accent hover:shadow-xl"
                      } ${hasSelection && !isSelected ? "pointer-events-none opacity-50 blur-[2px]" : "opacity-100 blur-0"}`}
                    >
                      <motion.div
                        layoutId={`member-photo-${member.name}`}
                        className="h-28 w-28 overflow-hidden rounded-full border-4 border-border/80 shadow-lg transition-colors duration-500 group-hover:border-accent sm:h-32 sm:w-32"
                      >
                        <MemberAvatar src={member.image} name={member.name} imageClassName={member.imageClassName} />
                      </motion.div>
                      <h4 className="mt-5 text-xl font-black text-foreground">{member.name}</h4>
                      <p className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-[#f4c35a]">{member.role}</p>
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {selectedMemberData && (
                  <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/45 px-4 py-8 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    onClick={closeProfile}
                  >
                    <motion.div
                      ref={profileRef}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="team-profile-name"
                      tabIndex={-1}
                      layoutId={`member-card-${selectedMemberData.name}`}
                      initial={{ opacity: 0, scale: 0.92, y: 24 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: 16 }}
                      transition={{ type: "spring", stiffness: 105, damping: 26, mass: 1 }}
                      onClick={(event) => event.stopPropagation()}
                      className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-card/85 p-5 text-left shadow-2xl shadow-black/30 outline-none backdrop-blur-xl sm:p-7"
                    >
                      <button
                        type="button"
                        aria-label={`Close profile for ${selectedMemberData.name}`}
                        onClick={closeProfile}
                        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        <X size={17} />
                      </button>

                      <div className="grid gap-6 md:grid-cols-[15rem_1fr] md:items-center">
                        <motion.div
                          layoutId={`member-photo-${selectedMemberData.name}`}
                          className="mx-auto h-56 w-56 overflow-hidden rounded-3xl border-4 border-accent/70 bg-background shadow-2xl shadow-[#f4c35a]/10 md:mx-0"
                        >
                          <MemberAvatar
                            src={selectedMemberData.image}
                            name={selectedMemberData.name}
                            imageClassName={selectedMemberData.imageClassName}
                          />
                        </motion.div>

                        <div className="min-w-0 pr-0 sm:pr-8">
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f4c35a]">
                            {selectedMemberData.role}
                          </p>
                          <h4 id="team-profile-name" className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
                            {selectedMemberData.name}
                          </h4>
                          <p className="mt-4 text-sm font-semibold leading-relaxed text-foreground/70 sm:text-base">
                            {selectedMemberData.details}
                          </p>

                          <div className="mt-6">
                            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                              Contributions
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedMemberData.skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Our Contribution */}
            <div className="mt-24 border-t border-border pt-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#f4c35a]">Our Contribution</p>
                <h3 className="landing-display mt-3 text-2xl font-black tracking-wide text-foreground">
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
            <a href="tel:9883924453" className="inline-flex items-center gap-2 hover:text-[#f4c35a]">
              <Phone size={15} />
              9883924453
            </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-7xl flex-col justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/35 sm:flex-row">
          <span>© 2026 Invicta. All rights reserved.</span>
          <span className="text-accent/50 font-black normal-case">Managed & Powered by SoCSE</span>
          <span>Medhavi Skills University</span>
        </div>
      </footer>
    </div>
  );
}
