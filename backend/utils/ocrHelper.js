import Tesseract from "tesseract.js";

export async function runOcrOnImage(imageBuffer) {
  const result = await Tesseract.recognize(imageBuffer, "eng");
  return {
    text: result?.data?.text || "",
    confidence: Math.round(Number(result?.data?.confidence || 0)),
  };
}
