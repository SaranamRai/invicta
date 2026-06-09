import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;

  if (!host || !port) return null;

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  return transporter;
}

export async function sendAccountCreatedEmail({ name, email, role, assignedSport, password }) {
  const webAppLink = process.env.FRONTEND_URL || "http://127.0.0.1:3000";
  const roleLabel = role === "coordinator" ? "Sport Coordinator" : role;

  const subject = "Your Sport Coordinator Account Has Been Created";
  const html =
    `<h2>Welcome to the College Sports Management System</h2>` +
    `<p>Hello ${name},</p>` +
    `<p>Your Sport Coordinator account has been created for the College Sports Management System.</p>` +
    `<h3>Login Details</h3>` +
    `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0">` +
    `<tr><td><strong>Email</strong></td><td>${email}</td></tr>` +
    `<tr><td><strong>Role</strong></td><td>${roleLabel}</td></tr>` +
    (assignedSport ? `<tr><td><strong>Assigned Sport</strong></td><td>${assignedSport}</td></tr>` : "") +
    `<tr><td><strong>Password</strong></td><td>${password}</td></tr>` +
    `</table>` +
    `<p><a href="${webAppLink}/login">Login here: ${webAppLink}/login</a></p>` +
    `<p><strong>Important:</strong> You can access only your assigned sport and its Male/Female categories.</p>` +
    `<p>Please change your password after first login.</p>` +
    `<hr>` +
    `<p style="color:#666;font-size:12px">Regards,<br>Sports Management Team</p>`;

  const transport = getTransporter();
  if (!transport) {
    console.log("[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env");
    console.log(`[EMAIL] Would send to ${email}:`, { name, role: roleLabel, assignedSport, password });
    return;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@invicta-sports.com",
    to: email,
    subject,
    html,
  });

  console.log(`[EMAIL] Sent to ${email}, subject: "${subject}"`);
}
