import { answerInvictaQuestion, MAX_MESSAGE_LENGTH } from "../services/ai/aiService.js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requests = new Map();

function rateLimitKey(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function isRateLimited(req) {
  const now = Date.now();
  const key = rateLimitKey(req);
  const current = requests.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requests.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

export async function chatWithInvicta(req, res, next) {
  if (isRateLimited(req)) {
    return res.status(429).json({ message: "Too many assistant requests. Please try again shortly." });
  }

  const message = req.body?.message;
  if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `Message must be a non-empty string of at most ${MAX_MESSAGE_LENGTH} characters.` });
  }

  try {
    const result = await answerInvictaQuestion(message, req.body?.history);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}
