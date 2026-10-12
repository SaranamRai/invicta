import { answerInvictaQuestion } from "../utils/invictaAssistant.js";

export async function askInvictaAssistant(req, res, next) {
  try {
    const answer = await answerInvictaQuestion(req.body?.message);
    return res.json(answer);
  } catch (error) {
    return next(error);
  }
}
