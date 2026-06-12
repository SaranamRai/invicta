export interface Team {
  id: string;
  name: string;
  sport: string;
  sportName?: string;
  tournamentId?: string;
  tournamentName?: string;
  category?: string;
  members: string[];
  department?: string;
  coachCaptain?: string;
  contactNumber?: string;
  logo?: string;
  status?: "approved" | "pending" | "rejected";
  wins?: number;
  losses?: number;
  draws?: number;
  points?: number;
  registeredAt?: number;
  playerRegisteredAt?: number[];
}

export interface Fixture {
  id: string;
  teamA: string;
  teamB: string;
  sport: string;
  date: string;
  time: string;       // match start time (HH:MM)
  endTime?: string;   // match end time (HH:MM) — set manually by admin
  endedAt?: string;   // ISO timestamp of when admin clicked "End Match"
  venue: string;
  status: "scheduled" | "live" | "completed";
  scoreA?: number;
  scoreB?: number;
}

/**
 * Generate fixtures with intelligent scheduling to prevent team collisions
 * A team or department cannot be scheduled for multiple sports at the same date/time.
 */
export function generateFixtures(
  teams: Team[],
  startDate: string,
  timeslots: string[]
): Fixture[] {
  const fixtures: Fixture[] = [];
  const teamsBySport = groupTeamsBySport(teams);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const usedSlots = new Map<string, Set<string>>();

  let fixtureId = 1;

  // For each sport, generate fixtures
  for (const [sport, sportTeams] of Object.entries(teamsBySport)) {
    if (sportTeams.length < 2) continue;

    const sportFixtures = generateRoundRobinFixtures(sportTeams);

    // Assign dates and times to fixtures
    for (const fixture of sportFixtures) {
      const slot = findAvailableSlot(
        fixture,
        startDate,
        timeslots,
        usedSlots,
        teamsById
      );

      if (slot) {
        const key = `${slot.date}-${slot.time}`;
        if (!usedSlots.has(key)) {
          usedSlots.set(key, new Set());
        }
        getFixtureConflictKeys(fixture, teamsById).forEach((conflictKey) => {
          usedSlots.get(key)!.add(conflictKey);
        });

        fixtures.push({
          id: `fixture-${fixtureId++}`,
          teamA: fixture.teamA,
          teamB: fixture.teamB,
          sport,
          date: slot.date,
          time: slot.time,
          venue: slot.venue,
          status: "scheduled",
        });
      }
    }
  }

  return fixtures;
}

function groupTeamsBySport(teams: Team[]): Record<string, Team[]> {
  return teams.reduce(
    (acc, team) => {
      if (!acc[team.sport]) {
        acc[team.sport] = [];
      }
      acc[team.sport].push(team);
      return acc;
    },
    {} as Record<string, Team[]>
  );
}

function generateRoundRobinFixtures(teams: Team[]): Array<{ teamA: string; teamB: string }> {
  const fixtures: Array<{ teamA: string; teamB: string }> = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      fixtures.push({
        teamA: teams[i].id,
        teamB: teams[j].id,
      });
    }
  }

  return fixtures;
}

function normalizeConflictValue(value?: string) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() || "";
}

function getTeamConflictKeys(teamId: string, teamsById: Map<string, Team>) {
  const team = teamsById.get(teamId);
  const teamName = normalizeConflictValue(team?.name || teamId);
  const department = normalizeConflictValue(team?.department || team?.name || teamId);

  return [
    `team:${teamId}`,
    `team-name:${teamName}`,
    `department:${department}`,
  ];
}

function getFixtureConflictKeys(
  fixture: { teamA: string; teamB: string },
  teamsById: Map<string, Team>
) {
  return [
    ...getTeamConflictKeys(fixture.teamA, teamsById),
    ...getTeamConflictKeys(fixture.teamB, teamsById),
  ];
}

interface TimeSlot {
  date: string;
  time: string;
  venue: string;
}

function findAvailableSlot(
  fixture: { teamA: string; teamB: string },
  startDate: string,
  timeslots: string[],
  usedSlots: Map<string, Set<string>>,
  teamsById: Map<string, Team>
): TimeSlot | null {
  const startDateObj = new Date(startDate);
  const currentDate = new Date(startDateObj);

  // Try to find a slot within 30 days
  for (let day = 0; day < 30; day++) {
    const dateStr = currentDate.toISOString().split("T")[0];

    for (const time of timeslots) {
      const key = `${dateStr}-${time}`;
      const occupiedConflictKeys = usedSlots.get(key) || new Set();
      const fixtureConflictKeys = getFixtureConflictKeys(fixture, teamsById);
      const hasConflict = fixtureConflictKeys.some((conflictKey) => occupiedConflictKeys.has(conflictKey));

      if (!hasConflict) {
        const venues = ["Ground A", "Ground B", "Court 1", "Court 2"];
        const venue = venues[day % venues.length];
        return { date: dateStr, time, venue };
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return null;
}
