/**
 * DAY 14: File Upload Frontend
 * Demonstrates: drag & drop, progress tracking, multiple files, chunked upload
 */
import React, { useState, useCallback, useRef } from "react";

interface UploadedFile {
  originalName: string; storedName: string; url: string;
  size: string; mimeType: string; isImage?: boolean; uploadedAt?: string;
}

interface UploadProgress { name: string; progress: number; status: "uploading" | "done" | "error"; url?: string; }

const BASE = "http://localhost:3001";

export default function App() {
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [serverFiles, setServerFiles] = useState<{ name: string; url: string; size: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing uploads from server
  const loadServerFiles = useCallback(async () => {
    const res = await fetch(`${BASE}/api/uploads`);
    const data = await res.json();
    setServerFiles(data.data);
  }, []);

  React.useEffect(() => { loadServerFiles(); }, [loadServerFiles]);

  // ── Single file upload with XMLHttpRequest (for real progress tracking)
  // fetch() doesn't support upload progress — use XHR or axios
  async function uploadWithProgress(file: File): Promise<UploadedFile | null> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      // Update progress state
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(prev => prev.map(p =>
            p.name === file.name ? { ...p, progress: pct } : p
          ));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          setProgress(prev => prev.map(p =>
            p.name === file.name ? { ...p, progress: 100, status: "done", url: data.data.url } : p
          ));
          resolve(data.data);
        } else {
          setProgress(prev => prev.map(p =>
            p.name === file.name ? { ...p, status: "error" } : p
          ));
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));

      xhr.open("POST", `${BASE}/api/upload/single`);
      xhr.send(formData);
    });
  }

  // ── Chunked upload for large files
  async function uploadChunked(file: File, chunkSize = 1024 * 1024): Promise<void> {
    const uploadId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      await fetch(`${BASE}/api/upload/chunk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Upload-Id": uploadId,
          "X-Chunk-Index": String(i),
          "X-Total-Chunks": String(totalChunks),
          "X-Filename": file.name,
        },
        body: chunk,
      });
      const pct = Math.round(((i + 1) / totalChunks) * 100);
      setProgress(prev => prev.map(p =>
        p.name === `${file.name} (chunked)` ? { ...p, progress: pct } : p
      ));
    }
    setProgress(prev => prev.map(p =>
      p.name === `${file.name} (chunked)` ? { ...p, status: "done" } : p
    ));
  }

  // Handle file selection (from input or drag)
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);

    // Initialize progress entries
    setProgress(prev => [
      ...prev,
      ...fileArr.map(f => ({ name: f.name, progress: 0, status: "uploading" as const })),
    ]);

    for (const file of fileArr) {
      try {
        const result = await uploadWithProgress(file);
        if (result) {
          setUploads(prev => [result, ...prev]);
          await loadServerFiles();
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
  }, [loadServerFiles]);

  // Drag & Drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = async (filename: string) => {
    await fetch(`${BASE}/api/uploads/${filename}`, { method: "DELETE" });
    await loadServerFiles();
  };

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 10, padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: 16,
  };

  return (
    <div style={{ fontFamily: "system-ui", background: "#f7fafc", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ color: "#2d3748" }}>📁 Day 14: File Upload System</h1>

        {/* DROP ZONE */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...card,
            border: `3px dashed ${isDragging ? "#4299e1" : "#cbd5e0"}`,
            background: isDragging ? "#ebf8ff" : "#fff",
            cursor: "pointer", textAlign: "center", padding: 40,
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📤</div>
          <div style={{ fontWeight: 600, color: "#4a5568" }}>Drop files here or click to browse</div>
          <div style={{ fontSize: 13, color: "#a0aec0", marginTop: 4 }}>
            Images (JPEG, PNG, WebP, GIF) and Documents (PDF, TXT, DOCX) · Max 10MB each
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.docx"
            style={{ display: "none" }}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {/* CHUNKED UPLOAD DEMO */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Chunked Upload (for large files)</h3>
          <p style={{ fontSize: 13, color: "#718096" }}>
            Large files are split into 1MB chunks. If one fails, only that chunk needs to retry.
          </p>
          <input
            type="file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setProgress(prev => [...prev, { name: `${file.name} (chunked)`, progress: 0, status: "uploading" }]);
              await uploadChunked(file);
              await loadServerFiles();
            }}
            style={{ fontSize: 14 }}
          />
        </div>

        {/* UPLOAD PROGRESS */}
        {progress.length > 0 && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Upload Progress</h3>
            {progress.map((p, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{p.name}</span>
                  <span style={{ color: p.status === "error" ? "#e53e3e" : p.status === "done" ? "#38a169" : "#4299e1" }}>
                    {p.status === "error" ? "❌ Failed" : p.status === "done" ? "✅ Done" : `${p.progress}%`}
                  </span>
                </div>
                <div style={{ background: "#e2e8f0", borderRadius: 4, height: 8 }}>
                  <div style={{
                    width: `${p.progress}%`, height: "100%", borderRadius: 4, transition: "width 0.3s",
                    background: p.status === "error" ? "#fc8181" : p.status === "done" ? "#68d391" : "#4299e1",
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECENTLY UPLOADED */}
        {uploads.length > 0 && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Recently Uploaded This Session</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {uploads.map((f, i) => (
                <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                  {f.isImage ? (
                    <img src={f.url} alt={f.originalName}
                      style={{ width: "100%", height: 100, objectFit: "cover" }} />
                  ) : (
                    <div style={{ height: 100, background: "#f7fafc", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                      {f.mimeType.includes("pdf") ? "📄" : "📝"}
                    </div>
                  )}
                  <div style={{ padding: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.originalName}</div>
                    <div style={{ fontSize: 11, color: "#a0aec0" }}>{f.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALL SERVER FILES */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Files on Server ({serverFiles.length})</h3>
            <button onClick={loadServerFiles}
              style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #cbd5e0",
                background: "#fff", cursor: "pointer", fontSize: 13 }}>Refresh</button>
          </div>
          {serverFiles.length === 0 ? (
            <p style={{ color: "#a0aec0", fontSize: 13 }}>No files yet — upload something above!</p>
          ) : (
            <div style={{ marginTop: 12 }}>
              {serverFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "8px 0",
                  borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{f.name}</span>
                  <span style={{ fontSize: 12, color: "#718096", marginRight: 12 }}>{f.size}</span>
                  <a href={f.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: "#4299e1", marginRight: 8, textDecoration: "none" }}>View</a>
                  <button onClick={() => handleDelete(f.name)}
                    style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, border: "none",
                      background: "#fed7d7", color: "#c53030", cursor: "pointer" }}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
