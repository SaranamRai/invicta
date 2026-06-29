import nodemailer from "nodemailer";

let transporter = null;
const emailStats = {
  sent: 0,
  failed: 0,
  lastEmailSentAt: null,
  lastEmailError: "",
  lastCheckedAt: null,
  coordinatorCredentialEmails: 0,
  volunteerCredentialEmails: 0,
};

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || process.env.MAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || process.env.MAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER;
  const rawPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.MAIL_PASS;
  if (!host) return null;
  const pass = host.includes("gmail.com") ? rawPass?.replace(/\s+/g, "") : rawPass;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: user && pass
      ? { user, pass }
      : undefined,
  });

  return transporter;
}

function recordEmailSent(kind = "") {
  emailStats.sent += 1;
  emailStats.lastEmailSentAt = new Date();
  emailStats.lastEmailError = "";
  if (kind === "coordinator") emailStats.coordinatorCredentialEmails += 1;
  if (kind === "volunteer") emailStats.volunteerCredentialEmails += 1;
}

function recordEmailFailed(error) {
  emailStats.failed += 1;
  emailStats.lastEmailError = getEmailErrorMessage(error);
}

function emailFromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@invicta-sports.com";
}

async function sendTrackedMail({ email, subject, text, html, kind }) {
  const transport = getTransporter();
  if (!transport) return { sent: false, skipped: true };

  try {
    await transport.sendMail({
      from: emailFromAddress(),
      to: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    recordEmailFailed(error);
    throw error;
  }

  console.log(`[EMAIL] Sent to ${email}, subject: "${subject}"`);
  recordEmailSent(kind);
  return { sent: true, skipped: false };
}

export async function sendAccountCreatedEmail({ name, email, role, assignedSport, password }) {
  const webAppLink = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://127.0.0.1:3000";
  const loginLink = webAppLink.endsWith("/login") ? webAppLink : `${webAppLink.replace(/\/$/, "")}/login`;
  const roleLabel = role === "coordinator" ? "Sport Coordinator" : role === "volunteer" ? "Volunteer" : role;

  const subject = `INVlCTA ${roleLabel} Duty Assigned`;
  const text = [
    `Hello ${name},`,
    "",
    `Your ${roleLabel} duty has been assigned in the INVlCTA Sports Management System.`,
    assignedSport ? `Assigned sport: ${assignedSport}` : "",
    "",
    "Login details:",
    `Email/Username: ${email}`,
    `Password: ${password}`,
    `Login link: ${loginLink}`,
    "",
    "Please change your password after first login.",
    role === "volunteer" ? "To change your password, contact the Super Coordinator at the MSU Invicta email." : "",
    "",
    "Regards,",
    "Sports Management Team",
  ].filter(Boolean).join("\n");
  const html =
    `<h2>Welcome to the College Sports Management System</h2>` +
    `<p>Hello ${name},</p>` +
    `<p>Your <strong>${roleLabel}</strong> duty has been assigned in the INVlCTA Sports Management System.</p>` +
    `<h3>Login Details</h3>` +
    `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0">` +
    `<tr><td><strong>Email / Username</strong></td><td>${email}</td></tr>` +
    `<tr><td><strong>Role</strong></td><td>${roleLabel}</td></tr>` +
    (assignedSport ? `<tr><td><strong>Assigned Sport</strong></td><td>${assignedSport}</td></tr>` : "") +
    `<tr><td><strong>Password</strong></td><td>${password}</td></tr>` +
    `</table>` +
    `<p><a href="${loginLink}">Login here: ${loginLink}</a></p>` +
    (assignedSport ? `<p><strong>Important:</strong> You can access only your assigned sport and its Male/Female categories.</p>` : "") +
    `<p>Please change your password after first login.</p>` +
    (role === "volunteer" ? `<p>To change your password, contact the Super Coordinator at the MSU Invicta email.</p>` : "") +
    `<hr>` +
    `<p style="color:#666;font-size:12px">Regards,<br>Sports Management Team</p>`;

  if (!getTransporter()) {
    console.warn("[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in backend environment variables.");
    console.log(`[EMAIL] Would send to ${email}:`, { name, role: roleLabel, assignedSport, password });
    return { sent: false, skipped: true };
  }

  return sendTrackedMail({ email, subject, text, html, kind: role });
}

export async function sendTeamApprovedEmail({ teamName, captainName, email, sportName, tournamentName }) {
  const subject = `INVICTA Team Approved - ${teamName}`;
  const text = [
    `Hello ${captainName || teamName},`,
    "",
    `Your team "${teamName}" has been approved for ${sportName || "the selected sport"}${tournamentName ? ` in ${tournamentName}` : ""}.`,
    "The team is now registered in the INVICTA Sports Management System.",
    "",
    "Regards,",
    "Sports Management Team",
  ].join("\n");
  const html =
    `<h2>Team Registration Approved</h2>` +
    `<p>Hello ${captainName || teamName},</p>` +
    `<p>Your team <strong>${teamName}</strong> has been approved for <strong>${sportName || "the selected sport"}</strong>${tournamentName ? ` in <strong>${tournamentName}</strong>` : ""}.</p>` +
    `<p>The team is now registered in the INVICTA Sports Management System.</p>` +
    `<hr>` +
    `<p style="color:#666;font-size:12px">Regards,<br>Sports Management Team</p>`;

  if (!getTransporter()) {
    console.warn("[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in backend environment variables.");
    console.log(`[EMAIL] Would send approval to ${email}:`, { teamName, captainName, sportName, tournamentName });
    return { sent: false, skipped: true };
  }

  return sendTrackedMail({ email, subject, text, html, kind: "team_approved" });
}

export async function sendTeamRejectedEmail({ teamName, captainName, email, sportName, tournamentName, rejectionReason }) {
  const subject = `INVICTA Team Not Approved - ${teamName}`;
  const reason = String(rejectionReason || "").trim();
  const text = [
    `Hello ${captainName || teamName},`,
    "",
    `Your team "${teamName}" was not approved for ${sportName || "the selected sport"}${tournamentName ? ` in ${tournamentName}` : ""}.`,
    reason ? `Reason: ${reason}` : "",
    "Please contact the event coordinator if you need clarification.",
    "",
    "Regards,",
    "Sports Management Team",
  ].filter(Boolean).join("\n");
  const html =
    `<h2>Team Registration Not Approved</h2>` +
    `<p>Hello ${captainName || teamName},</p>` +
    `<p>Your team <strong>${teamName}</strong> was <strong>not approved</strong> for <strong>${sportName || "the selected sport"}</strong>${tournamentName ? ` in <strong>${tournamentName}</strong>` : ""}.</p>` +
    (reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "") +
    `<p>Please contact the event coordinator if you need clarification.</p>` +
    `<hr>` +
    `<p style="color:#666;font-size:12px">Regards,<br>Sports Management Team</p>`;

  if (!getTransporter()) {
    console.warn("[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in backend environment variables.");
    console.log(`[EMAIL] Would send rejection to ${email}:`, { teamName, captainName, sportName, tournamentName, rejectionReason: reason });
    return { sent: false, skipped: true };
  }

  return sendTrackedMail({ email, subject, text, html, kind: "team_rejected" });
}

export async function getEmailStatus() {
  const transport = getTransporter();
  const checkedAt = new Date();
  emailStats.lastCheckedAt = checkedAt;
  const status = {
    configured: Boolean(transport),
    healthy: false,
    provider: process.env.SMTP_HOST || process.env.EMAIL_HOST || process.env.MAIL_HOST || "",
    from: emailFromAddress(),
    ...emailStats,
    lastCheckedAt: checkedAt,
  };

  if (!transport) {
    return { ...status, message: "SMTP is not configured." };
  }

  try {
    await transport.verify();
    return { ...status, healthy: true, lastEmailError: "", message: "SMTP connection verified." };
  } catch (error) {
    recordEmailFailed(error);
    return { ...status, healthy: false, lastEmailError: getEmailErrorMessage(error), message: getEmailErrorMessage(error) };
  }
}

export async function sendSmtpTestEmail(toEmail) {
  const result = await sendTrackedMail({
    email: toEmail,
    subject: "INVICTA SMTP Test",
    text: "SMTP test email from the INVICTA Admin Dashboard.",
    html: "<p>SMTP test email from the INVICTA Admin Dashboard.</p>",
    kind: "smtp_test",
  });
  return {
    ...result,
    message: result.sent ? `SMTP test email sent to ${toEmail}.` : "SMTP is not configured.",
  };
}

export function getEmailErrorMessage(error) {
  if (error?.code === "EAUTH" || error?.responseCode === 535) {
    return "Gmail rejected the SMTP login. Use a Google App Password for SMTP_PASS and make sure SMTP_USER is the same Gmail account.";
  }

  if (error?.code === "ECONNECTION" || error?.code === "ETIMEDOUT") {
    return "Could not connect to the SMTP server. Check SMTP_HOST, SMTP_PORT, and SMTP_SECURE.";
  }

  return "The email could not be sent. Check backend SMTP environment variables and mail provider logs.";
}
