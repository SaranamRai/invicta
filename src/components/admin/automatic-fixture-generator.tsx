"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Download, GitFork, Loader2, MapPin, Plus, Radio, Trash2, Trophy, Wand2 } from "lucide-react";
import {
  AdminFixturePayload,
  generateAdminFixtures,
  getAdminSports,
  getAdminTournaments,
  getAdminVenues,
  createAdminFixture,
  getAdminTeams,
  MongoSport,
  TeamSyncPayload,
  TournamentPayload,
  VenuePayload,
} from "@/lib/api";

interface AutomaticFixtureGeneratorProps {
  fixtures: AdminFixturePayload[];
  onGenerated: (fixtures: AdminFixturePayload[]) => void;
  onDeleteFixtureGroup?: (fixtureIds: string[], sportName: string) => Promise<void> | void;
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

function getFixtureCategory(fixture: AdminFixturePayload) {
  return fixture.category === "Female" || fixture.category === "Mixed" ? fixture.category : "Male";
}

function getFixtureGroupName(fixture: AdminFixturePayload) {
  return `${getSportNameFromFixture(fixture)} ${getFixtureCategory(fixture)}`;
}

function getFixtureCategories(sport: MongoSport): ("Male" | "Female" | "Mixed")[] {
  const categories = (sport.categories || []).filter((item): item is "Male" | "Female" | "Mixed" => item === "Male" || item === "Female" || item === "Mixed");
  return categories.length ? categories : ["Male", "Female"];
}

function isFootballSport(sport: MongoSport) {
  return String(sport.sportName || sport.name || "").trim().toLowerCase().includes("football");
}

function getDownloadFileName(sportName: string) {
  const slug = sportName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "sport";
  return `invicta-${slug}-fixture-flowchart.doc`;
}

function getBracketFileName(sportName: string) {
  const slug = sportName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "sport";
  return `invicta-${slug}-tournament-bracket.doc`;
}

function getExcelFileName(sportName: string) {
  const slug = sportName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "sport";
  return `invicta-${slug}-fixtures.xls`;
}

function getFixtureTeamNames(fixtures: AdminFixturePayload[]) {
  const teams: string[] = [];
  fixtures.forEach((fixture) => {
    [fixture.teamAName || fixture.teamA, fixture.teamBName || fixture.teamB].forEach((team) => {
      const label = String(team || "").trim();
      if (
        label &&
        label.toLowerCase() !== "bye" &&
        !label.toLowerCase().startsWith("winner match") &&
        !teams.includes(label)
      ) {
        teams.push(label);
      }
    });
  });
  return teams;
}

function getBracketSize(teamCount: number) {
  let size = 2;
  while (size < Math.max(2, teamCount)) {
    size *= 2;
  }
  return size;
}

function buildSeedRows(teams: string[], bracketSize: number) {
  return Array.from({ length: bracketSize }, (_, index) => escapeHtml(teams[index] || "BYE"));
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

function buildBracketSvg(seedLabels: string[], bracketSize: number) {
  const boxWidth = 178;
  const boxHeight = 30;
  const xGap = 92;
  const seedStep = 54;
  const top = 28;
  const left = 24;
  const roundCount = Math.log2(bracketSize) + 1;
  const width = left * 2 + roundCount * boxWidth + (roundCount - 1) * xGap;
  const height = top * 2 + (bracketSize - 1) * seedStep + boxHeight;
  const lastRound = roundCount - 1;
  const xForRound = (round: number) => left + round * (boxWidth + xGap);
  const yForSlot = (round: number, index: number) => {
    if (round === 0) return top + index * seedStep;
    const span = Math.pow(2, round) * seedStep;
    return top + index * span + span / 2 - boxHeight / 2;
  };

  const boxes: string[] = [];
  const lines: string[] = [];

  for (let round = 0; round < roundCount; round += 1) {
    const count = bracketSize / Math.pow(2, round);
    const roundX = xForRound(round);
    for (let index = 0; index < count; index += 1) {
      const y = yForSlot(round, index);
      const label = round === 0
        ? seedLabels[index]
        : round === lastRound
          ? "Champion"
          : round === lastRound - 1
            ? "Finalist"
            : "Winner";
      boxes.push(`
        <g>
          <rect x="${roundX}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="4" class="${round === lastRound ? "champion-box" : "bracket-box"}" />
          <text x="${roundX + 10}" y="${y + 20}" class="bracket-label">${escapeHtml(label)}</text>
        </g>
      `);
    }
  }

  for (let round = 0; round < lastRound; round += 1) {
    const count = bracketSize / Math.pow(2, round);
    const startX = xForRound(round) + boxWidth;
    const midX = startX + xGap / 2;
    const endX = xForRound(round + 1);
    for (let index = 0; index < count; index += 2) {
      const y1 = yForSlot(round, index) + boxHeight / 2;
      const y2 = yForSlot(round, index + 1) + boxHeight / 2;
      const nextY = yForSlot(round + 1, index / 2) + boxHeight / 2;
      lines.push(`
        <path d="M ${startX} ${y1} H ${midX} M ${startX} ${y2} H ${midX} M ${midX} ${y1} V ${y2} M ${midX} ${nextY} H ${endX}" class="bracket-line" />
      `);
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tournament bracket">
      ${lines.join("")}
      ${boxes.join("")}
    </svg>
  `;
}

function buildBracketDocument(sportName: string, fixtures: AdminFixturePayload[]) {
  const sortedFixtures = [...fixtures].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const teams = getFixtureTeamNames(sortedFixtures);
  const bracketSize = getBracketSize(teams.length || sortedFixtures.length * 2 || 2);
  const seeds = buildSeedRows(teams, bracketSize);
  const bracketSvg = buildBracketSvg(seeds, bracketSize);
  const fixtureRows = sortedFixtures.map((fixture, index) => {
    const teamA = escapeHtml(fixture.teamAName || fixture.teamA || "Team A");
    const teamB = escapeHtml(fixture.teamBName || fixture.teamB || "Team B");
    const date = escapeHtml(fixture.date || "Date TBD");
    const time = escapeHtml(fixture.time || "Time TBD");
    const venue = escapeHtml(fixture.venue || "Venue TBD");
    const category = escapeHtml(fixture.category || "Category");
    const round = escapeHtml(fixture.round || "Knockout");
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${round}</td>
        <td>${teamA} vs ${teamB}</td>
        <td>${category}</td>
        <td>${date}</td>
        <td>${time}</td>
        <td>${venue}</td>
      </tr>
    `;
  }).join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 22px; }
          h1 { margin: 0 0 6px; text-align: center; color: #111827; font-size: 30px; text-transform: uppercase; letter-spacing: 1px; }
          .subtitle { margin: 0 0 22px; text-align: center; color: #64748b; font-weight: bold; }
          .bracket-wrap {
            border: 2px solid #e5e7eb;
            background: #ffffff;
            overflow-x: auto;
            padding: 18px;
          }
          .bracket-wrap svg { display: block; max-width: 100%; height: auto; margin: 0 auto; }
          .bracket-box {
            fill: #ffffff;
            stroke: #111827;
            stroke-width: 2;
          }
          .champion-box {
            fill: #fefce8;
            stroke: #111827;
            stroke-width: 2;
          }
          .bracket-line {
            fill: none;
            stroke: #111827;
            stroke-width: 2;
          }
          .bracket-label {
            fill: #111827;
            font-size: 12px;
            font-weight: bold;
            font-family: Arial, sans-serif;
          }
          table.fixtures { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 12px; }
          table.fixtures th {
            background: #111827;
            color: #ffffff;
            text-align: left;
            padding: 8px;
            text-transform: uppercase;
          }
          table.fixtures td { border: 1px solid #e5e7eb; padding: 8px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(sportName)} Tournament Bracket</h1>
        <div class="subtitle">Fixture bracket format. Total matches: ${sortedFixtures.length}.</div>
        <div class="bracket-wrap">
          ${bracketSvg}
        </div>
        <table class="fixtures">
          <thead>
            <tr>
              <th>#</th>
              <th>Round</th>
              <th>Fixture</th>
              <th>Category</th>
              <th>Date</th>
              <th>Time</th>
              <th>Venue</th>
            </tr>
          </thead>
          <tbody>${fixtureRows}</tbody>
        </table>
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

function downloadBracket(sportName: string, fixtures: AdminFixturePayload[]) {
  const html = buildBracketDocument(sportName, fixtures);
  const blob = new Blob([html], { type: "application/msword" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getBracketFileName(sportName);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function downloadExcelFixtures(sportName: string, fixtures: AdminFixturePayload[]) {
  const sortedFixtures = [...fixtures].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const rows = sortedFixtures.map((fixture, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(fixture.tournamentName || "INVICTA")}</td>
      <td>${escapeHtml(fixture.sportName || fixture.sport || sportName)}</td>
      <td>${escapeHtml(fixture.category || "")}</td>
      <td>${escapeHtml(fixture.round || "")}</td>
      <td>${escapeHtml(fixture.teamAName || fixture.teamA || "Team A")}</td>
      <td>${escapeHtml(fixture.teamBName || fixture.teamB || "Team B")}</td>
      <td>${escapeHtml(fixture.date || "")}</td>
      <td>${escapeHtml(fixture.time || "")}</td>
      <td>${escapeHtml(fixture.venue || "")}</td>
      <td>${escapeHtml(fixture.status || "upcoming")}</td>
    </tr>
  `).join("");
  const html = `<html><head><meta charset="utf-8" /></head><body>
    <table border="1">
      <thead><tr><th>#</th><th>Tournament</th><th>Sport</th><th>Category</th><th>Round</th><th>Team A</th><th>Team B</th><th>Date</th><th>Time</th><th>Venue</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getExcelFileName(sportName);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function AutomaticFixtureGenerator({ fixtures, onGenerated, onDeleteFixtureGroup }: AutomaticFixtureGeneratorProps) {
  const [sports, setSports] = useState<MongoSport[]>([]);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [venues, setVenues] = useState<VenuePayload[]>([]);
  const [teams, setTeams] = useState<TeamSyncPayload[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [tournamentId, setTournamentId] = useState("");
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [categoriesBySport, setCategoriesBySport] = useState<Record<string, ("Male" | "Female" | "Mixed")[]>>({});
  const [venueBySport, setVenueBySport] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState(getTodayInputValue());
  const [endDate, setEndDate] = useState("");
  const [matchesPerDay, setMatchesPerDay] = useState(5);
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [dayEndTime, setDayEndTime] = useState("17:00");
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(45);
  const [gapMinutes, setGapMinutes] = useState(15);
  const [playDays, setPlayDays] = useState<number[]>([0, 6]);
  const [manualSportId, setManualSportId] = useState("");
  const [manualTournamentId, setManualTournamentId] = useState("");
  const [manualCategory, setManualCategory] = useState<"Male" | "Female" | "Mixed">("Male");
  const [manualTeamA, setManualTeamA] = useState("");
  const [manualTeamB, setManualTeamB] = useState("");
  const [manualDate, setManualDate] = useState(getTodayInputValue());
  const [manualTime, setManualTime] = useState("09:00");
  const [manualVenue, setManualVenue] = useState("");
  const [manualRound, setManualRound] = useState("");
  const [manualDuration, setManualDuration] = useState(45);
  const [manualSaving, setManualSaving] = useState(false);
  const [fixtureMode, setFixtureMode] = useState<"automatic" | "manual">("manual");

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [nextSports, nextTournaments, nextVenues, nextTeams] = await Promise.all([
          getAdminSports(),
          getAdminTournaments(),
          getAdminVenues(),
          getAdminTeams(),
        ]);

        if (!isMounted) return;

        setSports(nextSports);
        setTournaments(nextTournaments);
        setVenues(nextVenues);
        setTeams(nextTeams.filter((team) =>
          team.status === "draft" ||
          team.status === "approved" ||
          team.status === "ready" ||
          team.status === "registered"
        ));
        setSelectedSportIds(nextSports[0]?._id ? [nextSports[0]._id] : []);
        setManualSportId(nextSports[0]?._id || "");
        setCategoriesBySport(Object.fromEntries(nextSports.map((sport) => [sport._id, getFixtureCategories(sport)])));
        setTournamentId(getTournamentId(nextTournaments[0] || {}));
        setManualTournamentId(getTournamentId(nextTournaments[0] || {}));
        setVenueBySport(Object.fromEntries(nextSports.map((sport) => [sport._id, getVenueId(nextVenues[0] || {})])));
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
  const manualSport = sports.find((sport) => sport._id === manualSportId);
  const manualTournament = tournaments.find((tournament) => getTournamentId(tournament) === manualTournamentId);
  const manualTeams = teams.filter((team) => {
    const teamTournamentId = String(team.tournamentId || "");
    const teamTournamentName = String(team.tournamentName || "").trim().toLowerCase();
    const selectedTournamentName = String(manualTournament?.name || "").trim().toLowerCase();
    const tournamentMatches = !manualTournamentId ||
      teamTournamentId === manualTournamentId ||
      Boolean(selectedTournamentName && teamTournamentName === selectedTournamentName);
    if (!tournamentMatches) return false;
    const teamSport = String(team.sportId || team.sportName || team.sport || "").toLowerCase();
    const sportName = String(manualSport?.sportName || manualSport?.name || "").toLowerCase();
    return teamSport === manualSportId.toLowerCase() || teamSport === sportName || String(team.sport || "").toLowerCase() === sportName.replace(/\s+/g, "-");
  }).filter((team) => !manualCategory || team.category === manualCategory);
  const selectedIncludesFootball = useMemo(() => selectedSports.some(isFootballSport), [selectedSports]);
  const fixturesBySport = useMemo(() => {
    const groups = new Map<string, { sportName: string; fixtures: AdminFixturePayload[] }>();
    fixtures.forEach((fixture) => {
      const key = `${getSportKey(fixture)}:${getFixtureCategory(fixture)}`;
      const sportName = getFixtureGroupName(fixture);
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
        venueId: venueBySport[nextSportId] || "",
      }))
    );

    const missingVenueSport = selectedSports.find((sport) => !venueBySport[sport._id]);
    if (!tournamentId || generationTargets.length === 0 || missingVenueSport || playDays.length === 0) {
      setError(missingVenueSport
        ? `Please select a venue for ${getSportLabel(missingVenueSport)}.`
        : playDays.length === 0
          ? "Select at least one day of the week for fixture generation."
        : "Please select tournament and at least one sport/category before generating fixtures.");
      return;
    }

    setSaving(true);
    try {
      const results = [];
      for (const target of generationTargets) {
        const selectedVenue = venues.find((venue) => getVenueId(venue) === target.venueId);
        const result = await generateAdminFixtures({
          tournamentId,
          sportId: target.sportId,
          category: target.category,
          venueId: target.venueId,
          venue: selectedVenue?.name || "",
          startDate,
          endDate: endDate || undefined,
          matchesPerDay,
          dayStartTime,
          dayEndTime,
          matchDurationMinutes,
          gapMinutes,
          playDays,
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

  async function handleDeleteGroup(sportName: string, groupFixtures: AdminFixturePayload[]) {
    if (!onDeleteFixtureGroup) return;
    const fixtureIds = groupFixtures.map((fixture) => fixture.id).filter(Boolean);
    if (fixtureIds.length === 0) return;
    if (!confirm(`Cancel and delete all ${sportName} fixtures? This will remove ${fixtureIds.length} match${fixtureIds.length === 1 ? "" : "es"} from public pages and dashboards, and post a public cancellation announcement.`)) return;

    setDeletingGroup(sportName);
    setMessage("");
    setError("");
    try {
      await onDeleteFixtureGroup(fixtureIds, sportName);
      setMessage(`${sportName} fixtures cancelled and deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete these fixtures.");
    } finally {
      setDeletingGroup("");
    }

  }

  async function handleManualCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!manualTournamentId || !manualSportId || !manualTeamA || !manualTeamB || manualTeamA === manualTeamB || !manualVenue) {
      setError("Select a tournament, sport, two different teams, and a venue for the manual fixture.");
      return;
    }
    setManualSaving(true);
    try {
      const created = await createAdminFixture({
        sportId: manualSportId,
        tournamentId: manualTournamentId || undefined,
        category: manualCategory,
        teamA: manualTeamA,
        teamB: manualTeamB,
        date: manualDate,
        time: manualTime,
        venue: manualVenue,
        round: manualRound || undefined,
        matchDurationMinutes: manualDuration,
        gapMinutes,
      });
      onGenerated([created]);
      setMessage("Manual fixture created successfully.");
      setManualTeamA("");
      setManualTeamB("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the manual fixture.");
    } finally {
      setManualSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
          <Wand2 size={13} />
          Fixture Scheduler
        </span>
        <div>
          <h2 className="sport-heading text-2xl font-black text-foreground">Create Fixtures</h2>
          <p className="max-w-3xl text-sm font-medium leading-relaxed text-muted-foreground">
            Choose one method below. Use automatic generation for a full schedule or manual creation for fixtures prepared on paper.
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setFixtureMode("automatic")}
          className={`rounded-xl px-4 py-3 text-left transition-colors ${fixtureMode === "automatic" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:border-accent"}`}
        >
          <span className="block text-xs font-black uppercase tracking-widest">Automatic Generation</span>
          <span className="mt-1 block text-xs font-medium opacity-80">Create a complete schedule from registered teams.</span>
        </button>
        <button
          type="button"
          onClick={() => setFixtureMode("manual")}
          className={`rounded-xl px-4 py-3 text-left transition-colors ${fixtureMode === "manual" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:border-accent"}`}
        >
          <span className="block text-xs font-black uppercase tracking-widest">Manual Creation</span>
          <span className="mt-1 block text-xs font-medium opacity-80">Add one fixture from a paper schedule.</span>
        </button>
      </div>

      {fixtureMode === "automatic" && <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
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
                            if (event.target.checked && !venueBySport[sport._id]) {
                              setVenueBySport((current) => ({
                                ...current,
                                [sport._id]: getVenueId(venues[0] || {}),
                              }));
                            }
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
                      <label className="w-full space-y-2 pl-7">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <MapPin size={12} /> Venue for {getSportLabel(sport)}
                        </span>
                        <select
                          value={venueBySport[sport._id] || ""}
                          disabled={!isSelected}
                          onChange={(event) => {
                            setVenueBySport((current) => ({
                              ...current,
                              [sport._id]: event.target.value,
                            }));
                          }}
                          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select venue...</option>
                          {venues.map((venue) => (
                            <option key={getVenueId(venue)} value={getVenueId(venue)}>
                              {venue.name}{venue.location ? ` / ${venue.location}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
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

              <div className="space-y-2 md:col-span-2 lg:col-span-4">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <CalendarDays size={13} /> Days this sport will be played
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Sunday", 0],
                    ["Monday", 1],
                    ["Tuesday", 2],
                    ["Wednesday", 3],
                    ["Thursday", 4],
                    ["Friday", 5],
                    ["Saturday", 6],
                  ].map(([label, day]) => (
                    <label key={day} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground">
                      <input
                        type="checkbox"
                        checked={playDays.includes(Number(day))}
                        onChange={(event) => setPlayDays((current) => event.target.checked
                          ? [...new Set([...current, Number(day)])]
                          : current.filter((item) => item !== Number(day)))}
                        className="accent-accent"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="space-y-2">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <CalendarDays size={13} /> End Date (optional)
                </span>
                <input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent" />
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Matches per day</span>
                <input type="number" min={1} value={matchesPerDay} onChange={(event) => setMatchesPerDay(Number(event.target.value))} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent" />
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

              {selectedIncludesFootball && (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Football Full Time</span>
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
              )}
            </div>

            <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-xs font-semibold text-muted-foreground">
              {selectedSports.length > 0
                ? selectedSports.map((sport) => {
                    const venue = venues.find((item) => getVenueId(item) === venueBySport[sport._id]);
                    return `${getSportLabel(sport)} (${(categoriesBySport[sport._id] || []).join(", ") || "no category"}${venue ? `, ${venue.name}` : ", no venue"})`;
                  }).join(" / ")
                  : "Select sports and categories"}. The schedule will use {playDays.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ") || "the selected days"}, allows as many matches per day as the time window permits, and keeps each team to one match per day. Each sport uses its selected venue. Full-time controls apply only to football.
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
      </form>}

      {fixtureMode === "manual" && <form onSubmit={handleManualCreate} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-accent/10 p-2 text-accent"><Plus size={18} /></div>
          <div>
            <h3 className="sport-heading text-xl font-black text-foreground">Add Manual Fixture</h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Enter a fixture that was prepared on paper or outside the automatic generator.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <select value={manualTournamentId} onChange={(event) => { setManualTournamentId(event.target.value); setManualTeamA(""); setManualTeamB(""); }} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground">
            <option value="">Select tournament...</option>
            {tournaments.map((tournament) => <option key={getTournamentId(tournament)} value={getTournamentId(tournament)}>{tournament.name}</option>)}
          </select>
          <select value={manualSportId} onChange={(event) => { setManualSportId(event.target.value); setManualTeamA(""); setManualTeamB(""); }} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground">
            <option value="">Select sport...</option>
            {sports.map((sport) => <option key={sport._id} value={sport._id}>{getSportLabel(sport)}</option>)}
          </select>
          <select value={manualCategory} onChange={(event) => { setManualCategory(event.target.value as "Male" | "Female" | "Mixed"); setManualTeamA(""); setManualTeamB(""); }} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground">
            {(manualSport ? getFixtureCategories(manualSport) : ["Male", "Female"]).map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select value={manualTeamA} onChange={(event) => setManualTeamA(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground">
            <option value="">Team A...</option>
            {manualTeams.map((team) => <option key={team.id} value={team.id}>{team.teamName || team.name}</option>)}
          </select>
          <select value={manualTeamB} onChange={(event) => setManualTeamB(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground">
            <option value="">Team B...</option>
            {manualTeams.filter((team) => team.id !== manualTeamA).map((team) => <option key={team.id} value={team.id}>{team.teamName || team.name}</option>)}
          </select>
          <input type="date" value={manualDate} onChange={(event) => setManualDate(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground" />
          <input type="time" value={manualTime} onChange={(event) => setManualTime(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground" />
          <select value={manualVenue} onChange={(event) => setManualVenue(event.target.value)} className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground">
            <option value="">Venue...</option>
            {venues.map((venue) => <option key={getVenueId(venue)} value={venue.name}>{venue.name}</option>)}
          </select>
          <input type="text" value={manualRound} onChange={(event) => setManualRound(event.target.value)} placeholder="Round (optional)" className="h-12 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground placeholder:text-muted-foreground" />
          <label className="space-y-1 text-xs font-bold text-muted-foreground">
            Match duration (minutes)
            <input type="number" min={1} value={manualDuration} onChange={(event) => setManualDuration(Number(event.target.value))} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground" />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={manualSaving} className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-accent-foreground disabled:opacity-50">
            {manualSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {manualSaving ? "Saving..." : "Create Manual Fixture"}
          </button>
        </div>
      </form>}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="sport-heading text-xl font-black text-foreground">Download Fixture Flowcharts</h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Download separate flowchart and bracket documents for each sport and category.
            </p>
          </div>
        </div>

        {fixturesBySport.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm font-bold text-muted-foreground">
            Generate fixtures first. Sport-wise male and female downloads will appear here.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fixturesBySport.map((group) => (
              <div
                key={group.sportName}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-all hover:border-accent hover:bg-accent/10"
              >
                <button
                  type="button"
                  onClick={() => downloadFlowchart(group.sportName, group.fixtures)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black uppercase tracking-wide text-foreground">{group.sportName}</span>
                    <span className="mt-0.5 block text-xs font-bold text-muted-foreground">
                      {group.fixtures.length} fixture{group.fixtures.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <Download size={18} className="shrink-0 text-accent" />
                </button>
                <button
                  type="button"
                  onClick={() => downloadExcelFixtures(group.sportName, group.fixtures)}
                  aria-label={`Download ${group.sportName} fixtures as Excel`}
                  title={`Download ${group.sportName} fixtures as Excel`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20"
                >
                  <span className="text-[10px] font-black">XLS</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadBracket(group.sportName, group.fixtures)}
                  aria-label={`Download ${group.sportName} tournament bracket`}
                  title={`Download ${group.sportName} tournament bracket`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
                >
                  <GitFork size={15} />
                </button>
                {onDeleteFixtureGroup && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group.sportName, group.fixtures)}
                    disabled={deletingGroup === group.sportName}
                    aria-label={`Delete ${group.sportName} fixtures`}
                    title={`Delete ${group.sportName} fixtures`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingGroup === group.sportName ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
