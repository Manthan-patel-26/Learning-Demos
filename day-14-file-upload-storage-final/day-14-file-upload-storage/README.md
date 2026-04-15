# Day 14: File Upload & Storage

**Date:** March 02, 2026 | **Learning Time:** 3 hours

## 🎯 What You'll Build
Complete file upload API: drag & drop UI, real progress tracking (XHR), multiple files, chunked uploads for large files, file type validation, and filename sanitization.

## 🚀 How to Run
```bash
cd backend && npm install && npm run dev   # port 3001
cd frontend && npm install && npm start   # port 3000
```

## 🔗 API Endpoints
```bash
# Single file upload
curl -X POST http://localhost:3001/api/upload/single \
  -F "file=@/path/to/image.jpg"

# Multiple files
curl -X POST http://localhost:3001/api/upload/multiple \
  -F "files=@file1.jpg" -F "files=@file2.pdf"

# List uploads
curl http://localhost:3001/api/uploads

# Delete
curl -X DELETE http://localhost:3001/api/uploads/filename.jpg
```

## ⚠️ Security Checklist

| Risk | Our Mitigation |
|------|---------------|
| Path traversal (`../../etc/passwd`) | `path.basename()` + UUID prefix on all filenames |
| MIME type spoofing | Validate `file.mimetype` server-side (add `file-type` lib for magic bytes in prod) |
| Large file DoS | `limits.fileSize: 10MB` in multer config |
| Filename XSS | Replace all non-alphanumeric chars in filename |
| Disk exhaustion | Implement cleanup cron job for old files |

## 📖 Key Concepts

### Disk vs Memory Storage
```typescript
// DiskStorage: saves to disk during upload (good for large files, less RAM)
const storage = multer.diskStorage({ destination: "uploads/", filename: ... });

// MemoryStorage: holds in RAM as Buffer (good for processing before save: resize, virus scan)
const storage = multer.memoryStorage();
// req.file.buffer available for processing with Sharp/other tools
```

### Why XHR over fetch() for Progress
```typescript
// ❌ fetch() — no upload progress events
await fetch("/upload", { method: "POST", body: formData });

// ✅ XHR — has upload progress events
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener("progress", (e) => {
  const pct = Math.round((e.loaded / e.total) * 100);
});
xhr.open("POST", "/upload");
xhr.send(formData);
```

### Chunked Upload Benefits
- Large files that exceed server limits can be split
- Progress is tracked per chunk
- Failed chunks can be retried individually
- Multiple chunks can upload in parallel
- Enables resumable uploads on connection loss
