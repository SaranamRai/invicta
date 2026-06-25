import { createWorker } from "tesseract.js";

const OCR_TIMEOUT_MS = 35000;
let workerPromise = null;
let workerInstance = null;
let ocrQueue = Promise.resolve();

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error("ID scan is taking too long. Please try again with a clearer, cropped image.");
      error.code = "OCR_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng").then(async (worker) => {
      workerInstance = worker;
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789",
      });
      return worker;
    });
  }
  return workerPromise;
}

async function resetWorker() {
  const worker = workerInstance;
  workerPromise = null;
  workerInstance = null;
  if (worker) {
    await worker.terminate().catch(() => {});
  }
}

async function recognizeImage(imageBuffer) {
  const worker = await getWorker();
  const result = await withTimeout(worker.recognize(imageBuffer), OCR_TIMEOUT_MS);
  return {
    text: result?.data?.text || "",
    confidence: Math.round(Number(result?.data?.confidence || 0)),
  };
}

export async function runOcrOnImage(imageBuffer) {
  const task = ocrQueue.then(() => recognizeImage(imageBuffer));
  ocrQueue = task.catch(async (error) => {
    if (error?.code === "OCR_TIMEOUT") {
      await resetWorker();
    }
  });
  return task;
}
