const MAX_MULTIPART_BYTES = 6 * 1024 * 1024;

function parseDisposition(value = "") {
  const result = {};
  for (const part of value.split(";")) {
    const [rawKey, ...rawRest] = part.trim().split("=");
    const key = rawKey.trim().toLowerCase();
    if (!key || rawRest.length === 0) continue;
    result[key] = rawRest.join("=").trim().replace(/^"|"$/g, "");
  }
  return result;
}

export async function parseMultipartForm(req) {
  const contentType = String(req.headers["content-type"] || "");
  const boundary = contentType.match(/boundary=([^;]+)/i)?.[1];
  if (!boundary) {
    const error = new Error("Multipart form data is required.");
    error.status = 400;
    throw error;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_MULTIPART_BYTES) {
      const error = new Error("File too large. Please upload an image below 5MB.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks);
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const fields = {};
  const files = {};
  let start = body.indexOf(boundaryBuffer);

  while (start !== -1) {
    start += boundaryBuffer.length;
    if (body[start] === 45 && body[start + 1] === 45) break;
    if (body[start] === 13 && body[start + 1] === 10) start += 2;

    const next = body.indexOf(boundaryBuffer, start);
    if (next === -1) break;

    let part = body.subarray(start, next);
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.subarray(0, part.length - 2);
    }

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      const rawHeaders = part.subarray(0, headerEnd).toString("latin1");
      const content = part.subarray(headerEnd + 4);
      const headers = Object.fromEntries(
        rawHeaders.split("\r\n").map((line) => {
          const index = line.indexOf(":");
          return index === -1 ? ["", ""] : [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
        }).filter(([key]) => key)
      );
      const disposition = parseDisposition(headers["content-disposition"]);
      if (disposition.name) {
        if (disposition.filename) {
          files[disposition.name] = {
            buffer: content,
            originalName: disposition.filename,
            mimetype: headers["content-type"] || "application/octet-stream",
            size: content.length,
          };
        } else {
          fields[disposition.name] = content.toString("utf8");
        }
      }
    }

    start = next;
  }

  return { fields, files };
}
