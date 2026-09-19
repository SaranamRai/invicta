import { runOcrOnImage } from "../../utils/ocrHelper.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function error(message, status = 400) {
  const result = new Error(message);
  result.status = status;
  return result;
}

export function validateFixtureImage(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) throw error("Please upload a fixture image.");
  if (file.size > MAX_IMAGE_BYTES) throw error("File too large. Please upload an image below 5MB.", 413);
  if (!ALLOWED_TYPES.has(String(file.mimetype || "").toLowerCase())) {
    throw error("Invalid file type. Please upload a JPG, PNG, or WEBP fixture image.");
  }
  const header = file.buffer.subarray(0, 12);
  const valid = (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
    || header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (header.subarray(0, 4).toString() === "RIFF" && header.subarray(8, 12).toString() === "WEBP");
  if (!valid) throw error("The uploaded file is not a valid image.");
}

function parseOcrText(text) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const matchup = lines.find((line) => /\b(?:vs?\.?|v)\b/i.test(line));
  const teams = matchup?.split(/\s+(?:vs?\.?|v)\s+/i).map((value) => value.trim()).filter(Boolean) || [];
  const date = text.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2})\b/)?.[1] || "";
  const time = text.match(/\b([01]?\d|2[0-3]):[0-5]\d(?:\s?[AP]M)?\b/i)?.[0] || "";
  return { teamAName: teams[0] || "", teamBName: teams[1] || "", date, time, rawText: text };
}

async function extractWithConfiguredVision(file) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Extract a fixture schedule row. Return JSON only with teamAName, teamBName, sportName, category, date (YYYY-MM-DD when clear), time (HH:MM when clear), venue, round. Never invent values; use empty strings for unclear fields." },
          { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}` } },
        ],
      }],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw error("The configured image AI service could not analyze this image.", 502);
  const body = await response.json();
  try {
    const value = JSON.parse(body.choices?.[0]?.message?.content || "{}");
    return { ...value, rawText: "" };
  } catch {
    throw error("The image AI service returned an invalid fixture record.", 502);
  }
}

export async function analyzeFixtureImage(file) {
  validateFixtureImage(file);
  const vision = await extractWithConfiguredVision(file);
  if (vision) return { ...vision, source: "AI", confidence: 80 };
  const ocr = await runOcrOnImage(file.buffer);
  return { ...parseOcrText(ocr.text), source: "OCR", confidence: ocr.confidence };
}
