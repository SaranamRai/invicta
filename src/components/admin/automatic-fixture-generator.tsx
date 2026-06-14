"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Download, Loader2, MapPin, Radio, Trophy, Wand2 } from "lucide-react";
import {
  AdminFixturePayload,
  generateAdminFixtures,
  getAdminSports,
  getAdminTournaments,
  getAdminVenues,
  MongoSport,
  TournamentPayload,
  VenuePayload,
} from "@/lib/api";

interface AutomaticFixtureGeneratorProps {
  fixtures: AdminFixturePayload[];
  onGenerated: (fixtures: AdminFixturePayload[]) => void;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSportLabel(sport: MongoSport) {
  return sport.sportName || sport.name || "Unnamed Sport";
}

function getTournamentId(tournament: Partial<TournamentPayload>) {
  return tournament._id || tournament.id || "";
}

function getVenueId(venue: Partial<VenuePayload>) {
  return venue._id || venue.id || "";
}

function getTodayInputValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function getSportKey(fixture: AdminFixturePayload) {
  return fixture.sportId || fixture.sportName || fixture.sport || "sport";
}

function getSportNameFromFixture(fixture: AdminFixturePayload) {
  return fixture.sportName || fixture.sport || "Sport";
}

function getFixtureCategories(sport: MongoSport): ("Male" | "Female")[] {
  const categories = (sport.categories || []).filter((item): item is "Male" | "Female" => item === "Male" || item === "Female");
  return categories.length ? categories : ["Male", "Female"];
}

function getDownloadFileName(sportName: string) {
  const slug = sportName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "sport";
  return `invicta-${slug}-fixture-flowchart.doc`;
}

function buildFlowchartDocument(sportName: string, fixtures: AdminFixturePayload[]) {
  const sortedFixtures = [...fixtures].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const rows = sortedFixtures.map((fixture, index) => {
    const teamA = escapeHtml(fixture.teamAName || fixture.teamA || "Team A");
    const teamB = escapeHtml(fixture.teamBName || fixture.teamB || "Team B");
    const venue = escapeHtml(fixture.venue || "Venue TBD");
    const date = escapeHtml(fixture.date || "Date TBD");
    const time = escapeHtml(fixture.time || "Time TBD");
    const category = escapeHtml(fixture.category || "Category");
    const tournament = escapeHtml(fixture.tournamentName || "INVICTA");

    return `
      <tr>
        <td class="step">${index + 1}</td>
        <td>
          <div class="match-card">
            <div class="meta">${tournament} | ${category} | ${date} at ${time} | ${venue}</div>
            <div class="title">${teamA} vs ${teamB}</div>
          </div>
          ${index < sortedFixtures.length - 1 ? '<div class="connector">then</div>' : ""}
        </td>
      </tr>
    `;
  }).join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { color: #020617; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
          .subtitle { color: #64748b; margin-bottom: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 8px; }
          .step {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #facc15;
            color: #020617;
            text-align: center;
            font-weight: bold;
            font-size: 18px;
          }
          .match-card {
            border: 2px solid #e2e8f0;
            border-left: 8px solid #facc15;
            border-radius: 10px;
            padding: 14px 16px;
            background: #f8fafc;
          }
          .meta { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; }
          .title { margin-top: 6px; font-size: 18px; font-weight: bold; color: #020617; }
          .connector { margin: 8px 0 0 18px; color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(sportName)} Fixture Flowchart</h1>
        <div class="subtitle">INVICTA generated weekend schedule. Total matches: ${sortedFixtures.length}.</div>
        <table>${rows}</table>
      </body>
    </html>
  `;
}

function downloadFlowchart(sportName: string, fixtures: AdminFixturePayload[]) {
  const html = buildFlowchartDocument(sportName, fixtures);
  const blob = new Blob([html], { type: "application/msword" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getDownloadFileName(sportName);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function AutomaticFixtureGenerator({ fixtures, onGenerated }: AutomaticFixtureGeneratorProps) {
  const [sports, setSports] = useState<MongoSport[]>([]);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [venues, setVenues] = useState<VenuePayload[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [tournamentId, setTournamentId] = useState("");
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [categoriesBySport, setCategoriesBySport] = useState<Record<string, ("Male" | "Female")[]>>({});
  const [venueId, setVenueId] = useState("");
  const [startDate, setStartDate] = useState(getTodayInputValue());
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [dayEndTime, setDayEndTime] = useState("17:00");
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(45);
  const [gapMinutes, setGapMinutes] = useState(15);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [nextSports, nextTournaments, nextVenues] = await Promise.all([
          getAdminSports(),
          getAdminTournaments(),
          getAdminVenues(),
        ]);

        if (!isMounted) return;

        setSports(nextSports);
        setTournaments(nextTournaments);
        setVenues(nextVenues);
        setSelectedSportIds(nextSports[0]?._id ? [nextSports[0]._id] : []);
        setCategoriesBySport(Object.fromEntries(nextSports.map((sport) => [sport._id, getFixtureCategories(sport)])));
        setTournamentId(getTournamentId(nextTournaments[0] || {}));
        setVenueId(getVenueId(nextVenues[0] || {}));
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Could not load fixture setup data.");
      } finally {
        if (isMounted) setLoadingOptions(false);
      }
    }

    void loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedSports = useMemo(() => sports.filter((sport) => selectedSportIds.includes(sport._id)), [sports, selectedSportIds]);
  const selectedVenue = useMemo(() => venues.find((venue) => getVenueId(venue) === venueId), [venues, venueId]);
  const fixturesBySport = useMemo(() => {
    const groups = new Map<string, { sportName: string; fixtures: AdminFixturePayload[] }>();
    fixtures.forEach((fixture) => {
      const key = getSportKey(fixture);
      const sportName = getSportNameFromFixture(fixture);
      const group = groups.get(key) || { sportName, fixtures: [] };
      group.fixtures.push(fixture);
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) => a.sportName.localeCompare(b.sportName));
  }, [fixtures]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const generationTargets = selectedSportIds.flatMap((nextSportId) =>
      (categoriesBySport[nextSportId] || []).map((nextCategory) => ({
        sportId: nextSportId,
        category: nextCategory,
      }))
    );

    if (!tournamentId || generationTargets.length === 0 || !venueId) {
      setError("Please select tournament, at least one sport/category, and venue before generating fixtures.");
      return;
    }

    setSaving(true);
    try {
      const results = [];
      for (const target of generationTargets) {
        const result = await generateAdminFixtures({
          tournamentId,
          sportId: target.sportId,
          category: target.category,
          venueId,
          venue: selectedVenue?.name || "",
          startDate,
          dayStartTime,
          dayEndTime,
          matchDurationMinutes,
          gapMinutes,
        });
        results.push(result);
      }
      const totalMatches = results.reduce((sum, result) => sum + (result.totalMatches || 0), 0);
      setMessage(`Generated ${totalMatches} fixtures across ${generationTargets.length} sport/category selections.`);
      onGenerated(results.flatMap((result) => result.fixtures));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fixture generation failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
          <Wand2 size={13} />
          Weekend Round Robin
        </span>
        <div>
          <h2 className="sport-heading text-2xl font-black text-foreground">Generate Fixtures</h2>
          <p className="max-w-3xl text-sm font-medium leading-relaxed text-muted-foreground">
            Generate approved-team round-robin fixtures for multiple sports and categories. The backend validates weekends, team clashes, department clashes, venue clashes, and volunteer assignment clashes before saving.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        {loadingOptions ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm font-bold text-muted-foreground">
            <Loader2 className="animate-spin text-accent" size={20} />
            Loading tournaments, sports, and venues...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <Trophy size={13} /> Tournament
                </span>
                <select
                  value={tournamentId}
                  onChange={(event) => setTournamentId(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
                >
                  <option value="">Select tournament...</option>
                  {tournaments.map((tournament) => (
                    <option key={getTournamentId(tournament)} value={getTournamentId(tournament)}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <MapPin size={13} /> Venue
                </span>
                <select
                  value={venueId}
                  onChange={(event) => setVenueId(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
                >
                  <option value="">Select venue...</option>
                  {venues.map((venue) => (
                    <option key={getVenueId(venue)} value={getVenueId(venue)}>
                      {venue.name}{venue.location ? ` / ${venue.location}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-3">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                <Radio size={13} /> Sports and Categories
              </span>
              {sports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm font-bold text-muted-foreground">
                  No active sports found. Add sports in Sports Setup first.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sports.map((sport) => {
                    const isSelected = selectedSportIds.includes(sport._id);
                    const selectedCategories = categoriesBySport[sport._id] || [];
                    const availableCategories = getFixtureCategories(sport);
                    return (
                    <label
                      key={sport._id}
                      className={`flex cursor-pointer flex-col items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-accent/50"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          value={sport._id}
                          checked={isSelected}
                          onChange={(event) => {
                            setSelectedSportIds((current) =>
                              event.target.checked
                                ? [...new Set([...current, sport._id])]
                                : current.filter((id) => id !== sport._id)
                            );
                          }}
                          className="h-4 w-4 accent-yellow-400"
                        />
                        <span className="text-sm font-black uppercase tracking-wide">{getSportLabel(sport)}</span>
                      </span>
                      <span className="flex flex-wrap gap-2 pl-7">
                        {availableCategories.map((option) => (
                          <span key={option} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(option)}
                              disabled={!isSelected}
                              onChange={(event) => {
                                setCategoriesBySport((current) => {
                                  const existing = current[sport._id] || [];
                                  return {
                                    ...current,
                                    [sport._id]: event.target.checked
                                      ? [...new Set([...existing, option])]
                                      : existing.filter((item) => item !== option),
                                  };
                                });
                              }}
                              className="accent-yellow-400 disabled:opacity-40"
                            />
                            {option}
                          </span>
                        ))}
                      </span>
                    </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <CalendarDays size={13} /> Start Date
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
                />
              </label>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <Clock size={13} /> Day Start
                </span>
                <input
                  type="time"
                  value={dayStartTime}
                  onChange={(event) => setDayStartTime(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
                />
              </label>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <Clock size={13} /> Day End
                </span>
                <input
                  type="time"
                  value={dayEndTime}
                  onChange={(event) => setDayEndTime(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Full Time</span>
                  <input
                    type="number"
                    min={1}
                    value={matchDurationMinutes}
                    onChange={(event) => setMatchDurationMinutes(Number(event.target.value))}
                    className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Gap After</span>
                  <input
                    type="number"
                    min={0}
                    value={gapMinutes}
                    onChange={(event) => setGapMinutes(Number(event.target.value))}
                    className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-xs font-semibold text-muted-foreground">
              {selectedSports.length > 0
                ? selectedSports.map((sport) => `${getSportLabel(sport)} (${(categoriesBySport[sport._id] || []).join(", ") || "no category"})`).join(" / ")
                : "Select sports and categories"}. Full time and gap after each match are saved with every fixture before the backend confirms every fixture fits Saturday or Sunday without clashes.
            </div>

            {(message || error) && (
              <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                error
                  ? "border-red-400/40 bg-red-500/10 text-red-500"
                  : "border-emerald-400/40 bg-emerald-500/10 text-emerald-500"
              }`}>
                {error || message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || sports.length === 0 || tournaments.length === 0 || venues.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-accent-foreground shadow-lg shadow-accent/15 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {saving ? "Generating..." : "Generate Fixtures"}
              </button>
            </div>
          </div>
        )}
      </form>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="sport-heading text-xl font-black text-foreground">Download Fixture Flowcharts</h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Download a separate flowchart document for each sport with saved fixtures.
            </p>
          </div>
        </div>

        {fixturesBySport.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm font-bold text-muted-foreground">
            Generate fixtures first. Sport-wise flowchart downloads will appear here.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fixturesBySport.map((group) => (
              <button
                key={group.sportName}
                type="button"
                onClick={() => downloadFlowchart(group.sportName, group.fixtures)}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-all hover:border-accent hover:bg-accent/10"
              >
                <span>
                  <span className="block text-sm font-black uppercase tracking-wide text-foreground">{group.sportName}</span>
                  <span className="mt-0.5 block text-xs font-bold text-muted-foreground">
                    {group.fixtures.length} fixture{group.fixtures.length === 1 ? "" : "s"}
                  </span>
                </span>
                <Download size={18} className="shrink-0 text-accent" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
