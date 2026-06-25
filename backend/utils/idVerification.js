import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { extractRegistrationNumber, normalizeRegNo } from "./regNoHelper.js";
import { parseMultipartForm } from "./multipartHelper.js";
import { runOcrOnImage } from "./ocrHelper.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BLOCKED_EXTENSIONS = new Set([".svg", ".html", ".js", ".exe", ".php"]);
const MAX_ID_CARD_BYTES = 5 * 1024 * 1024;
const TOKEN_TTL_SECONDS = 30 * 60;
const PURPOSE = "student-id-verification";

function getVerificationSecret() {
  return process.env.JWT_SECRET || "dev_secret_change_me";
}

function getExtension(filename = "") {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

export function signVerificationToken({ registrationNumber, extractedRegistrationNumber, playerRole, playerIndex, imageBuffer }) {
  const normalizedRegistrationNumber = normalizeRegNo(registrationNumber);
  return jwt.sign(
    {
      purpose: PURPOSE,
      registrationNumber: normalizedRegistrationNumber,
      extractedRegistrationNumber: normalizeRegNo(extractedRegistrationNumber),
      playerRole,
      playerIndex: Number.isFinite(Number(playerIndex)) ? Number(playerIndex) : null,
      imageHash: imageBuffer ? crypto.createHash("sha256").update(imageBuffer).digest("hex") : undefined,
    },
    getVerificationSecret(),
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

export function verifyRegistrationToken(token, { registrationNumber, playerRole, playerIndex }) {
  try {
    const payload = jwt.verify(token, getVerificationSecret());
    const expectedIndex = Number.isFinite(Number(playerIndex)) ? Number(playerIndex) : null;
    if (payload.purpose !== PURPOSE) return null;
    if (payload.playerRole !== playerRole) return null;
    if (payload.playerIndex !== expectedIndex) return null;
    if (payload.registrationNumber !== normalizeRegNo(registrationNumber)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildVerifiedStatus(tokenPayload) {
  return {
    status: "verified",
    verified: true,
    extractedRegistrationNumber: tokenPayload.extractedRegistrationNumber || tokenPayload.registrationNumber,
    confidence: Number(tokenPayload.confidence || 0),
    verifiedAt: new Date(),
  };
}

export async function verifyIdCardRequest(req) {
  const { fields, files } = await parseMultipartForm(req);
  const playerRole = String(fields.playerRole || "").trim();
  const playerIndex = String(fields.playerIndex ?? "").trim();
  const typedRegistrationNumber = normalizeRegNo(fields.typedRegistrationNumber);
  const idCardImage = files.idCardImage;

  if (!typedRegistrationNumber) {
    return { statusCode: 400, body: { success: false, message: "Registration number is required." } };
  }
  if (!["captain", "member"].includes(playerRole)) {
    return { statusCode: 400, body: { success: false, message: "Player role must be captain or member." } };
  }
  if (!idCardImage) {
    return { statusCode: 400, body: { success: false, message: "ID card image is required." } };
  }
  if (idCardImage.size > MAX_ID_CARD_BYTES) {
    return { statusCode: 413, body: { success: false, message: "File too large. Please upload an image below 5MB." } };
  }

  const extension = getExtension(idCardImage.originalName);
  if (!ALLOWED_MIME_TYPES.has(idCardImage.mimetype) || BLOCKED_EXTENSIONS.has(extension)) {
    return {
      statusCode: 400,
      body: { success: false, message: "Invalid file type. Please upload JPG, PNG, or WEBP ID card image." },
    };
  }

  let text = "";
  let confidence = 0;
  try {
    const ocrResult = await runOcrOnImage(idCardImage.buffer);
    text = ocrResult.text;
    confidence = ocrResult.confidence;
  } catch (error) {
    if (["OCR_TIMEOUT", "OCR_WORKER_INIT_FAILED", "OCR_LANGUAGE_MISSING"].includes(error?.code)) {
      return {
        statusCode: error.code === "OCR_TIMEOUT" ? 504 : 503,
        body: {
          success: false,
          matched: false,
          status: "unreadable",
          extractedRegistrationNumber: null,
          message: error.message || "Could not start ID verification. Please try again in a moment.",
        },
      };
    }
    throw error;
  }

  const extractedRegistrationNumber = extractRegistrationNumber(text, typedRegistrationNumber);
  if (!extractedRegistrationNumber) {
    return {
      statusCode: 422,
      body: {
        success: false,
        matched: false,
        status: "unreadable",
        extractedRegistrationNumber: null,
        message: "Could not read registration number from ID card. Please upload a clearer image.",
      },
    };
  }

  const matched = normalizeRegNo(extractedRegistrationNumber) === typedRegistrationNumber;
  if (!matched) {
    return {
      statusCode: 200,
      body: {
        success: true,
        matched: false,
        status: "mismatch",
        typedRegistrationNumber,
        extractedRegistrationNumber,
        confidence,
        message: "Typed registration number does not match the ID card.",
      },
    };
  }

  const verificationToken = signVerificationToken({
    registrationNumber: typedRegistrationNumber,
    extractedRegistrationNumber,
    playerRole,
    playerIndex,
    imageBuffer: idCardImage.buffer,
  });

  return {
    statusCode: 200,
    body: {
      success: true,
      matched: true,
      status: "verified",
      typedRegistrationNumber,
      extractedRegistrationNumber,
      confidence,
      message: "ID card verified successfully.",
      verificationToken,
    },
  };
}

export async function verifyClientOcrIdCardRequest(req) {
  const { fields, files } = await parseMultipartForm(req);
  const playerRole = String(fields.playerRole || "").trim();
  const playerIndex = String(fields.playerIndex ?? "").trim();
  const typedRegistrationNumber = normalizeRegNo(fields.typedRegistrationNumber);
  const browserOcrText = String(fields.ocrText || "");
  const idCardImage = files.idCardImage;

  if (!typedRegistrationNumber) {
    return { statusCode: 400, body: { success: false, message: "Registration number is required." } };
  }
  if (!["captain", "member"].includes(playerRole)) {
    return { statusCode: 400, body: { success: false, message: "Player role must be captain or member." } };
  }
  if (!idCardImage) {
    return { statusCode: 400, body: { success: false, message: "ID card image is required." } };
  }
  if (idCardImage.size > MAX_ID_CARD_BYTES) {
    return { statusCode: 413, body: { success: false, message: "File too large. Please upload an image below 5MB." } };
  }

  const extension = getExtension(idCardImage.originalName);
  if (!ALLOWED_MIME_TYPES.has(idCardImage.mimetype) || BLOCKED_EXTENSIONS.has(extension)) {
    return {
      statusCode: 400,
      body: { success: false, message: "Invalid file type. Please upload JPG, PNG, or WEBP ID card image." },
    };
  }

  const extractedRegistrationNumber = extractRegistrationNumber(browserOcrText, typedRegistrationNumber);
  if (!extractedRegistrationNumber) {
    return {
      statusCode: 422,
      body: {
        success: false,
        matched: false,
        status: "unreadable",
        extractedRegistrationNumber: null,
        message: "Could not read registration number from ID card. Please upload a clearer image.",
      },
    };
  }

  const matched = normalizeRegNo(extractedRegistrationNumber) === typedRegistrationNumber;
  if (!matched) {
    return {
      statusCode: 200,
      body: {
        success: true,
        matched: false,
        status: "mismatch",
        typedRegistrationNumber,
        extractedRegistrationNumber,
        confidence: 0,
        message: "Typed registration number does not match the ID card.",
      },
    };
  }

  const verificationToken = signVerificationToken({
    registrationNumber: typedRegistrationNumber,
    extractedRegistrationNumber,
    playerRole,
    playerIndex,
    imageBuffer: idCardImage.buffer,
  });

  return {
    statusCode: 200,
    body: {
      success: true,
      matched: true,
      status: "verified",
      typedRegistrationNumber,
      extractedRegistrationNumber,
      confidence: 0,
      message: "ID card verified successfully.",
      verificationToken,
    },
  };
}
