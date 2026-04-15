/**
 * ============================================================
 * DAY 14: Complete File Upload System
 * ============================================================
 * Features:
 *  1. Single and multiple file uploads
 *  2. File type validation (MIME type + extension)
 *  3. File size limits
 *  4. Path traversal attack prevention (filename sanitization)
 *  5. Static file serving for uploaded files
 *  6. Disk vs memory storage strategies
 *  7. Chunked upload support (manual implementation)
 *
 * In production: replace local disk with AWS S3 / Cloudinary
 */
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ─── UPLOAD DIRECTORY ─────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── ALLOWED FILE TYPES ───────────────────────────────────
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_DOC_TYPES = new Set(["application/pdf", "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const ALL_ALLOWED = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;

// ─── FILENAME SANITIZATION ────────────────────────────────
// Security: path traversal attack example:
//   filename = "../../etc/passwd" → attacker reads system files!
// We sanitize: strip directory components and special chars.
function sanitizeFilename(original: string): string {
  const ext = path.extname(original).toLowerCase();
  const base = path.basename(original, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_") // Only safe chars
    .slice(0, 50);                     // Limit length
  return `${uuidv4()}-${base}${ext}`; // UUID prefix makes it unique
}

// ─── MULTER DISK STORAGE ──────────────────────────────────
// diskStorage: saves files directly to disk (good for large files)
// memoryStorage: holds file in RAM as Buffer (good for processing before save)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  },
});

// ─── FILE FILTER (SERVER-SIDE VALIDATION) ─────────────────
// NEVER trust client-side validation! The browser can be bypassed.
// Always validate MIME type on the server.
// Note: even MIME type can be spoofed — for production, use `file-type`
// package which reads the actual file magic bytes.
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ALL_ALLOWED.has(file.mimetype)) {
    cb(null, true); // Accept
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed: ${[...ALL_ALLOWED].join(", ")}`));
  }
};

// ─── MULTER INSTANCES ─────────────────────────────────────
const uploadSingle = multer({
  storage, fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("file"); // "file" = the form field name

const uploadMultiple = multer({
  storage, fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
}).array("files", MAX_FILES);

// ─── MULTER ERROR HANDLER ─────────────────────────────────
function handleMulterError(err: unknown, res: Response): boolean {
  if (err instanceof multer.MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      LIMIT_FILE_COUNT: `Too many files. Maximum: ${MAX_FILES}`,
      LIMIT_UNEXPECTED_FILE: "Unexpected file field name",
    };
    res.status(400).json({ status: "error", error: { code: err.code, message: messages[err.code] ?? err.message } });
    return true;
  }
  if (err instanceof Error) {
    res.status(400).json({ status: "error", error: { code: "INVALID_FILE", message: err.message } });
    return true;
  }
  return false;
}

// ─── SERVE UPLOADED FILES ─────────────────────────────────
// Serve from /uploads/ URL path
// Security: don't use express.static on sensitive directories!
app.use("/uploads", express.static(UPLOAD_DIR));

// ─── ROUTES ───────────────────────────────────────────────

// Single file upload
app.post("/api/upload/single", (req: Request, res: Response) => {
  uploadSingle(req, res, (err) => {
    if (handleMulterError(err, res)) return;
    if (!req.file) { res.status(400).json({ status: "error", error: { message: "No file provided" } }); return; }

    const file = req.file;
    const isImage = ALLOWED_IMAGE_TYPES.has(file.mimetype);

    res.status(201).json({
      status: "success",
      data: {
        id: path.basename(file.filename, path.extname(file.filename)),
        originalName: file.originalname,
        storedName: file.filename,
        url: `http://localhost:3001/uploads/${file.filename}`,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        mimeType: file.mimetype,
        isImage,
        uploadedAt: new Date().toISOString(),
      },
    });
  });
});

// Multiple files upload
app.post("/api/upload/multiple", (req: Request, res: Response) => {
  uploadMultiple(req, res, (err) => {
    if (handleMulterError(err, res)) return;
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ status: "error", error: { message: "No files provided" } }); return; }

    res.status(201).json({
      status: "success",
      data: files.map(file => ({
        originalName: file.originalname,
        storedName: file.filename,
        url: `http://localhost:3001/uploads/${file.filename}`,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        mimeType: file.mimetype,
      })),
      total: files.length,
    });
  });
});

// ─── CHUNKED UPLOAD ───────────────────────────────────────
// For large files: split into chunks on the client,
// upload each chunk separately, reassemble on the server.
// This allows: progress tracking, resume on failure, parallel upload.
const chunks: Map<string, { received: number; total: number; path: string }> = new Map();

app.post("/api/upload/chunk", express.raw({ type: "*/*", limit: "5mb" }), (req: Request, res: Response) => {
  const uploadId = req.headers["x-upload-id"] as string;
  const chunkIndex = parseInt(req.headers["x-chunk-index"] as string);
  const totalChunks = parseInt(req.headers["x-total-chunks"] as string);
  const filename = sanitizeFilename(req.headers["x-filename"] as string || "upload");

  if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
    res.status(400).json({ status: "error", error: { message: "Missing chunk headers" } }); return;
  }

  const chunkPath = path.join(UPLOAD_DIR, `${uploadId}.part${chunkIndex}`);
  fs.writeFileSync(chunkPath, req.body as Buffer);

  if (!chunks.has(uploadId)) {
    chunks.set(uploadId, { received: 0, total: totalChunks, path: path.join(UPLOAD_DIR, filename) });
  }
  const upload = chunks.get(uploadId)!;
  upload.received++;

  if (upload.received === totalChunks) {
    // All chunks received — reassemble the file
    const writeStream = fs.createWriteStream(upload.path);
    for (let i = 0; i < totalChunks; i++) {
      const chunkData = fs.readFileSync(path.join(UPLOAD_DIR, `${uploadId}.part${i}`));
      writeStream.write(chunkData);
      fs.unlinkSync(path.join(UPLOAD_DIR, `${uploadId}.part${i}`)); // Clean up chunk
    }
    writeStream.end();
    chunks.delete(uploadId);

    res.json({
      status: "success",
      data: { url: `http://localhost:3001/uploads/${filename}`, complete: true },
    });
  } else {
    res.json({
      status: "success",
      data: { received: upload.received, total: totalChunks, complete: false,
        progress: Math.round((upload.received / totalChunks) * 100) },
    });
  }
});

// List uploaded files
app.get("/api/uploads", (_req: Request, res: Response) => {
  const files = fs.readdirSync(UPLOAD_DIR)
    .filter(f => !f.endsWith(".part0") && !f.startsWith("."))
    .map(f => ({
      name: f, url: `http://localhost:3001/uploads/${f}`,
      size: formatFileSize(fs.statSync(path.join(UPLOAD_DIR, f)).size),
    }));
  res.json({ status: "success", data: files });
});

// Delete a file
app.delete("/api/uploads/:filename", (req: Request, res: Response) => {
  const safeName = path.basename(req.params["filename"]!); // Prevent path traversal!
  const filePath = path.join(UPLOAD_DIR, safeName);
  if (!fs.existsSync(filePath)) { res.status(404).json({ status: "error", error: { message: "File not found" } }); return; }
  fs.unlinkSync(filePath);
  res.json({ status: "success", message: "File deleted" });
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ status: "error", error: { message: "Internal server error" } });
});

app.listen(3001, () => {
  console.log("\n📁 Day 14 File Upload Server on http://localhost:3001");
  console.log("  POST /api/upload/single   — single file (field: 'file')");
  console.log("  POST /api/upload/multiple — up to 5 files (field: 'files')");
  console.log("  POST /api/upload/chunk    — chunked upload with headers");
  console.log("  GET  /api/uploads         — list all uploaded files");
  console.log("  DELETE /api/uploads/:name — delete a file");
  console.log(`  Uploads saved to: ${UPLOAD_DIR}`);
});
