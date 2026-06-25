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
import { normalizeRegNo, isValidEmail } from "../utils/regNoHelper.js";
import { buildVerifiedStatus, verifyIdCardRequest, verifyRegistrationToken } from "../utils/idVerification.js";

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

function buildAllPlayers({ captainName, captainEmail, captainRegNo, captainIdVerification, members }) {
  return [
    {
      name: captainName,
      email: captainEmail,
      registrationNumber: captainRegNo,
      role: "captain",
      idVerified: Boolean(captainIdVerification?.verified),
      idVerificationStatus: captainIdVerification?.status || "pending",
    },
    ...(members || []).map((member) => ({
      name: member.fullName,
      email: member.email || "",
      registrationNumber: member.registrationNo,
      role: "member",
      idVerified: Boolean(member.idVerification?.verified),
      idVerificationStatus: member.idVerification?.status || "pending",
    })),
  ];
}

function getApprovalBlockMessage(registration) {
  const players = Array.isArray(registration.allPlayers) ? registration.allPlayers : [];
  if (players.length === 0) return "";
  if (players.some((player) => player.idVerificationStatus === "mismatch")) {
    return "Cannot approve team. One or more players have ID mismatch.";
  }
  if (players.some((player) => player.idVerificationStatus === "manual_review")) {
    return "One or more players require manual ID verification.";
  }
  if (players.some((player) => !player.idVerified || player.idVerificationStatus !== "verified")) {
    return "Cannot approve team. ID verification is required for every player.";
  }
  return "";
}

function getVerifiedStatusOrError({ token, registrationNumber, playerRole, playerIndex }) {
  const payload = verifyRegistrationToken(token, { registrationNumber, playerRole, playerIndex });
  if (!payload) {
    return { error: "ID verification is required for every player." };
  }
  return { value: buildVerifiedStatus(payload) };
}

export async function verifyIdCard(req, res) {
  try {
    const result = await verifyIdCardRequest(req);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    console.error("ID card verification error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Could not verify ID card." });
  }
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
      captainVerificationToken,
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
    if (!isValidEmail(trimmedCaptainEmail)) return res.status(400).json({ message: "Captain email is invalid" });
    if (!trimmedCaptainPhone) return res.status(400).json({ message: "Captain phone is required" });

    const captainVerification = getVerifiedStatusOrError({
      token: captainVerificationToken,
      registrationNumber: cleanCaptainRegNo,
      playerRole: "captain",
      playerIndex: 0,
    });
    if (captainVerification.error) {
      return res.status(400).json({ message: captainVerification.error });
    }

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
    const minPlayers = Math.max(1, Number(sport.minPlayers || 1));
    const maxPlayers = Math.max(minPlayers, Number(sport.maxPlayers || minPlayers));
    const minMembers = Math.max(0, minPlayers - 1);
    const maxMembers = Math.max(minMembers, maxPlayers - 1);
    if (members.length < minMembers || members.length > maxMembers) {
      return res.status(400).json({ message: `${sportName} requires ${minPlayers} to ${maxPlayers} total players including the captain.` });
    }

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
      const memberEmail = String(member.email || "").trim().toLowerCase();
      if (!memberEmail) {
        return res.status(400).json({ message: `Member ${i + 1} email is required` });
      }
      if (!isValidEmail(memberEmail)) {
        return res.status(400).json({ message: `Member ${i + 1} email is invalid` });
      }
      const memberVerification = getVerifiedStatusOrError({
        token: member.verificationToken,
        registrationNumber: regNo,
        playerRole: "member",
        playerIndex: i,
      });
      if (memberVerification.error) {
        return res.status(400).json({ message: memberVerification.error });
      }
    }

    // Check duplicate registration numbers within the same submission
    const allRegNos = getRegNoList(req.body);
    const uniqueRegNos = new Set(allRegNos);
    if (uniqueRegNos.size !== allRegNos.length) {
      return res.status(400).json({ message: "Duplicate registration number found in the same team submission" });
    }

    const emails = [trimmedCaptainEmail, ...members.map((member) => String(member.email || "").trim().toLowerCase()).filter(Boolean)];
    if (new Set(emails).size !== emails.length) {
      return res.status(400).json({ message: "This email is already used by another player." });
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
    const storedMembers = members.map((member, index) => ({
      fullName: String(member.fullName || "").trim(),
      registrationNo: normalizeRegNo(member.registrationNo || member.registrationNumber || ""),
      department: String(member.department || trimmedDept).trim(),
      semester: String(member.semester || "").trim(),
      gender: member.gender || category,
      email: String(member.email || "").trim().toLowerCase(),
      phone: String(member.phone || "").trim(),
      idVerification: getVerifiedStatusOrError({
        token: member.verificationToken,
        registrationNumber: member.registrationNo || member.registrationNumber || "",
        playerRole: "member",
        playerIndex: index,
      }).value,
    }));
    const captainIdVerification = captainVerification.value;
    const allPlayers = buildAllPlayers({
      captainName: trimmedCaptainName,
      captainEmail: trimmedCaptainEmail,
      captainRegNo: cleanCaptainRegNo,
      captainIdVerification,
      members: storedMembers,
    });

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
      captainIdVerification,
      members: storedMembers,
      allPlayers,
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

    const approvalBlockMessage = getApprovalBlockMessage(existingRegistration);
    if (approvalBlockMessage) {
      return res.status(400).json({ message: approvalBlockMessage });
    }

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
    const emailRecipients = [
      registration.captainEmail,
      ...(registration.members || []).map((member) => member.email),
    ]
      .map((email) => String(email || "").trim().toLowerCase())
      .filter(Boolean);
    const uniqueRecipients = [...new Set(emailRecipients)];
    const failedEmails = [];
    try {
      for (const email of uniqueRecipients) {
        try {
          const result = await sendTeamApprovedEmail({
            teamName: registration.teamName,
            captainName: registration.captainName,
            email,
            sportName,
            tournamentName: registration.tournamentName,
          });
          emailResult = {
            sent: Boolean(emailResult.sent || result.sent),
            skipped: Boolean(emailResult.skipped && result.skipped),
          };
        } catch (emailError) {
          failedEmails.push({ email, message: getEmailErrorMessage(emailError) });
          console.error("Team approval email recipient error:", email, emailError);
        }
      }
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
      emailFailedCount: failedEmails.length,
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
    if (req.query.sportId && req.query.sportId !== "all") filters.sportId = String(req.query.sportId);
    if (req.query.sport && req.query.sport !== "all") filters.sportId = String(req.query.sport);
    if (req.query.category) filters.category = req.query.category;
    if (req.query.department) filters.department = String(req.query.department).trim().toUpperCase();
    if (req.query.teamId) filters._id = String(req.query.teamId);
    if (req.query.teamName) filters.teamName = String(req.query.teamName).trim();

    filters.status = "approved";

    const registrations = await TeamRegistration.find(filters)
      .sort({ submittedAt: -1 })
      .lean();

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const exportTitle = "Approved Team Registrations";
      const filterSummary = [
        req.query.tournamentName ? `Tournament: ${req.query.tournamentName}` : req.query.tournamentId ? `Tournament ID: ${req.query.tournamentId}` : "Tournament: All",
        req.query.sportName ? `Sport: ${req.query.sportName}` : filters.sportId ? `Sport ID: ${filters.sportId}` : "Sport: All sports",
        filters.category ? `Category: ${filters.category}` : "Category: Male and Female",
      ];

      const summary = workbook.addWorksheet("Summary");
      summary.columns = [
        { header: "Field", key: "field", width: 24 },
        { header: "Value", key: "value", width: 48 },
      ];
      summary.addRows([
        { field: "Report", value: exportTitle },
        { field: "Generated At", value: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) },
        { field: "Filters", value: filterSummary.join(" | ") },
        { field: "Total Teams", value: registrations.length },
        { field: "Total Players", value: registrations.reduce((sum, reg) => sum + (reg.members?.length || 0), 0) },
      ]);

      const styleHeader = (sheet) => {
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, size: 11, color: { argb: "FF111827" } };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCD34D" },
        };
        headerRow.alignment = { vertical: "middle", wrapText: true };
        sheet.views = [{ state: "frozen", ySplit: 1 }];
      };

      const addTeamColumns = (sheet) => {
        sheet.columns = [
          { header: "Tournament", key: "tournamentName", width: 24 },
          { header: "Sport", key: "sportName", width: 20 },
          { header: "Category", key: "category", width: 12 },
          { header: "Department", key: "department", width: 16 },
          { header: "Team Name", key: "teamName", width: 24 },
          { header: "Captain Name", key: "captainName", width: 20 },
          { header: "Captain Reg No", key: "captainRegNo", width: 18 },
          { header: "Captain Email", key: "captainEmail", width: 30 },
          { header: "Captain Phone", key: "captainPhone", width: 16 },
          { header: "Player Name", key: "memberName", width: 22 },
          { header: "Player Reg No", key: "memberRegNo", width: 18 },
          { header: "Player Department", key: "memberDepartment", width: 18 },
          { header: "Semester", key: "memberSemester", width: 12 },
          { header: "Gender", key: "memberGender", width: 12 },
          { header: "Approved Date", key: "approvedDate", width: 16 },
        ];
        styleHeader(sheet);
      };

      const toRows = (records) => records.flatMap((reg) => {
        const base = {
          tournamentName: reg.tournamentName,
          sportName: reg.sportName,
          category: reg.category,
          department: reg.department,
          teamName: reg.teamName,
          captainName: reg.captainName,
          captainRegNo: reg.captainRegNo,
          captainEmail: reg.captainEmail,
          captainPhone: reg.captainPhone,
          approvedDate: reg.reviewedAt ? new Date(reg.reviewedAt).toISOString().split("T")[0] : "",
        };
        const members = reg.members?.length ? reg.members : [{}];
        return members.map((member) => ({
          ...base,
          memberName: member.fullName || "",
          memberRegNo: member.registrationNo || "",
          memberDepartment: member.department || reg.department || "",
          memberSemester: member.semester || "",
          memberGender: member.gender || reg.category || "",
        }));
      });

      const allTeamsSheet = workbook.addWorksheet("All Approved Teams");
      addTeamColumns(allTeamsSheet);
      allTeamsSheet.addRows(toRows(registrations));

      const grouped = registrations.reduce((acc, reg) => {
        const key = `${reg.sportName || "Sport"} - ${reg.category || "Category"}`;
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key).push(reg);
        return acc;
      }, new Map());

      for (const [groupName, records] of grouped.entries()) {
        const safeName = groupName.replace(/[\\/*?:[\]]/g, " ").slice(0, 31);
        const sheet = workbook.addWorksheet(safeName || "Sport Category");
        addTeamColumns(sheet);
        sheet.addRows(toRows(records));
      }

      for (const sheet of workbook.worksheets) {
        styleHeader(sheet);
        sheet.eachRow((row) => {
          row.alignment = { vertical: "top", wrapText: true };
        });
      }

      const filenameParts = [
        "approved-registrations",
        req.query.tournamentName || (req.query.tournamentId ? "tournament" : "all-tournaments"),
        req.query.sportName || (filters.sportId ? "one-sport" : "all-sports"),
        filters.category || "all-categories",
      ].map((part) => String(part).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).filter(Boolean);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${filenameParts.join("-")}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (importError) {
      return res.status(500).json({ message: "Excel export requires the exceljs package" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
