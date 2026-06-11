import TeamRegistration from "../models/TeamRegistration.js";
import Sport from "../models/Sport.js";

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
      const no = normalizeRegNo(member.registrationNo || member.registrationNumber || "");
      if (no) regNos.push(no);
    }
  }
  return [...new Set(regNos)].filter(Boolean);
}

export async function submitRegistration(req, res) {
  try {
    const {
      sportId,
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
    const sport = await Sport.findById(sportId).lean();
    if (!sport) return res.status(400).json({ message: "Sport not found" });

    // Validate categories
    const sportCategories = sport.categories || ["Male", "Female"];
    if (!sportCategories.includes(category)) {
      return res.status(400).json({ message: `Category "${category}" is not available for this sport` });
    }

    const sportName = rawSportName || sport.sportName || sport.name || "";
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

    // Check duplicates across pending and approved registrations in DB
    const existingRegNos = await TeamRegistration.find(
      { status: { $in: ["pending", "approved"] } },
      { captainRegNo: 1, "members.registrationNo": 1 }
    ).lean();

    const usedRegNos = new Set();
    for (const reg of existingRegNos) {
      usedRegNos.add(normalizeRegNo(reg.captainRegNo));
      if (Array.isArray(reg.members)) {
        for (const m of reg.members) {
          const no = normalizeRegNo(m.registrationNo);
          if (no) usedRegNos.add(no);
        }
      }
    }

    for (const regNo of allRegNos) {
      if (usedRegNos.has(regNo)) {
        return res.status(409).json({
          message: "This registration number is already registered in another team or sport.",
        });
      }
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
      .sort({ submittedAt: -1 })
      .lean();

    return res.json(registrations);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function approveRegistration(req, res) {
  try {
    const { id } = req.params;

    const registration = await TeamRegistration.findByIdAndUpdate(
      id,
      {
        status: "approved",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        rejectionReason: "",
      },
      { new: true }
    );

    if (!registration) return res.status(404).json({ message: "Registration not found" });
    return res.json(registration);
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

export async function exportApprovedExcel(req, res) {
  try {
    const filters = {};
    if (req.query.sport) filters.sportId = req.query.sport;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.department) filters.department = String(req.query.department).trim().toUpperCase();

    filters.status = "approved";

    const registrations = await TeamRegistration.find(filters)
      .sort({ submittedAt: -1 })
      .lean();

    // Build flat rows for Excel
    const rows = [];
    for (const reg of registrations) {
      const base = {
        sportName: reg.sportName,
        category: reg.category,
        department: reg.department,
        teamName: reg.teamName,
        captainName: reg.captainName,
        captainRegNo: reg.captainRegNo,
        captainEmail: reg.captainEmail,
        captainPhone: reg.captainPhone,
        status: reg.status,
        submittedDate: reg.submittedAt ? new Date(reg.submittedAt).toISOString().split("T")[0] : "",
        approvedDate: reg.reviewedAt ? new Date(reg.reviewedAt).toISOString().split("T")[0] : "",
        reviewedBy: reg.reviewedBy || "",
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
            memberEmail: member.email,
            memberPhone: member.phone,
          });
        }
      }
    }

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Approved Registrations");

      sheet.columns = [
        { header: "Sport Name", key: "sportName", width: 20 },
        { header: "Category", key: "category", width: 12 },
        { header: "Department", key: "department", width: 20 },
        { header: "Team Name", key: "teamName", width: 25 },
        { header: "Captain Name", key: "captainName", width: 20 },
        { header: "Captain Registration No", key: "captainRegNo", width: 20 },
        { header: "Captain Email", key: "captainEmail", width: 30 },
        { header: "Captain Phone", key: "captainPhone", width: 18 },
        { header: "Member Name", key: "memberName", width: 20 },
        { header: "Member Registration No", key: "memberRegNo", width: 20 },
        { header: "Member Department", key: "memberDepartment", width: 20 },
        { header: "Member Semester", key: "memberSemester", width: 15 },
        { header: "Member Gender", key: "memberGender", width: 12 },
        { header: "Member Email", key: "memberEmail", width: 30 },
        { header: "Member Phone", key: "memberPhone", width: 18 },
        { header: "Registration Status", key: "status", width: 18 },
        { header: "Submitted Date", key: "submittedDate", width: 15 },
        { header: "Approved Date", key: "approvedDate", width: 15 },
        { header: "Reviewed By", key: "reviewedBy", width: 24 },
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

      const buffer = await workbook.xlsx.writeBuffer();

      res.status(200);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="approved_registrations.xlsx"');
      res.setHeader("Content-Length", buffer.length);
      return res.send(Buffer.from(buffer));
    } catch (importError) {
      return res.status(500).json({ message: "Excel export requires the exceljs package" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
