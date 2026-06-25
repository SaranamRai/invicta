import { createWorker } from "tesseract.js";
import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const WORKER_INIT_TIMEOUT_MS = 25000;
const OCR_RECOGNIZE_TIMEOUT_MS = 20000;
const OCR_TOTAL_TIMEOUT_MS = 45000;
const LOCAL_LANG_FILE = fileURLToPath(new URL("../eng.traineddata", import.meta.url));
const LOCAL_LANG_PATH = dirname(LOCAL_LANG_FILE);
const TESSERACT_WORKER_PATH = require.resolve("tesseract.js/src/worker-script/node/index.js");
const TESSERACT_CORE_PATH = dirname(require.resolve("tesseract.js-core/tesseract-core.wasm.js"));
const TESSERACT_CORE_FILES = [
  require.resolve("tesseract.js-core/tesseract-core.wasm.js"),
  require.resolve("tesseract.js-core/tesseract-core-simd.wasm.js"),
  require.resolve("tesseract.js-core/tesseract-core-lstm.wasm.js"),
  require.resolve("tesseract.js-core/tesseract-core-simd-lstm.wasm.js"),
];
let workerPromise = null;
let workerInstance = null;
let ocrQueue = Promise.resolve();

function createOcrError(message, code = "OCR_TIMEOUT") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function withTimeout(promise, timeoutMs, message, code = "OCR_TIMEOUT") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createOcrError(message, code));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function assertLocalLanguageData() {
  try {
    const stats = statSync(LOCAL_LANG_FILE);
    if (!stats.isFile() || stats.size < 1024 * 1024) {
      throw new Error("Invalid OCR language data file.");
    }
    statSync(TESSERACT_WORKER_PATH);
    TESSERACT_CORE_FILES.forEach((coreFile) => statSync(coreFile));
  } catch {
    throw createOcrError(
      "ID verification service is missing OCR runtime data. Please try again in a moment.",
      "OCR_LANGUAGE_MISSING"
    );
  }
}

async function createOcrWorker() {
  assertLocalLanguageData();
  const worker = await withTimeout(
    createWorker("eng", 1, {
      cacheMethod: "none",
      corePath: TESSERACT_CORE_PATH,
      gzip: false,
      langPath: LOCAL_LANG_PATH,
      workerPath: TESSERACT_WORKER_PATH,
    }),
    WORKER_INIT_TIMEOUT_MS,
    "ID verification service is still starting. Please try again in a moment.",
    "OCR_WORKER_INIT_FAILED"
  );

  try {
    await withTimeout(
      worker.setParameters({
        tessedit_char_whitelist: "0123456789",
      }),
      3000,
      "ID verification service is still starting. Please try again in a moment.",
      "OCR_WORKER_INIT_FAILED"
    );
    workerInstance = worker;
    return worker;
  } catch (error) {
    await worker.terminate().catch(() => {});
    throw error;
  }
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createOcrWorker().catch((error) => {
      workerPromise = null;
      workerInstance = null;
      throw error;
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
  const worker = await withTimeout(
    getWorker(),
    WORKER_INIT_TIMEOUT_MS,
    "ID verification service is still starting. Please try again in a moment.",
    "OCR_WORKER_INIT_FAILED"
  );
  const result = await withTimeout(
    worker.recognize(imageBuffer),
    OCR_RECOGNIZE_TIMEOUT_MS,
    "ID scan is taking too long. Please try again with a clearer, cropped image."
  );
  return {
    text: result?.data?.text || "",
    confidence: Math.round(Number(result?.data?.confidence || 0)),
  };
}

export async function runOcrOnImage(imageBuffer) {
  const task = ocrQueue.then(() =>
    withTimeout(
      recognizeImage(imageBuffer),
      OCR_TOTAL_TIMEOUT_MS,
      "ID scan is taking too long. Please try again with a clearer, cropped image."
    )
  );
  ocrQueue = task.catch(async (error) => {
    if (["OCR_TIMEOUT", "OCR_WORKER_INIT_FAILED", "OCR_LANGUAGE_MISSING"].includes(error?.code)) {
      await resetWorker();
    }
  });
  return task;
}
