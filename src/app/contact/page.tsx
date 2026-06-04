import { HelpCircle, Mail, MapPin } from "lucide-react";

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

      <div className="grid gap-5 md:grid-cols-3">
        <InfoCard icon={HelpCircle} title="Event Help Desk" text="For schedule, venue, and match-day questions." />
        <InfoCard icon={Mail} title="Official Updates" text="Check Announcements for verified notices before contacting organizers." />
        <InfoCard icon={MapPin} title="Venue Support" text="Report urgent ground or equipment issues to a volunteer or coordinator." />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <Icon size={24} />
      </div>
      <h2 className="text-lg font-black text-foreground">{title}</h2>
      <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{text}</p>
    </Card>
  );
}
