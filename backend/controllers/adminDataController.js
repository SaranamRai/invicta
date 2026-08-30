import mongoose from "mongoose";

import Fixture from "../models/Fixture.js";
import Sport from "../models/Sport.js";
import Team from "../models/Team.js";
import Player from "../models/Player.js";
import Tournament from "../models/Tournament.js";
import TeamRegistration from "../models/TeamRegistration.js";
import Venue from "../models/Venue.js";
import Announcement from "../models/Announcement.js";
import LiveScore from "../models/LiveScore.js";
import LiveFeed from "../models/LiveFeed.js";
import Result from "../models/Result.js";
import { audit } from "../utils/audit.js";
import { assertSupportedMatchCategory } from "../utils/matchCategories.js";

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSport(value) {
  return normalizeText(value).toLowerCase();
}

function getAssignedSport(req) {
  return normalizeSport(req.user?.assignedSport);
}

function getSportSlug(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "-");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertSportAccess(req, sport) {
  const assignedSport = getAssignedSport(req);
  const requestedSport = normalizeSport(sport);

  if (req.user?.role === "coordinator" && assignedSport && requestedSport !== assignedSport) {
    const error = new Error(`This coordinator can only manage ${assignedSport} teams`);
    error.status = 403;
    throw error;
  }
}

function getSportName(sport) {
  return normalizeText(sport) || "General";
}

async function getOrCreateSport(sport) {
  const normalizedSport = normalizeSport(sport);
  const name = getSportName(normalizedSport);
  let sportDoc = await Sport.findOne({
    $or: [
      { sportName: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    ],
  });

  if (!sportDoc) {
    sportDoc = await Sport.create({
      sportName: name,
      name,
      categories: ["Male", "Female"],
      status: "active",
    });
  }

  return sportDoc;
}

function mapTeam(team) {
  return {
    id: team._id.toString(),
    name: team.teamName,
    department: team.department,
    sport: team.sport,
    sportName: team.sportName,
    sportId: team.sportId?.toString?.() || "",
    tournamentId: team.tournamentId?.toString?.() || "",
    tournamentName: team.tournamentName || "",
    category: team.category || "Male",
    members: team.members || [],
    coachCaptain: team.captainName || "",
    captainRegNo: team.captainRegNo || "",
    contactNumber: team.contactNumber || "",
    logo: team.logo || "",
    status: team.status,
    reviewedAt: team.reviewedAt,
    wins: team.wins || 0,
    losses: team.losses || 0,
    draws: team.draws || 0,
    points: team.points || 0,
    registeredAt: team.registeredAt,
    playerRegisteredAt: team.playerRegisteredAt || [],
  };
}

function mapFixture(fixture) {
  return {
    id: fixture._id.toString(),
    tournamentId: fixture.tournamentId?.toString?.() || "",
    tournamentName: fixture.tournamentName || "",
    teamA: fixture.teamA?.toString?.() || "",
    teamB: fixture.teamB?.toString?.() || "",
    teamAName: fixture.teamAName || "",
    teamBName: fixture.teamBName || "",
    departmentA: fixture.departmentA || "",
    departmentB: fixture.departmentB || "",
    sport: fixture.sport,
    sportName: fixture.sportName,
    sportId: fixture.sportId?.toString?.() || "",
    category: fixture.category || "Male",
    date: fixture.date,
    time: fixture.time,
    startTime: fixture.startTime,
    endTime: fixture.endTime,
    fullMatchSeconds: fixture.fullMatchSeconds || 90 * 60,
    matchGapMinutes: fixture.matchGapMinutes || 0,
    round: fixture.round || "",
    venue: fixture.venue,
    status: fixture.status === "completed" ? "completed" : fixture.status === "live" ? "live" : "scheduled",
    scoreA: fixture.scoreA || 0,
    scoreB: fixture.scoreB || 0,
    endedAt: fixture.endedAt,
    assignedVolunteer: fixture.assignedVolunteer?.toString?.() || "",
  };
}

function parsePositiveMinutes(value, label) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    const error = new Error(`${label} must be greater than 0`);
    error.status = 400;
    throw error;
  }
  return Math.floor(minutes);
}

function parseTimeToMinutes(value, label) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    const error = new Error(`${label} must use HH:MM format`);
    error.status = 400;
    throw error;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    const error = new Error(`${label} is invalid`);
    error.status = 400;
    throw error;
  }

  return hours * 60 + minutes;
}

function formatMinutesAsTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseDateOnly(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const error = new Error("Start date must use YYYY-MM-DD format");
    error.status = 400;
    throw error;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) {
    const error = new Error("Start date is invalid");
    error.status = 400;
    throw error;
  }
  return date;
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isSameFixtureSport(fixture, sportDoc) {
  const sportName = sportDoc.sportName || sportDoc.name || "";
  const sport = normalizeSport(sportName);
  return fixture.sportId?.toString?.() === sportDoc._id.toString() || normalizeSport(fixture.sport || fixture.sportName) === sport;
}

function getSportDateMatchCount(dateString, sportDoc, fixtures) {
  return fixtures.filter((fixture) => (
    fixture.status !== "cancelled" &&
    fixture.date === dateString &&
    isSameFixtureSport(fixture, sportDoc)
  )).length;
}

function getDateTime(date, minutes) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function hasFixtureClash(payload, existingFixtures) {
  const { start, end } = getFixtureWindow(payload);
  const teamIds = [payload.teamA, payload.teamB].filter(Boolean).map(String);
  const departments = [payload.departmentA, payload.departmentB].filter(Boolean).map((department) => normalizeText(department).toLowerCase());
  const venue = normalizeText(payload.venue).toLowerCase();
  const assignedVolunteer = payload.assignedVolunteer ? String(payload.assignedVolunteer) : "";

  return existingFixtures.some((fixture) => {
    if (fixture.status === "cancelled") return false;
    const fixtureStart = fixture.startTime
      ? new Date(fixture.startTime)
      : fixture.date && fixture.time
        ? new Date(`${fixture.date}T${fixture.time}`)
        : null;
    const fixtureEnd = fixture.endTime
      ? new Date(fixture.endTime)
      : fixtureStart
        ? new Date(fixtureStart.getTime() + 60 * 60 * 1000)
        : null;
    const fixtureEndWithGap = fixtureEnd
      ? new Date(fixtureEnd.getTime() + Math.max(0, Number(fixture.matchGapMinutes || 0)) * 60 * 1000)
      : null;
    if (!fixtureStart || !fixtureEndWithGap || fixtureStart >= end || fixtureEndWithGap <= start) return false;

    const existingTeamIds = [fixture.teamA?.toString?.(), fixture.teamB?.toString?.()].filter(Boolean);
    if (teamIds.some((id) => existingTeamIds.includes(id))) return true;

    const existingDepartments = [fixture.departmentA, fixture.departmentB].filter(Boolean).map((department) => normalizeText(department).toLowerCase());
    if (departments.some((department) => existingDepartments.includes(department))) return true;

    if (venue && normalizeText(fixture.venue).toLowerCase() === venue) return true;

    if (assignedVolunteer && fixture.assignedVolunteer?.toString?.() === assignedVolunteer) return true;

    return false;
  });
}

function getParticipantName(participant, fallback) {
  return normalizeText(participant?.teamName || participant?.name || fallback);
}

function getParticipantId(participant) {
  return participant?._id || undefined;
}

function getParticipantDepartment(participant) {
  return normalizeText(participant?.department);
}

function buildFixturePayload({ teamA, teamB, sportDoc, tournament, venueName, category, date, startMinutes, durationMinutes, gapMinutes, round, matchNumber, userId }) {
  const endMinutes = startMinutes + durationMinutes;
  const startTime = getDateTime(date, startMinutes);
  const endTime = getDateTime(date, endMinutes);
  const dateString = toDateInputValue(date);
  const timeString = formatMinutesAsTime(startMinutes);
  const sportName = sportDoc.sportName || sportDoc.name || "Sport";
  const teamAName = getParticipantName(teamA, "Team A");
  const teamBName = getParticipantName(teamB, "Team B");
  const teamAId = getParticipantId(teamA);
  const teamBId = getParticipantId(teamB);

  return {
    tournamentId: tournament._id,
    tournamentName: tournament.name,
    sport: normalizeSport(sportName),
    sportName,
    sportId: sportDoc._id,
    category,
    matchTitle: `${teamAName} vs ${teamBName}`,
    ...(teamAId ? { teamA: teamAId } : {}),
    ...(teamBId ? { teamB: teamBId } : {}),
    teamAName,
    teamBName,
    departmentA: getParticipantDepartment(teamA),
    departmentB: getParticipantDepartment(teamB),
    venue: venueName,
    date: dateString,
    time: timeString,
    startTime,
    endTime,
    fullMatchSeconds: durationMinutes * 60,
    matchGapMinutes: gapMinutes,
    round: matchNumber ? `${round} - Match ${matchNumber}` : round,
    status: "upcoming",
    createdBy: userId,
  };
}

function getBracketSize(teamCount) {
  let size = 2;
  while (size < Math.max(2, teamCount)) size *= 2;
  return size;
}

function distributeTeamsIntoGroups(teams) {
  if (teams.length <= 4) return [teams];
  const groupCount = Math.ceil(teams.length / 4);
  const baseSize = Math.floor(teams.length / groupCount);
  let extra = teams.length % groupCount;
  let cursor = 0;

  return Array.from({ length: groupCount }, () => {
    const size = baseSize + (extra > 0 ? 1 : 0);
    extra -= 1;
    const group = teams.slice(cursor, cursor + size);
    cursor += size;
    return group;
  }).filter((group) => group.length > 0);
}

function getGroupName(index) {
  return `Group ${String.fromCharCode(65 + index)}`;
}

function getRoundName(groupName, participantCount, isGroupStage) {
  if (participantCount <= 2) return isGroupStage ? `${groupName} Final` : "Tournament Final";
  if (participantCount <= 4) return isGroupStage ? `${groupName} Semi Final` : "Tournament Semi Final";
  if (participantCount <= 8) return isGroupStage ? `${groupName} Quarter Final` : "Tournament Quarter Final";
  return isGroupStage ? `${groupName} Round of ${participantCount}` : `Tournament Round of ${participantCount}`;
}

function makeWinnerParticipant(matchNumber) {
  return { name: `Winner Match ${matchNumber}` };
}

function buildKnockoutMatches(participants, roundPrefix, matchCounterRef, isGroupStage) {
  const seededParticipants = [
    ...participants,
    ...Array.from({ length: getBracketSize(participants.length) - participants.length }, () => null),
  ];
  const fixtures = [];
  let currentRound = seededParticipants;

  while (currentRound.length > 1) {
    const nextRound = [];
    const roundName = getRoundName(roundPrefix, currentRound.length, isGroupStage);

    for (let index = 0; index < currentRound.length; index += 2) {
      const teamA = currentRound[index];
      const teamB = currentRound[index + 1];

      if (teamA && teamB) {
        const matchNumber = matchCounterRef.value;
        matchCounterRef.value += 1;
        fixtures.push({ teamA, teamB, round: roundName, matchNumber });
        nextRound.push(makeWinnerParticipant(matchNumber));
      } else if (teamA || teamB) {
        nextRound.push(teamA || teamB);
      }
    }

    currentRound = nextRound;
  }

  return {
    fixtures,
    winner: currentRound[0],
  };
}

function buildTournamentBracketFixtures(teams) {
  const matchCounterRef = { value: 1 };
  const groups = distributeTeamsIntoGroups(teams);
  const fixtures = [];
  const groupWinners = [];

  groups.forEach((group, index) => {
    const result = buildKnockoutMatches(group, getGroupName(index), matchCounterRef, true);
    fixtures.push(...result.fixtures);
    if (result.winner) groupWinners.push(result.winner);
  });

  if (groupWinners.length > 1) {
    const result = buildKnockoutMatches(groupWinners, "Tournament", matchCounterRef, false);
    fixtures.push(...result.fixtures);
  }

  return fixtures;
}

function getCompetitionSportKey(value) {
  return normalizeSport(value).replace(/[^a-z]/g, "");
}

function usesRoundRobin(sportName) {
  return ["football", "volleyball"].includes(getCompetitionSportKey(sportName));
}

function shuffleTeams(teams) {
  const shuffled = [...teams];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildRoundRobinFixtures(teams) {
  const participants = shuffleTeams(teams);
  if (participants.length % 2 === 1) participants.push(null);

  const rounds = participants.length - 1;
  const half = participants.length / 2;
  const fixtures = [];
  let matchNumber = 1;

  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    for (let index = 0; index < half; index += 1) {
      const teamA = participants[index];
      const teamB = participants[participants.length - 1 - index];
      if (teamA && teamB) {
        fixtures.push({
          teamA,
          teamB,
          round: `Round Robin Round ${roundIndex + 1}`,
          matchNumber,
        });
        matchNumber += 1;
      }
    }

    const fixed = participants[0];
    const rotating = participants.slice(1);
    rotating.unshift(rotating.pop());
    participants.splice(0, participants.length, fixed, ...rotating);
  }

  return fixtures;
}

async function syncApprovedRegistrationsForFixtureGeneration({ tournament, sportDoc, category, sportName, userId }) {
  const registrations = await TeamRegistration.find({
    status: "approved",
    tournamentId: tournament._id,
    sportId: sportDoc._id,
    category,
  }).lean();

  if (registrations.length === 0) return;

  const sport = normalizeSport(sportName);
  await Promise.all(registrations.map((registration) => Team.findOneAndUpdate(
    {
      sportId: registration.sportId,
      tournamentId: registration.tournamentId,
      category: registration.category,
      department: registration.department,
      teamName: registration.teamName,
    },
    {
      teamName: registration.teamName,
      department: registration.department,
      sport,
      sportName: registration.sportName || sportName,
      sportId: registration.sportId,
      tournamentId: registration.tournamentId,
      tournamentName: registration.tournamentName || tournament.name,
      category: registration.category,
      captainName: registration.captainName,
      captainRegNo: registration.captainRegNo,
      captainEmail: registration.captainEmail,
      captainPhone: registration.captainPhone,
      contactNumber: registration.captainPhone,
      email: registration.captainEmail,
      members: registration.members || [],
      logo: registration.teamLogo || "",
      status: "approved",
      submittedAt: registration.submittedAt,
      reviewedBy: registration.reviewedBy || userId,
      reviewedAt: registration.reviewedAt || new Date(),
      rejectionReason: "",
      registeredAt: registration.submittedAt ? new Date(registration.submittedAt).getTime() : Date.now(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
}

function getNextWeekendDate(date) {
  const nextDate = new Date(date);
  while (!isWeekend(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  return nextDate;
}

function buildByeFixturePayload({ team, sportDoc, tournament, venueName, category, date, round, userId }) {
  const sportName = sportDoc.sportName || sportDoc.name || "Sport";
  const dateString = toDateInputValue(getNextWeekendDate(date));
  const now = Date.now();

  return {
    tournamentId: tournament._id,
    tournamentName: tournament.name,
    sport: normalizeSport(sportName),
    sportName,
    sportId: sportDoc._id,
    category,
    matchTitle: `${team.teamName} advances by bye`,
    teamA: team._id,
    teamAName: team.teamName,
    teamBName: "BYE",
    departmentA: team.department,
    venue: venueName || "BYE",
    date: dateString,
    time: "",
    scoreA: 1,
    scoreB: 0,
    round,
    status: "completed",
    isCompleted: true,
    completedAt: now,
    endedAt: new Date(now).toISOString(),
    createdBy: userId,
  };
}

function getFixtureWindow(fixture) {
  const start = fixture.startTime
    ? new Date(fixture.startTime)
    : fixture.date && fixture.time
      ? new Date(`${fixture.date}T${fixture.time}:00`)
      : null;
  const rawEnd = fixture.endTime ? new Date(fixture.endTime) : start ? new Date(start.getTime() + 60 * 60 * 1000) : null;
  const end = rawEnd
    ? new Date(rawEnd.getTime() + Math.max(0, Number(fixture.matchGapMinutes || 0)) * 60 * 1000)
    : null;

  if (!start || !rawEnd || Number.isNaN(start.getTime()) || Number.isNaN(rawEnd.getTime()) || rawEnd <= start || !end || Number.isNaN(end.getTime())) {
    const error = new Error("Fixture startTime and endTime are required and must form a valid time range");
    error.status = 400;
    throw error;
  }

  return { start, end };
}

function getFixtureDateFromInput(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getFixtureTimeMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getAllowedRescheduleDates(dateString) {
  const anchorDate = getFixtureDateFromInput(dateString) || new Date();
  const dates = [];
  for (let offset = 0; offset < 28; offset += 1) {
    const next = new Date(anchorDate);
    next.setDate(anchorDate.getDate() + offset);
    if (next.getDay() === 0 || next.getDay() === 6) {
      dates.push(toDateInputValue(next));
    }
  }
  return dates;
}

function toCandidateFixtureDateTime(dateString, timeString) {
  if (!dateString || !timeString) return null;
  const result = new Date(`${dateString}T${timeString}:00`);
  return Number.isNaN(result.getTime()) ? null : result;
}

function getFixtureRangeFromDocument(fixture) {
  const start = fixture.startTime
    ? new Date(fixture.startTime)
    : fixture.date && fixture.time
      ? toCandidateFixtureDateTime(fixture.date, fixture.time)
      : null;
  const rawEnd = fixture.endTime
    ? new Date(fixture.endTime)
    : start
      ? new Date(start.getTime() + (Number(fixture.fullMatchSeconds || 90 * 60) * 1000))
      : null;
  if (!start || !rawEnd || Number.isNaN(start.getTime()) || Number.isNaN(rawEnd.getTime())) {
    return null;
  }
  return { start, end: rawEnd };
}

async function validateRescheduleCandidate(payload, excludeId, overrideOptions = {}) {
  const dateString = payload.date || payload.scheduledDate;
  const timeString = payload.time || payload.startTime || "09:00";
  const start = payload.startTime && typeof payload.startTime === "string" && payload.startTime.includes("T")
    ? new Date(payload.startTime)
    : toCandidateFixtureDateTime(dateString, timeString);
  const durationSeconds = Number(payload.fullMatchSeconds || 90 * 60);
  const end = payload.endTime && typeof payload.endTime === "string" && payload.endTime.includes("T")
    ? new Date(payload.endTime)
    : start
      ? toCandidateFixtureDateTime(dateString, payload.endTime || formatMinutesAsTime(Math.round(durationSeconds / 60) + getFixtureTimeMinutes(timeString)))
      : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error("Unable to reschedule this match. Please provide a valid date and time.");
    error.status = 400;
    throw error;
  }

  const dateValue = dateString || toDateInputValue(new Date(start));
  const proposedDate = getFixtureDateFromInput(dateValue);
  if (!proposedDate || (proposedDate.getDay() !== 0 && proposedDate.getDay() !== 6)) {
    const error = new Error("Only weekend match days are allowed for fixture rescheduling.");
    error.status = 400;
    throw error;
  }

  const maxMatchesPerDay = Number(overrideOptions.maxMatchesPerDay || payload.maxMatchesPerDay || 8);
  const minRestMinutes = Math.max(30, Number(overrideOptions.minRestMinutes || payload.minRestMinutes || payload.matchGapMinutes || 60));
  const query = {
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    status: { $ne: "cancelled" },
    ...(payload.tournamentId ? { tournamentId: payload.tournamentId } : {}),
    ...(payload.sportId ? { sportId: payload.sportId } : {}),
    ...(payload.category ? { category: payload.category } : {}),
  };

  const overlapping = await Fixture.find(query).lean();
  const dateMatches = overlapping.filter((fixture) => fixture.date === dateValue && fixture.status !== "cancelled").length;
  if (dateMatches >= maxMatchesPerDay) {
    const error = new Error(`Unable to reschedule this match. ${dateValue} is already at the configured match-day capacity.`);
    error.status = 400;
    throw error;
  }

  const teamIds = [payload.teamA, payload.teamB].filter(Boolean).map(String);
  const departments = [payload.departmentA, payload.departmentB].filter(Boolean).map((department) => normalizeText(department).toLowerCase());
  const venue = payload.venue ? normalizeText(payload.venue).toLowerCase() : "";
  const volunteer = payload.assignedVolunteer ? String(payload.assignedVolunteer) : "";

  for (const fixture of overlapping) {
    const range = getFixtureRangeFromDocument(fixture);
    if (!range) continue;
    if (start >= range.end || end <= range.start) continue;

    const existingTeamIds = [fixture.teamA?.toString?.(), fixture.teamB?.toString?.()].filter(Boolean);
    const sharedTeam = teamIds.find((teamId) => existingTeamIds.includes(teamId));
    if (sharedTeam) {
      const diffMinutes = Math.abs((start.getTime() - range.start.getTime()) / 60000);
      if (diffMinutes < minRestMinutes) {
        const error = new Error(`Unable to reschedule this match. Team ${fixture.teamAName || "Team A"} already has another match too close to this time. Minimum rest time is ${minRestMinutes} minutes.`);
        error.status = 400;
        throw error;
      }
    }

    const existingDepartments = [fixture.departmentA, fixture.departmentB].filter(Boolean).map((department) => normalizeText(department).toLowerCase());
    const sharedDepartment = departments.find((department) => existingDepartments.includes(department));
    if (sharedDepartment) {
      const error = new Error("Unable to reschedule this match. A department match is already scheduled in the same time window.");
      error.status = 400;
      throw error;
    }

    if (venue && normalizeText(fixture.venue || "").toLowerCase() === venue) {
      const error = new Error("Unable to reschedule this match. The selected venue is already booked at that time.");
      error.status = 400;
      throw error;
    }

    if (volunteer && fixture.assignedVolunteer?.toString?.() === volunteer) {
      const error = new Error("Unable to reschedule this match. The assigned volunteer is already booked for another match at that time.");
      error.status = 400;
      throw error;
    }
  }

  return { start, end, date: dateValue };
}

async function suggestRescheduleSlots(payload, excludeId, options = {}) {
  const currentDate = payload.date || payload.scheduledDate || toDateInputValue(new Date());
  const currentTime = payload.time || payload.startTime || "09:00";
  const anchorDate = getFixtureDateFromInput(currentDate) || new Date();
  const suggestions = [];
  const maxSuggestions = Number(options.maxSuggestions || 6);
  const daysToScan = Number(options.daysToScan || 28);
  const durationSeconds = Number(payload.fullMatchSeconds || 90 * 60);

  for (let dayOffset = 0; dayOffset < daysToScan && suggestions.length < maxSuggestions; dayOffset += 1) {
    const candidateDate = new Date(anchorDate);
    candidateDate.setDate(anchorDate.getDate() + dayOffset);
    if (candidateDate.getDay() !== 0 && candidateDate.getDay() !== 6) continue;
    const dateText = toDateInputValue(candidateDate);
    for (let hour = 9; hour <= 18; hour += 1) {
      for (const minute of [0, 30]) {
        if (suggestions.length >= maxSuggestions) break;
        const candidateTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        const nextPayload = {
          ...payload,
          date: dateText,
          time: candidateTime,
          startTime: candidateTime,
          endTime: formatMinutesAsTime(getFixtureTimeMinutes(candidateTime) + Math.max(30, Math.round(durationSeconds / 60))),
          assignedVolunteer: payload.assignedVolunteer,
          venue: payload.venue,
          maxMatchesPerDay: payload.maxMatchesPerDay || 8,
          minRestMinutes: payload.minRestMinutes || payload.matchGapMinutes || 60,
        };
        try {
          await validateRescheduleCandidate(nextPayload, excludeId, {
            maxMatchesPerDay: nextPayload.maxMatchesPerDay,
            minRestMinutes: nextPayload.minRestMinutes,
          });
          suggestions.push({
            date: dateText,
            time: candidateTime,
            endTime: nextPayload.endTime,
            label: `${new Date(dateText).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ${candidateTime}`,
          });
        } catch {
          // Ignore invalid slots and continue searching for real suggestions.
        }
      }
      if (suggestions.length >= maxSuggestions) break;
    }
  }

  if (suggestions.length === 0 && currentTime) {
    const fallbackDate = getAllowedRescheduleDates(currentDate).find(Boolean);
    if (fallbackDate) {
      suggestions.push({
        date: fallbackDate,
        time: currentTime,
        endTime: formatMinutesAsTime(getFixtureTimeMinutes(currentTime) + Math.max(30, Math.round(durationSeconds / 60))),
        label: `${new Date(fallbackDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ${currentTime}`,
      });
    }
  }

  return suggestions;
}

async function assertFixtureNoClash(payload, excludeId) {
  return validateRescheduleCandidate(payload, excludeId);
}

function requireObjectId(id, label) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`${label} is invalid`);
    error.status = 400;
    throw error;
  }
}

function getFixtureLabel(fixture) {
  return normalizeText(fixture.matchTitle || `${fixture.teamAName || "Team A"} vs ${fixture.teamBName || "Team B"}`);
}

async function deleteFixtureDocuments(fixtures, req) {
  const fixtureIds = fixtures.map((fixture) => fixture._id);
  if (fixtureIds.length === 0) return { deletedCount: 0 };

  await Promise.all([
    LiveScore.deleteMany({ fixtureId: { $in: fixtureIds } }),
    LiveFeed.deleteMany({ fixtureId: { $in: fixtureIds } }),
    Result.deleteMany({ fixtureId: { $in: fixtureIds } }),
    Fixture.deleteMany({ _id: { $in: fixtureIds } }),
  ]);

  const firstFixture = fixtures[0];
  const sportName = firstFixture.sportName || firstFixture.sport || "Sport";
  const tournamentName = firstFixture.tournamentName || "INVICTA";
  const title = fixtures.length === 1
    ? `${sportName} Fixture Cancelled`
    : `${sportName} Fixtures Cancelled`;
  const message = fixtures.length === 1
    ? `${getFixtureLabel(firstFixture)} for ${tournamentName} has been cancelled and removed from the match schedule.`
    : `${fixtures.length} ${sportName} fixture${fixtures.length === 1 ? "" : "s"} for ${tournamentName} have been cancelled and removed from the match schedule.`;

  await Announcement.create({
    title,
    message,
    priority: "urgent",
    visibleToPublic: true,
    postedBy: req.user?.id,
    postedByRole: req.user?.role || "supercoordinator",
  });

  return { deletedCount: fixtureIds.length };
}

export async function listTeams(req, res) {
  const assignedSport = getAssignedSport(req);
  const assignedSportSlug = getSportSlug(req.user?.assignedSport);
  const assignedSportId = req.user?.assignedSportId?.toString?.() || "";
  let query = {};
  if (req.user?.role === "coordinator") {
    if (assignedSportId) {
      query = {
        $or: [
          { sportId: assignedSportId },
          ...(assignedSport ? [{ sport: assignedSport }, { sport: assignedSportSlug }] : []),
        ],
      };
    } else if (assignedSport) {
      query = {
        $or: [
          { sport: assignedSport },
          { sport: assignedSportSlug },
          { sportName: new RegExp(`^${escapeRegExp(assignedSport).replace(/-/g, "[-\\s]+")}$`, "i") },
        ],
      };
    }
  }
  const teams = await Team.find(query).sort({ createdAt: -1 }).lean();
  return res.json(teams.map(mapTeam));
}

function normalizeMember(member) {
  if (typeof member === "string") {
    const text = normalizeText(member);
    return text || null;
  }
  if (member && typeof member === "object") {
    const fullName = normalizeText(member.fullName || member.name || "");
    const registrationNumber = member.registrationNumber || member.registrationNo || member.regNo ? normalizeText(String(member.registrationNumber || member.registrationNo || member.regNo)).toUpperCase() : "";
    const phone = normalizeText(member.phone || "");
    const semester = normalizeText(member.semester || "");
    const profilePhoto = typeof member.profilePhoto === "string" ? member.profilePhoto : "";
    if (!fullName && !registrationNumber) return null;
    return {
      fullName: fullName || undefined,
      registrationNo: registrationNumber || undefined,
      registrationNumber: registrationNumber || undefined,
      phone: phone || undefined,
      semester: semester || undefined,
      profilePhoto: profilePhoto || undefined,
    };
  }
  return null;
}

function hasTeamMatchOnDate(payload, fixtures) {
  const teamIds = [payload.teamA, payload.teamB].filter(Boolean).map(String);
  if (teamIds.length === 0) return false;

  return fixtures.some((fixture) => {
    if (fixture.status === "cancelled" || fixture.date !== payload.date) return false;
    const existingTeamIds = [fixture.teamA?.toString?.(), fixture.teamB?.toString?.()].filter(Boolean);
    return teamIds.some((teamId) => existingTeamIds.includes(teamId));
  });
}

async function syncTeamPlayers(team) {
  await Player.deleteMany({ teamId: team._id });

  const members = Array.isArray(team.members) ? team.members : [];
  const playerDocs = members
    .map((member) => {
      const normalized = normalizeMember(member);
      if (!normalized) return null;
      const memberName = typeof normalized === "string" ? normalized : normalized.fullName;
      if (!memberName) return null;

      return {
        name: memberName,
        registrationNo: typeof normalized === "string" ? "" : normalized.registrationNo || normalized.registrationNumber || "",
        department: team.department,
        semester: typeof normalized === "string" ? "" : normalized.semester || "",
        phone: typeof normalized === "string" ? "" : normalized.phone || "",
        profilePhoto: typeof normalized === "string" ? "" : normalized.profilePhoto || "",
        sportId: team.sportId,
        teamId: team._id,
        isCaptain: Boolean(team.captainName && memberName === team.captainName),
      };
    })
    .filter(Boolean);

  if (playerDocs.length > 0) {
    await Player.insertMany(playerDocs);
  }
}

export async function createTeam(req, res) {
  const teamName = normalizeText(req.body.name || req.body.teamName);
  const department = normalizeText(req.body.department || req.body.name || req.body.teamName);
  const sport = normalizeSport(req.body.sport);

  if (!teamName || !department || !sport) {
    return res.status(400).json({ message: "Team name, department, and sport are required" });
  }

  assertSportAccess(req, sport);

  const sportDoc = await getOrCreateSport(sport);
  const team = await Team.create({
    teamName,
    department,
    sport,
    sportName: sportDoc.name,
    sportId: sportDoc._id,
    captainName: normalizeText(req.body.coachCaptain || req.body.captainName),
    captainRegNo: req.body.captainRegNo ? normalizeText(req.body.captainRegNo).toUpperCase() : "",
    contactNumber: normalizeText(req.body.contactNumber || req.body.phone),
    members: Array.isArray(req.body.members) ? req.body.members.map(normalizeMember) : [],
    logo: req.body.logo || "",
    status: req.body.status || "approved",
    wins: Number(req.body.wins || 0),
    losses: Number(req.body.losses || 0),
    draws: Number(req.body.draws || 0),
    points: Number(req.body.points || 0),
    registeredAt: Number(req.body.registeredAt || Date.now()),
    playerRegisteredAt: Array.isArray(req.body.playerRegisteredAt) ? req.body.playerRegisteredAt : [],
    createdBy: req.user?.id,
  });

  try {
    await syncTeamPlayers(team);
  } catch (err) {
    console.error("Failed to create player docs for team:", err);
  }

  return res.status(201).json(mapTeam(team));
}

export async function updateTeam(req, res) {
  requireObjectId(req.params.id, "Team id");

  const existingTeam = await Team.findById(req.params.id);
  if (!existingTeam) return res.status(404).json({ message: "Team not found" });

  const sport = req.body.sport ? normalizeSport(req.body.sport) : existingTeam.sport;
  const sportDoc = await getOrCreateSport(sport);

  existingTeam.set({
    teamName: normalizeText(req.body.name || req.body.teamName || existingTeam.teamName),
    department: normalizeText(req.body.department || existingTeam.department),
    sport,
    sportName: sportDoc.name,
    sportId: sportDoc._id,
    captainName: normalizeText(req.body.coachCaptain || req.body.captainName || existingTeam.captainName),
    captainRegNo: req.body.captainRegNo ? normalizeText(req.body.captainRegNo).toUpperCase() : existingTeam.captainRegNo,
    contactNumber: normalizeText(req.body.contactNumber || existingTeam.contactNumber),
    members: Array.isArray(req.body.members) ? req.body.members.map(normalizeMember).filter(Boolean) : existingTeam.members,
    logo: req.body.logo ?? existingTeam.logo,
    status: req.body.status || existingTeam.status,
    wins: Number(req.body.wins ?? existingTeam.wins ?? 0),
    losses: Number(req.body.losses ?? existingTeam.losses ?? 0),
    draws: Number(req.body.draws ?? existingTeam.draws ?? 0),
    points: Number(req.body.points ?? existingTeam.points ?? 0),
    registeredAt: Number(req.body.registeredAt || existingTeam.registeredAt || Date.now()),
    playerRegisteredAt: Array.isArray(req.body.playerRegisteredAt) ? req.body.playerRegisteredAt : existingTeam.playerRegisteredAt,
  });

  await existingTeam.save();
  try {
    await syncTeamPlayers(existingTeam);
  } catch (err) {
    console.error("Failed to sync player docs for team:", err);
  }
  return res.json(mapTeam(existingTeam));
}

export async function deleteTeam(req, res) {
  requireObjectId(req.params.id, "Team id");
  const team = await Team.findById(req.params.id);
  if (!team) return res.status(404).json({ message: "Team not found" });

  const fixtures = await Fixture.find({ $or: [{ teamA: team._id }, { teamB: team._id }] }).lean();
  const fixtureResult = fixtures.length ? await deleteFixtureDocuments(fixtures, req) : { deletedCount: 0 };

  const registrationQuery = {
    teamName: team.teamName,
    department: team.department,
    ...(team.sportId ? { sportId: team.sportId } : { sport: team.sport }),
    ...(team.tournamentId ? { tournamentId: team.tournamentId } : {}),
    ...(team.category ? { category: team.category } : {}),
  };

  const [playerDeleteResult, registrationDeleteResult] = await Promise.all([
    Player.deleteMany({ teamId: team._id }),
    TeamRegistration.deleteMany(registrationQuery),
  ]);
  await Team.deleteOne({ _id: team._id });

  return res.json({
    message: "Team deleted successfully",
    deletedPlayers: playerDeleteResult.deletedCount || 0,
    deletedRegistrations: registrationDeleteResult.deletedCount || 0,
    deletedFixtures: fixtureResult.deletedCount || 0,
  });
}

export async function listFixtures(req, res) {
  const assignedSport = getAssignedSport(req);
  const query = req.user?.role === "volunteer" && assignedSport ? { sport: assignedSport } : {};
  const fixtures = await Fixture.find(query).sort({ date: 1, time: 1 }).lean();
  return res.json(fixtures.map(mapFixture));
}

export async function replaceFixtures(req, res) {
  const fixtures = Array.isArray(req.body.fixtures) ? req.body.fixtures : [];

  const existingFixtures = await Fixture.find({}).lean();
  if (existingFixtures.length > 0) {
    await deleteFixtureDocuments(existingFixtures, req);
  }

  const createdFixtures = [];
  for (const fixture of fixtures) {
    requireObjectId(fixture.teamA, "Team A id");
    requireObjectId(fixture.teamB, "Team B id");

    const [teamA, teamB] = await Promise.all([
      Team.findById(fixture.teamA),
      Team.findById(fixture.teamB),
    ]);

    if (!teamA || !teamB) continue;

    const sport = normalizeSport(fixture.sport || teamA.sport);
    const sportDoc = await getOrCreateSport(sport);
    let category;
    try {
      category = assertSupportedMatchCategory(fixture.category || teamA.category, sportDoc);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    if (teamA.category !== category || teamB.category !== category) {
      return res.status(400).json({ message: "Both teams must belong to the selected match category" });
    }

    const created = await Fixture.create({
      sport,
      sportName: sportDoc.name,
      sportId: sportDoc._id,
      category,
      matchTitle: `${teamA.teamName} vs ${teamB.teamName}`,
      teamA: teamA._id,
      teamB: teamB._id,
      teamAName: teamA.teamName,
      teamBName: teamB.teamName,
      date: fixture.date,
      time: fixture.time,
      fullMatchSeconds: parsePositiveMinutes(fixture.fullMatchMinutes || fixture.matchDurationMinutes || 90, "Full match time") * 60,
      matchGapMinutes: Math.max(0, Math.floor(Number(fixture.matchGapMinutes || fixture.gapMinutes || 0))),
      venue: fixture.venue,
      status: fixture.status === "completed" ? "completed" : fixture.status === "live" ? "live" : "upcoming",
      scoreA: Number(fixture.scoreA || 0),
      scoreB: Number(fixture.scoreB || 0),
      endedAt: fixture.endedAt,
    });

    createdFixtures.push(mapFixture(created));
  }

  return res.status(201).json(createdFixtures);
}

export async function createFixture(req, res) {
  requireObjectId(req.body.teamA, "Team A id");
  requireObjectId(req.body.teamB, "Team B id");

  const [teamA, teamB] = await Promise.all([
    Team.findById(req.body.teamA),
    Team.findById(req.body.teamB),
  ]);

  if (!teamA || !teamB) {
    return res.status(400).json({ message: "Both teams must exist" });
  }

  const sportId = req.body.sportId || teamA.sportId;
  requireObjectId(sportId, "Sport id");
  const sportDoc = await Sport.findById(sportId);
  if (!sportDoc) return res.status(400).json({ message: "Sport not found" });

  let category;
  try {
    category = assertSupportedMatchCategory(req.body.category || teamA.category, sportDoc);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  if (teamA.category !== category || teamB.category !== category) {
    return res.status(400).json({ message: "Both teams must belong to the selected match category" });
  }

  const sportName = sportDoc.sportName || sportDoc.name;
  const payload = {
    sport: normalizeSport(sportName),
    sportName,
    sportId: sportDoc._id,
    category,
    matchTitle: normalizeText(req.body.matchTitle || `${teamA.teamName} vs ${teamB.teamName}`),
    teamA: teamA._id,
    teamB: teamB._id,
    teamAName: teamA.teamName,
    teamBName: teamB.teamName,
    departmentA: teamA.department,
    departmentB: teamB.department,
    venue: normalizeText(req.body.venue),
    date: req.body.date,
    time: req.body.time,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    fullMatchSeconds: parsePositiveMinutes(req.body.fullMatchMinutes || req.body.matchDurationMinutes || 90, "Full match time") * 60,
    matchGapMinutes: Math.max(0, Math.floor(Number(req.body.matchGapMinutes || req.body.gapMinutes || 0))),
    round: normalizeText(req.body.round),
    status: req.body.status || "upcoming",
    assignedVolunteer: req.body.assignedVolunteer || undefined,
    createdBy: req.user?.id,
  };

  const { start, end } = await assertFixtureNoClash(payload);
  const fixture = await Fixture.create({ ...payload, startTime: start, endTime: end });
  return res.status(201).json(mapFixture(fixture));
}

export async function generateFixtures(req, res) {
  requireObjectId(req.body.tournamentId, "Tournament id");
  requireObjectId(req.body.sportId, "Sport id");

  const [tournament, sportDoc] = await Promise.all([
    Tournament.findById(req.body.tournamentId),
    Sport.findById(req.body.sportId),
  ]);

  if (!tournament) return res.status(400).json({ message: "Tournament not found" });
  if (!sportDoc) return res.status(400).json({ message: "Sport not found" });
  let category;
  try {
    category = assertSupportedMatchCategory(req.body.category, sportDoc);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const venueName = normalizeText(req.body.venue);
  if (!venueName && !req.body.venueId) {
    return res.status(400).json({ message: "Venue is required" });
  }

  let selectedVenueName = venueName;
  if (req.body.venueId) {
    requireObjectId(req.body.venueId, "Venue id");
    const venueDoc = await Venue.findById(req.body.venueId).lean();
    if (!venueDoc) return res.status(400).json({ message: "Venue not found" });
    selectedVenueName = venueDoc.name;
  }

  const startDate = parseDateOnly(req.body.startDate);
  const endDate = req.body.endDate ? parseDateOnly(req.body.endDate) : null;
  const dayStartMinutes = parseTimeToMinutes(req.body.dayStartTime, "Day start time");
  const dayEndMinutes = parseTimeToMinutes(req.body.dayEndTime, "Day end time");
  const matchDurationMinutes = parsePositiveMinutes(req.body.matchDurationMinutes, "Match duration");
  const rawGapMinutes = Number(req.body.gapMinutes || 0);
  const gapMinutes = Number.isFinite(rawGapMinutes) && rawGapMinutes > 0 ? Math.floor(rawGapMinutes) : 0;
  const derivedDailyCapacity = Math.floor((dayEndMinutes - dayStartMinutes + gapMinutes) / (matchDurationMinutes + gapMinutes));
  const matchesPerDay = req.body.matchesPerDay === undefined || req.body.matchesPerDay === ""
    ? derivedDailyCapacity
    : parsePositiveMinutes(req.body.matchesPerDay, "Matches per day");

  if (dayEndMinutes <= dayStartMinutes) {
    return res.status(400).json({ message: "Day end time must be after day start time" });
  }

  if (dayStartMinutes + matchDurationMinutes > dayEndMinutes) {
    return res.status(400).json({ message: "The match duration does not fit inside the selected day window" });
  }
  if (matchesPerDay > derivedDailyCapacity) return res.status(400).json({ message: `Unable to generate fixtures: ${matchesPerDay} matches do not fit between the selected start and end times.` });
  if (endDate && endDate < startDate) return res.status(400).json({ message: "End date must be on or after start date" });

  const sportName = sportDoc.sportName || sportDoc.name || "";
  const sport = normalizeSport(sportName);
  await syncApprovedRegistrationsForFixtureGeneration({
    tournament,
    sportDoc,
    category,
    sportName,
    userId: req.user?.id,
  });

  const teams = await Team.find({
    status: "approved",
    tournamentId: tournament._id,
    category,
    $or: [
      { sportId: sportDoc._id },
      { sport },
    ],
  }).sort({ teamName: 1 }).lean();

  if (teams.length === 0) {
    return res.status(400).json({ message: "At least one approved team is required to generate fixtures" });
  }

  const byeFixtures = [];
  if (teams.length === 1) {
    byeFixtures.push(buildByeFixturePayload({
      team: teams[0],
      sportDoc,
      tournament,
      venueName: selectedVenueName,
      category,
      date: startDate,
      round: "Default Winner",
      userId: req.user?.id,
    }));
  }

  const isRoundRobinSport = usesRoundRobin(sportName);
  const competitionFixtures = teams.length > 1
    ? isRoundRobinSport
      ? buildRoundRobinFixtures(teams)
      : buildTournamentBracketFixtures(teams)
    : [];
  const existingFixtures = await Fixture.find({ status: { $ne: "cancelled" } }).lean();
  const scheduledFixtures = [...byeFixtures];
  let cursorDate = new Date(startDate);
  let cursorMinutes = dayStartMinutes;

  for (const competitionFixture of competitionFixtures) {
    let placed = false;

    for (let dayOffset = 0; dayOffset < 365 && !placed; dayOffset += 1) {
      if (endDate && cursorDate > endDate) break;
      while (!isWeekend(cursorDate)) {
        cursorDate.setDate(cursorDate.getDate() + 1);
        cursorMinutes = dayStartMinutes;
        if (endDate && cursorDate > endDate) break;
      }
      if (endDate && cursorDate > endDate) break;

      if (getSportDateMatchCount(toDateInputValue(cursorDate), sportDoc, [...existingFixtures, ...scheduledFixtures]) >= matchesPerDay) {
        cursorDate.setDate(cursorDate.getDate() + 1);
        cursorMinutes = dayStartMinutes;
        continue;
      }

      if (cursorMinutes + matchDurationMinutes > dayEndMinutes) {
        cursorDate.setDate(cursorDate.getDate() + 1);
        cursorMinutes = dayStartMinutes;
        continue;
      }

      const payload = buildFixturePayload({
        teamA: competitionFixture.teamA,
        teamB: competitionFixture.teamB,
        sportDoc,
        tournament,
        venueName: selectedVenueName,
        category,
        date: cursorDate,
        startMinutes: cursorMinutes,
        durationMinutes: matchDurationMinutes,
        gapMinutes,
        round: competitionFixture.round,
        matchNumber: competitionFixture.matchNumber,
        userId: req.user?.id,
      });

      if (
        !hasTeamMatchOnDate(payload, [...existingFixtures, ...scheduledFixtures]) &&
        !hasFixtureClash(payload, [...existingFixtures, ...scheduledFixtures])
      ) {
        scheduledFixtures.push(payload);
        cursorMinutes += matchDurationMinutes + gapMinutes;
        placed = true;
        break;
      }

      cursorMinutes += matchDurationMinutes + gapMinutes;
    }

    if (!placed) {
      return res.status(400).json({
        message: `Unable to generate fixtures with the selected schedule. ${getParticipantName(competitionFixture.teamA, "Team A")} vs ${getParticipantName(competitionFixture.teamB, "Team B")} cannot be placed without a clash${endDate ? " before the selected end date" : " within the next 365 weekend days"}.`,
      });
    }
  }

  const createdFixtures = scheduledFixtures.length ? await Fixture.insertMany(scheduledFixtures) : [];
  if (createdFixtures.length > 0) {
    await Announcement.create({
      title: `${category} ${sportName || "Sport"} Fixtures Published`,
      message: `${createdFixtures.length} ${category} ${sportName || "sport"} fixture${createdFixtures.length === 1 ? "" : "s"} for ${tournament.name} ${createdFixtures.length === 1 ? "has" : "have"} been published.`,
      priority: "important",
      visibleToPublic: true,
      postedBy: req.user?.id,
      postedByRole: req.user?.role || "supercoordinator",
    });
  }

  return res.status(201).json({
    message: teams.length === 1
      ? `${teams[0].teamName} marked as default winner.`
      : `Generated ${createdFixtures.length} ${isRoundRobinSport ? "round robin" : "knockout"} fixture${createdFixtures.length === 1 ? "" : "s"}${byeFixtures.length ? " including bye/default winner entries" : ""}.`,
    totalMatches: createdFixtures.length,
    fixtures: createdFixtures.map(mapFixture),
  });
}

export async function updateFixture(req, res) {
  requireObjectId(req.params.id, "Fixture id");
  const existing = await Fixture.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Fixture not found" });

  let category = existing.category;
  if (req.body.category !== undefined) {
    const sportDoc = await Sport.findById(existing.sportId);
    try {
      category = assertSupportedMatchCategory(req.body.category, sportDoc);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const [teamA, teamB] = await Promise.all([Team.findById(existing.teamA).lean(), Team.findById(existing.teamB).lean()]);
    if (!teamA || !teamB || teamA.category !== category || teamB.category !== category) {
      return res.status(400).json({ message: "Both teams must belong to the selected match category" });
    }
  }

  const updatePayload = {
    ...existing.toObject(),
    ...req.body,
  };

  if (req.body.date || req.body.time || req.body.startTime || req.body.endTime || req.body.venue || req.body.assignedVolunteer) {
    try {
      await validateRescheduleCandidate(updatePayload, req.params.id, {
        maxMatchesPerDay: req.body.maxMatchesPerDay,
        minRestMinutes: req.body.minRestMinutes,
      });
    } catch (error) {
      const suggestions = await suggestRescheduleSlots(updatePayload, req.params.id, {
        maxSuggestions: 5,
        daysToScan: 21,
      });
      return res.status(400).json({
        message: error.message,
        suggestions,
      });
    }
  }

  const { start, end } = await assertFixtureNoClash(updatePayload, req.params.id);

  const fixture = await Fixture.findByIdAndUpdate(
    req.params.id,
    {
      date: req.body.date ?? existing.date,
      time: req.body.time ?? existing.time,
      venue: req.body.venue ?? existing.venue,
      startTime: start,
      endTime: end,
      fullMatchSeconds: existing.fullMatchSeconds || 90 * 60,
      matchGapMinutes: existing.matchGapMinutes || 0,
      assignedVolunteer: req.body.assignedVolunteer ?? existing.assignedVolunteer,
      category,
      status: req.body.status === "completed" ? "completed" : req.body.status === "live" ? "live" : "upcoming",
      scoreA: Number(req.body.scoreA || 0),
      scoreB: Number(req.body.scoreB || 0),
      endedAt: req.body.endedAt,
    },
    { new: true }
  );

  if (!fixture) return res.status(404).json({ message: "Fixture not found" });
  return res.json(mapFixture(fixture));
}

export async function rescheduleFixture(req, res) {
  requireObjectId(req.params.id, "Fixture id");
  const fixture = await Fixture.findById(req.params.id).lean();
  if (!fixture) return res.status(404).json({ message: "Fixture not found" });

  const candidate = {
    ...fixture,
    ...req.body,
    date: req.body.date || fixture.date,
    time: req.body.time || fixture.time || "09:00",
    venue: req.body.venue ?? fixture.venue,
    assignedVolunteer: req.body.assignedVolunteer ?? fixture.assignedVolunteer,
    fullMatchSeconds: Number(req.body.fullMatchSeconds ?? fixture.fullMatchSeconds ?? 90 * 60),
    matchGapMinutes: Number(req.body.matchGapMinutes ?? fixture.matchGapMinutes ?? 0),
    maxMatchesPerDay: req.body.maxMatchesPerDay,
    minRestMinutes: req.body.minRestMinutes,
  };

  try {
    const { start, end } = await validateRescheduleCandidate(candidate, fixture._id.toString(), {
      maxMatchesPerDay: req.body.maxMatchesPerDay,
      minRestMinutes: req.body.minRestMinutes,
    });
    const updated = await Fixture.findByIdAndUpdate(
      fixture._id,
      {
        date: candidate.date,
        time: candidate.time,
        venue: candidate.venue,
        startTime: start,
        endTime: end,
        assignedVolunteer: candidate.assignedVolunteer,
        fullMatchSeconds: candidate.fullMatchSeconds,
        matchGapMinutes: candidate.matchGapMinutes,
        status: fixture.status === "completed" ? "completed" : fixture.status === "live" ? "live" : "upcoming",
      },
      { new: true }
    );
    return res.json({
      message: "Fixture rescheduled successfully.",
      fixture: updated ? mapFixture(updated) : null,
      suggestions: [],
    });
  } catch (error) {
    const suggestions = await suggestRescheduleSlots(candidate, fixture._id.toString(), {
      maxSuggestions: 5,
      daysToScan: 21,
    });
    return res.status(400).json({
      message: error.message,
      suggestions,
    });
  }
}

export async function bulkRescheduleFixtures(req, res) {
  const fixtureIds = Array.isArray(req.body.fixtureIds) ? req.body.fixtureIds : [];
  if (fixtureIds.length === 0) {
    return res.status(400).json({ message: "At least one fixture must be selected for rescheduling." });
  }

  const fixtures = await Fixture.find({ _id: { $in: fixtureIds } }).lean();
  if (fixtures.length === 0) {
    return res.status(404).json({ message: "No valid fixtures were found for rescheduling." });
  }

  const targetDates = Array.isArray(req.body.targetDates) && req.body.targetDates.length > 0
    ? req.body.targetDates
    : [req.body.date || fixtures[0].date].filter(Boolean);
  const preferredTime = req.body.time || fixtures[0].time || "09:00";
  const allocated = [];

  for (let index = 0; index < fixtures.length; index += 1) {
    const fixture = fixtures[index];
    const preferredDate = targetDates[Math.min(index, targetDates.length - 1)] || targetDates[targetDates.length - 1];
    const candidate = {
      ...fixture,
      date: preferredDate,
      time: preferredTime,
      venue: req.body.venue ?? fixture.venue,
      assignedVolunteer: req.body.assignedVolunteer ?? fixture.assignedVolunteer,
      fullMatchSeconds: Number(req.body.fullMatchSeconds ?? fixture.fullMatchSeconds ?? 90 * 60),
      matchGapMinutes: Number(req.body.matchGapMinutes ?? fixture.matchGapMinutes ?? 0),
      maxMatchesPerDay: req.body.maxMatchesPerDay,
      minRestMinutes: req.body.minRestMinutes,
    };

    try {
      const { start, end } = await validateRescheduleCandidate(candidate, fixture._id.toString(), {
        maxMatchesPerDay: req.body.maxMatchesPerDay,
        minRestMinutes: req.body.minRestMinutes,
      });
      allocated.push({
        fixtureId: fixture._id.toString(),
        date: candidate.date,
        time: candidate.time,
        start,
        end,
        venue: candidate.venue,
        assignedVolunteer: candidate.assignedVolunteer,
      });
    } catch (error) {
      const suggestions = await suggestRescheduleSlots(candidate, fixture._id.toString(), {
        maxSuggestions: 3,
        daysToScan: 28,
      });
      return res.status(400).json({
        message: `Unable to bulk reschedule selected matches. ${error.message}`,
        suggestions,
      });
    }
  }

  const updates = await Promise.all(allocated.map(async (entry) => {
    return Fixture.findByIdAndUpdate(
      entry.fixtureId,
      {
        date: entry.date,
        time: entry.time,
        startTime: entry.start,
        endTime: entry.end,
        venue: entry.venue,
        assignedVolunteer: entry.assignedVolunteer,
      },
      { new: true }
    );
  }));

  return res.json({
    message: `Rescheduled ${updates.length} fixture${updates.length === 1 ? "" : "s"} successfully.`,
    fixtures: updates.filter(Boolean).map((fixture) => mapFixture(fixture)),
  });
}

export async function deleteFixture(req, res) {
  requireObjectId(req.params.id, "Fixture id");
  const fixture = await Fixture.findById(req.params.id).lean();
  if (!fixture) return res.status(404).json({ message: "Fixture not found" });
  const result = await deleteFixtureDocuments([fixture], req);
  return res.json({ message: "Fixture cancelled and deleted successfully", ...result });
}

export async function deleteFixtures(req, res) {
  const fixtureIds = Array.isArray(req.body.fixtureIds) ? req.body.fixtureIds : [];
  const uniqueIds = [...new Set(fixtureIds.map((id) => String(id)))];

  if (uniqueIds.length === 0) {
    return res.status(400).json({ message: "At least one fixture id is required" });
  }

  uniqueIds.forEach((id) => requireObjectId(id, "Fixture id"));

  const fixtures = await Fixture.find({ _id: { $in: uniqueIds } }).lean();
  if (fixtures.length === 0) return res.status(404).json({ message: "Fixtures not found" });

  const result = await deleteFixtureDocuments(fixtures, req);
  return res.json({
    message: `${result.deletedCount} fixture${result.deletedCount === 1 ? "" : "s"} cancelled and deleted successfully`,
    ...result,
  });
}

export async function listPlayers(_req, res) {
  const players = await Player.find().sort({ createdAt: -1 }).lean();
  return res.json(players);
}

export async function updatePlayer(req, res) {
  requireObjectId(req.params.id, "Player id");
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).json({ message: "Player not found" });
  const editable = ["name", "rollNo", "registrationNo", "department", "semester", "phone", "profilePhoto", "isCaptain"];
  for (const key of editable) if (req.body[key] !== undefined) player[key] = req.body[key];
  if (req.body.teamId !== undefined) {
    requireObjectId(req.body.teamId, "Team id");
    const team = await Team.findById(req.body.teamId);
    if (!team) return res.status(400).json({ message: "Assigned team not found" });
    player.teamId = team._id; player.sportId = team.sportId;
  }
  await player.save();
  await audit(req, "Updated player", `${player.name} (${player._id})`);
  return res.json(player);
}

export async function deletePlayer(req, res) {
  requireObjectId(req.params.id, "Player id");
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).json({ message: "Player not found" });
  if (player.teamId) {
    const team = await Team.findById(player.teamId);
    if (team) {
      team.members = (team.members || []).filter((member) => {
        const name = typeof member === "string" ? member : member?.fullName || member?.name;
        const regNo = typeof member === "object" ? member?.registrationNo || member?.registrationNumber : "";
        return name !== player.name && regNo !== player.registrationNo;
      });
      await team.save();
    }
  }
  await player.deleteOne();
  await audit(req, "Deleted player", `${player.name} (${player._id})`);
  return res.json({ message: "Player deleted successfully" });
}
