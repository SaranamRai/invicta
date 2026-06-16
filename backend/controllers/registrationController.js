import TeamRegistration from "../models/TeamRegistration.js";
import Sport from "../models/Sport.js";
import Team from "../models/Team.js";
import Tournament from "../models/Tournament.js";
import Fixture from "../models/Fixture.js";
import LiveFeed from "../models/LiveFeed.js";
import LiveScore from "../models/LiveScore.js";
import Player from "../models/Player.js";
import Result from "../models/Result.js";
import { sendTeamApprovedEmail, getEmailErrorMessage } from "../utils/emailService.js";

const VALID_IMAGE_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
  "data:image/jpg;base64,",
];

function isAllowedImage(value) {
  if (!value || typeof value !== "string") return false;
  return VALID_IMAGE_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function normalizeRegNo(value) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

function getRegNoList(body) {
  const regNos = [normalizeRegNo(body.captainRegNo)];
  if (Array.isArray(body.members)) {
    for (const member of body.members) {
      const no = normalizeRegNo(member.registrationNo || member.registrationNumber || member.regNo || "");
      if (no) regNos.push(no);
    }
  }
  return regNos.filter(Boolean);
}

function getRegistrationRegNos(registration) {
  return getRegNoList({
    captainRegNo: registration.captainRegNo,
    members: registration.members || [],
  });
}

async function findUsedRegNos(regNos, options = {}) {
  const normalizedRegNos = [...new Set(regNos.map(normalizeRegNo).filter(Boolean))];
  if (normalizedRegNos.length === 0) return null;

  const registrationFilter = {
    $or: [
      { captainRegNo: { $in: normalizedRegNos } },
      { "members.registrationNo": { $in: normalizedRegNos } },
      { "members.registrationNumber": { $in: normalizedRegNos } },
      { "members.regNo": { $in: normalizedRegNos } },
    ],
  };
  if (options.excludeRegistrationId) {
    registrationFilter._id = { $ne: options.excludeRegistrationId };
  }

  const teamFilter = {
    $or: [
      { captainRegNo: { $in: normalizedRegNos } },
      { "members.registrationNo": { $in: normalizedRegNos } },
      { "members.registrationNumber": { $in: normalizedRegNos } },
      { "members.regNo": { $in: normalizedRegNos } },
    ],
  };

  const [registration, team, player] = await Promise.all([
    TeamRegistration.findOne(registrationFilter, { captainRegNo: 1, members: 1, teamName: 1, sportName: 1, status: 1 }).lean(),
    Team.findOne(teamFilter, { captainRegNo: 1, members: 1, teamName: 1, sportName: 1, status: 1 }).lean(),
    Player.findOne({ registrationNo: { $in: normalizedRegNos } }, { registrationNo: 1, name: 1 }).lean(),
  ]);

  const sources = [registration, team].filter(Boolean);
  for (const source of sources) {
    const sourceRegNos = getRegistrationRegNos(source);
    const duplicateRegNo = normalizedRegNos.find((regNo) => sourceRegNos.includes(regNo));
    if (duplicateRegNo) {
      return {
        registrationNo: duplicateRegNo,
        teamName: source.teamName || "",
        sportName: source.sportName || "",
      };
    }
  }

  if (player) {
    return {
      registrationNo: normalizeRegNo(player.registrationNo),
      teamName: player.name || "",
      sportName: "",
    };
  }

  return null;
}

export async function submitRegistration(req, res) {
  try {
    const {
      sportId,
      tournamentId,
      tournamentName: rawTournamentName,
      sportName: rawSportName,
      category,
      department,
      teamName,
      teamLogo,
      captainName,
      captainRegNo: rawCaptainRegNo,
      captainEmail,
      captainPhone,
      members: rawMembers,
    } = req.body;

    const trimmedDept = String(department || "").trim().toUpperCase();
    const trimmedTeamName = String(teamName || "").trim();
    const trimmedCaptainName = String(captainName || "").trim();
    const trimmedCaptainEmail = String(captainEmail || "").trim().toLowerCase();
    const trimmedCaptainPhone = String(captainPhone || "").trim();
    const cleanCaptainRegNo = normalizeRegNo(rawCaptainRegNo);

    // Validate required fields
    if (!sportId) return res.status(400).json({ message: "Sport is required" });
    if (!tournamentId) return res.status(400).json({ message: "Tournament is required" });
    if (!category || !["Male", "Female"].includes(category)) {
      return res.status(400).json({ message: "Category must be Male or Female" });
    }
    if (!trimmedDept) return res.status(400).json({ message: "Department is required" });
    if (!trimmedTeamName) return res.status(400).json({ message: "Team name is required" });
    if (!trimmedCaptainName) return res.status(400).json({ message: "Captain name is required" });
    if (!cleanCaptainRegNo) return res.status(400).json({ message: "Captain registration number is required" });
    if (!trimmedCaptainEmail) return res.status(400).json({ message: "Captain email is required" });
    if (!trimmedCaptainPhone) return res.status(400).json({ message: "Captain phone is required" });

    // Validate sport exists
    const [sport, tournament] = await Promise.all([
      Sport.findById(sportId).lean(),
      Tournament.findById(tournamentId).lean(),
    ]);
    if (!sport) return res.status(400).json({ message: "Sport not found" });
    if (!tournament) return res.status(400).json({ message: "Tournament not found" });

    // Validate categories
    const sportCategories = sport.categories || ["Male", "Female"];
    if (!sportCategories.includes(category)) {
      return res.status(400).json({ message: `Category "${category}" is not available for this sport` });
    }

    const sportName = rawSportName || sport.sportName || sport.name || "";
    const tournamentName = rawTournamentName || tournament.name || "";
    const members = Array.isArray(rawMembers) ? rawMembers : [];

    // Validate members
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (!String(member.fullName || "").trim()) {
        return res.status(400).json({ message: `Member ${i + 1} full name is required` });
      }
      const regNo = normalizeRegNo(member.registrationNo || member.registrationNumber || "");
      if (!regNo) {
        return res.status(400).json({ message: `Member ${i + 1} registration number is required` });
      }
    }

    // Check duplicate registration numbers within the same submission
    const allRegNos = getRegNoList(req.body);
    const uniqueRegNos = new Set(allRegNos);
    if (uniqueRegNos.size !== allRegNos.length) {
      return res.status(400).json({ message: "Duplicate registration number found in the same team submission" });
    }

    // Validate team logo
    if (teamLogo && !isAllowedImage(teamLogo)) {
      return res.status(400).json({ message: "Team logo must be a JPEG, PNG, or WebP image" });
    }

    const duplicateRegistration = await findUsedRegNos(allRegNos);
    if (duplicateRegistration) {
      return res.status(409).json({
        message: `Cannot register. Registration number ${duplicateRegistration.registrationNo} is already registered.`,
      });
    }

    // Build members array for storage
    const storedMembers = members.map((member) => ({
      fullName: String(member.fullName || "").trim(),
      registrationNo: normalizeRegNo(member.registrationNo || member.registrationNumber || ""),
      department: String(member.department || trimmedDept).trim(),
      semester: String(member.semester || "").trim(),
      gender: member.gender || category,
      email: String(member.email || "").trim().toLowerCase(),
      phone: String(member.phone || "").trim(),
    }));

    const registration = await TeamRegistration.create({
      sportId,
      tournamentId,
      tournamentName,
      sportName,
      category,
      department: trimmedDept,
      teamName: trimmedTeamName,
      teamLogo: teamLogo || "",
      captainName: trimmedCaptainName,
      captainRegNo: cleanCaptainRegNo,
      captainEmail: trimmedCaptainEmail,
      captainPhone: trimmedCaptainPhone,
      members: storedMembers,
      status: "pending",
      submittedAt: new Date(),
    });

    return res.status(201).json(registration);
  } catch (error) {
    console.error("Registration submission error:", error);
    return res.status(500).json({ message: error.message || "Registration failed" });
  }
}

export async function listPendingRegistrations(_req, res) {
  try {
    const registrations = await TeamRegistration.find({ status: "pending" })
      .sort({ submittedAt: -1 })
      .lean();
    return res.json(registrations);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function listApprovedRegistrations(req, res) {
  try {
    const filter = { status: "approved" };
    if (req.query.tournamentId) filter.tournamentId = String(req.query.tournamentId);
    if (req.query.sportId) filter.sportId = String(req.query.sportId);
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.teamId) filter._id = String(req.query.teamId);

    // Role-based filtering
    if (req.user.role === "coordinator" || req.user.role === "volunteer") {
      const assignedSportId = req.user.assignedSportId;
      if (assignedSportId) {
        filter.sportId = assignedSportId;
      } else {
        // If no assigned sport, use assignedSport string
        const assignedSport = req.user.assignedSport;
        if (assignedSport) {
          const sport = await Sport.findOne({
            $or: [
              { _id: assignedSport },
              { sportName: new RegExp(`^${assignedSport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
            ],
          }).lean();
          if (sport) filter.sportId = sport._id.toString();
        }
      }
    }

    const registrations = await TeamRegistration.find(filter)
      .sort({ reviewedAt: -1, submittedAt: -1 })
      .lean();

    return res.json(registrations);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function approveRegistration(req, res) {
  try {
    const { id } = req.params;
    const reviewedAt = new Date();

    const existingRegistration = await TeamRegistration.findById(id);
    if (!existingRegistration) return res.status(404).json({ message: "Registration not found" });

    const duplicateRegistration = await findUsedRegNos(getRegistrationRegNos(existingRegistration), {
      excludeRegistrationId: existingRegistration._id,
    });
    if (duplicateRegistration) {
      return res.status(409).json({
        message: `Cannot register. Registration number ${duplicateRegistration.registrationNo} is already registered.`,
      });
    }

    existingRegistration.status = "approved";
    existingRegistration.reviewedBy = req.user.id;
    existingRegistration.reviewedAt = reviewedAt;
    existingRegistration.rejectionReason = "";
    const registration = await existingRegistration.save();

    const sportName = registration.sportName || "";
    await Team.findOneAndUpdate(
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
        sport: sportName.trim().toLowerCase().replace(/\s+/g, "-"),
        sportName,
        sportId: registration.sportId,
        tournamentId: registration.tournamentId,
        tournamentName: registration.tournamentName,
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
        reviewedBy: req.user.id,
        reviewedAt,
        rejectionReason: "",
        registeredAt: registration.submittedAt ? new Date(registration.submittedAt).getTime() : Date.now(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let emailResult = { sent: false, skipped: true };
    try {
      emailResult = await sendTeamApprovedEmail({
        teamName: registration.teamName,
        captainName: registration.captainName,
        email: registration.captainEmail,
        sportName,
        tournamentName: registration.tournamentName,
      });
    } catch (emailError) {
      console.error("Team approval email error:", emailError);
      return res.json({
        ...registration.toObject(),
        emailSent: false,
        emailWarning: getEmailErrorMessage(emailError),
      });
    }

    return res.json({
      ...registration.toObject(),
      emailSent: emailResult.sent,
      emailSkipped: emailResult.skipped,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function rejectRegistration(req, res) {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const registration = await TeamRegistration.findByIdAndUpdate(
      id,
      {
        status: "rejected",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        rejectionReason: String(rejectionReason).trim(),
      },
      { new: true }
    );

    if (!registration) return res.status(404).json({ message: "Registration not found" });
    return res.json(registration);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function deleteApprovedRegistration(req, res) {
  try {
    const { id } = req.params;
    const registration = await TeamRegistration.findById(id);

    if (!registration) return res.status(404).json({ message: "Registration not found" });
    if (registration.status !== "approved") {
      return res.status(400).json({ message: "Only approved registrations can be deleted from this list" });
    }

    const teamQuery = {
      sportId: registration.sportId,
      category: registration.category,
      department: registration.department,
      teamName: registration.teamName,
      ...(registration.tournamentId ? { tournamentId: registration.tournamentId } : {}),
    };
    let team = await Team.findOne(teamQuery);
    if (!team) {
      team = await Team.findOne({
        sportId: registration.sportId,
        category: registration.category,
        department: registration.department,
        captainRegNo: registration.captainRegNo,
      });
    }
    if (!team) {
      team = await Team.findOne({
        sportId: registration.sportId,
        category: registration.category,
        department: registration.department,
        teamName: new RegExp(`^${registration.teamName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
    }

    let cancelledMatches = 0;
    if (team) {
      const fixtures = await Fixture.find({ $or: [{ teamA: team._id }, { teamB: team._id }] }).lean();
      const fixtureIds = fixtures.map((fixture) => fixture._id);
      cancelledMatches = fixtureIds.length;

      await Promise.all([
        fixtureIds.length ? LiveScore.deleteMany({ fixtureId: { $in: fixtureIds } }) : Promise.resolve(),
        fixtureIds.length ? LiveFeed.deleteMany({ fixtureId: { $in: fixtureIds } }) : Promise.resolve(),
        fixtureIds.length ? Result.deleteMany({ fixtureId: { $in: fixtureIds } }) : Promise.resolve(),
        fixtureIds.length ? Fixture.deleteMany({ _id: { $in: fixtureIds } }) : Promise.resolve(),
        Player.deleteMany({ teamId: team._id }),
        Team.deleteOne({ _id: team._id }),
      ]);
    }

    await TeamRegistration.deleteOne({ _id: registration._id });

    return res.json({
      message: cancelledMatches
        ? `Team deleted successfully. ${cancelledMatches} related match${cancelledMatches === 1 ? "" : "es"} cancelled.`
        : "Team deleted successfully.",
      cancelledMatches,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function exportApprovedExcel(req, res) {
  try {
    const filters = {};
    if (req.query.tournamentId) filters.tournamentId = String(req.query.tournamentId);
    if (req.query.sportId) filters.sportId = String(req.query.sportId);
    if (req.query.sport) filters.sportId = String(req.query.sport);
    if (req.query.category) filters.category = req.query.category;
    if (req.query.department) filters.department = String(req.query.department).trim().toUpperCase();
    if (req.query.teamId) filters._id = String(req.query.teamId);
    if (req.query.teamName) filters.teamName = String(req.query.teamName).trim();

    filters.status = "approved";

    const registrations = await TeamRegistration.find(filters)
      .sort({ submittedAt: -1 })
      .lean();

    // Build flat rows for Excel
    const rows = [];
    for (const reg of registrations) {
      const base = {
        tournamentName: reg.tournamentName,
        sportName: reg.sportName,
        category: reg.category,
        department: reg.department,
        teamName: reg.teamName,
        teamLogo: reg.teamLogo,
        captainName: reg.captainName,
        captainRegNo: reg.captainRegNo,
        captainEmail: reg.captainEmail,
        captainPhone: reg.captainPhone,
        status: reg.status,
        approvedDate: reg.reviewedAt ? new Date(reg.reviewedAt).toISOString().split("T")[0] : "",
      };

      if (!reg.members || reg.members.length === 0) {
        rows.push(base);
      } else {
        for (const member of reg.members) {
          rows.push({
            ...base,
            memberName: member.fullName,
            memberRegNo: member.registrationNo,
            memberDepartment: member.department,
            memberSemester: member.semester,
            memberGender: member.gender,
          });
        }
      }
    }

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Approved Registrations");

      sheet.columns = [
        { header: "Tournament", key: "tournamentName", width: 24 },
        { header: "Sport Name", key: "sportName", width: 20 },
        { header: "Category", key: "category", width: 12 },
        { header: "Department", key: "department", width: 20 },
        { header: "Team Name", key: "teamName", width: 25 },
        { header: "Team Logo URL/Data", key: "teamLogo", width: 28 },
        { header: "Captain Name", key: "captainName", width: 20 },
        { header: "Captain Registration No", key: "captainRegNo", width: 20 },
        { header: "Captain Email", key: "captainEmail", width: 30 },
        { header: "Captain Phone", key: "captainPhone", width: 18 },
        { header: "Member Name", key: "memberName", width: 20 },
        { header: "Member Registration No", key: "memberRegNo", width: 20 },
        { header: "Member Department", key: "memberDepartment", width: 20 },
        { header: "Member Semester", key: "memberSemester", width: 15 },
        { header: "Member Gender", key: "memberGender", width: 12 },
        { header: "Registration Status", key: "status", width: 18 },
        { header: "Approved Date", key: "approvedDate", width: 15 },
      ];

      sheet.addRows(rows);

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCD34D" },
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=approved-registrations.xlsx");

      await workbook.xlsx.write(res);
      res.end();
    } catch (importError) {
      return res.status(500).json({ message: "Excel export requires the exceljs package" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
