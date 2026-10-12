import { HelpCircle, Mail, MapPin, Phone } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function ContactPage() {
  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-8">
        <h1 className="sport-heading text-5xl font-black tracking-tighter text-primary">Contact and Help</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
          Need help with fixtures, team information, live scores, or event updates? Use these contact points during MSU Invicta.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={HelpCircle} title="Event Help Desk" text="For schedule, venue, and match-day questions." />
        <InfoCard icon={Mail} title="Contact Email" text="contact@invicta-sports.com" href="mailto:contact@invicta-sports.com" />
        <InfoCard icon={Phone} title="Contact Phone" text="+91 XXXXXXXXXX" href="tel:+91XXXXXXXXXX" />
        <InfoCard icon={MapPin} title="Venue Support" text="Report urgent ground or equipment issues to a volunteer or coordinator." />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, text, href }: { icon: React.ElementType; title: string; text: string; href?: string }) {
  const content = (
    <>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <Icon size={24} />
      </div>
      <h2 className="text-lg font-black text-foreground">{title}</h2>
      <p className="mt-2 break-words text-sm font-medium leading-relaxed text-muted-foreground">{text}</p>
    </>
  );

  if (href) {
    return (
      <a href={href} className="block rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-accent">
        {content}
      </a>
    );
  }

  return (
    <Card className="p-6">
      {content}
    </Card>
  );
}
