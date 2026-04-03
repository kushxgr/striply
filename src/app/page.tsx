"use client";

import React, { useState, useCallback, useRef } from "react";
import { FileDropZone } from "@/components/FileDropZone";
import { FileRow } from "@/components/FileRow";
import {
  ManagedFile,
  inspectFile,
  cleanFile,
  generateCleanName,
} from "@/lib/metadata";
import JSZip from "jszip";

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function HomePage() {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [globalStatus, setGlobalStatus] = useState<
    "idle" | "processing" | "done"
  >("idle");
  const processingRef = useRef(false);

  const addFiles = useCallback(async (incoming: File[]) => {
    const newEntries: ManagedFile[] = incoming.map((file) => ({
      id: generateId(),
      file,
      status: "inspecting",
      metadata: null,
      cleanedBlob: null,
      error: null,
      originalSize: file.size,
      cleanedSize: null,
    }));

    setFiles((prev) => [...prev, ...newEntries]);

    // Inspect each file
    for (const entry of newEntries) {
      try {
        const metadata = await inspectFile(entry.file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: "ready", metadata } : f
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: "error", error: "Could not read file." }
              : f
          )
        );
      }
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const downloadFile = useCallback((id: string) => {
    setFiles((prev) => {
      const f = prev.find((f) => f.id === id);
      if (!f?.cleanedBlob) return prev;
      const url = URL.createObjectURL(f.cleanedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = generateCleanName(f.file.name);
      a.click();
      URL.revokeObjectURL(url);
      return prev;
    });
  }, []);

  const cleanAll = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setGlobalStatus("processing");

    const targets = files.filter(
      (f) => f.status === "ready" || f.status === "error"
    );

    for (const entry of targets) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: "cleaning" } : f
        )
      );

      try {
        const blob = await cleanFile(entry.file);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: "clean",
                  cleanedBlob: blob,
                  cleanedSize: blob.size,
                }
              : f
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: "error", error: "Could not clean file." }
              : f
          )
        );
      }
    }

    setGlobalStatus("done");
    processingRef.current = false;
  }, [files]);

  const downloadAll = useCallback(async () => {
    const cleaned = files.filter((f) => f.status === "clean" && f.cleanedBlob);
    if (cleaned.length === 1) {
      downloadFile(cleaned[0].id);
      return;
    }
    const zip = new JSZip();
    for (const f of cleaned) {
      if (f.cleanedBlob) {
        zip.file(generateCleanName(f.file.name), f.cleanedBlob);
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "striply-clean.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [files, downloadFile]);

  const readyCount = files.filter((f) => f.status === "ready").length;
  const cleanCount = files.filter((f) => f.status === "clean").length;
  const hasFiles = files.length > 0;
  const canClean =
    readyCount > 0 && globalStatus !== "processing";
  const allDone = cleanCount > 0 && cleanCount === files.filter(f => f.status !== 'error').length;

  return (
    <div className="min-h-screen bg-[hsl(0,0%,98%)]">
      {/* Header */}
      <header className="border-b border-[hsl(0,0%,92%)] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[hsl(220,90%,56%)] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 2h8M2 6h5M2 10h3"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M9 7l1.5 1.5L9 10"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[hsl(0,0%,8%)]">
              Striply
            </span>
          </div>
          <span className="text-[12px] text-[hsl(0,0%,58%)] hidden sm:block">
            Processed in your browser · nothing leaves your device
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-24">
        {/* Hero */}
        <section className="pt-16 pb-12 animate-fade-up">
          <p className="text-[12px] font-semibold tracking-widest uppercase text-[hsl(220,90%,56%)] mb-4">
            Privacy-first
          </p>
          <h1 className="text-[40px] sm:text-[52px] font-bold leading-[1.08] tracking-tight text-[hsl(0,0%,6%)]">
            Clean files.
            <br />
            No traces.
          </h1>
          <p className="mt-5 text-[16px] text-[hsl(0,0%,42%)] leading-relaxed max-w-md">
            Striply removes hidden data embedded in your files — camera details,
            GPS coordinates, timestamps — without sending anything to a server.
          </p>
        </section>

        {/* Drop area */}
        <section
          className="animate-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          <FileDropZone
            onFilesAdded={addFiles}
            disabled={globalStatus === "processing"}
          />
        </section>

        {/* File list */}
        {hasFiles && (
          <section
            className="mt-10 animate-fade-up"
            style={{ animationDelay: "150ms" }}
          >
            {/* List header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-[hsl(0,0%,30%)] uppercase tracking-wider">
                {files.length} file{files.length !== 1 ? "s" : ""}
              </h2>
              {cleanCount > 0 && (
                <span className="text-[12px] text-emerald-600 font-medium">
                  {cleanCount} cleaned
                </span>
              )}
            </div>
            <div className="h-px bg-[hsl(0,0%,90%)] mb-1" />

            <div>
              {files.map((f, i) => (
                <FileRow
                  key={f.id}
                  managed={f}
                  onRemove={removeFile}
                  onDownload={downloadFile}
                  index={i}
                />
              ))}
            </div>

            {/* Action bar */}
            <div className="mt-8 flex items-center gap-3">
              {canClean && (
                <button
                  onClick={cleanAll}
                  className="h-11 px-6 rounded-xl bg-[hsl(220,90%,56%)] text-white text-[14px] font-semibold hover:bg-[hsl(220,90%,50%)] active:scale-[0.98] transition-all shadow-sm shadow-[hsl(220,90%,56%/0.3)]"
                >
                  {readyCount === 1
                    ? "Clean this file"
                    : `Clean ${readyCount} files`}
                </button>
              )}

              {allDone && cleanCount > 1 && (
                <button
                  onClick={downloadAll}
                  className="h-11 px-6 rounded-xl bg-[hsl(0,0%,10%)] text-white text-[14px] font-semibold hover:bg-[hsl(0,0%,6%)] active:scale-[0.98] transition-all"
                >
                  Download all
                </button>
              )}

              {globalStatus === "processing" && (
                <div className="flex items-center gap-2 text-[13px] text-[hsl(0,0%,52%)]">
                  <div className="w-4 h-4 rounded-full border-2 border-[hsl(220,90%,56%)] border-t-transparent animate-spin" />
                  Cleaning files…
                </div>
              )}
            </div>
          </section>
        )}

        {/* Privacy note — restrained */}
        {!hasFiles && (
          <section
            className="mt-16 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex items-start gap-4">
              <div className="flex flex-col gap-6 text-[13px] text-[hsl(0,0%,50%)] leading-relaxed">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[hsl(220,90%,56%)]">→</span>
                  <span>
                    Everything runs in your browser. Files never leave your
                    device.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[hsl(220,90%,56%)]">→</span>
                  <span>
                    Detects GPS coordinates, camera info, timestamps, and more.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[hsl(220,90%,56%)]">→</span>
                  <span>
                    Cleaned files keep their full quality with no data loss.
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(0,0%,92%)] mt-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-center justify-between">
          <span className="text-[12px] text-[hsl(0,0%,62%)]">
            © {new Date().getFullYear()} Striply
          </span>
          <span className="text-[12px] text-[hsl(0,0%,72%)]">
            No data collected · No analytics
          </span>
        </div>
      </footer>
    </div>
  );
}
