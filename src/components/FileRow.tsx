"use client";

import React from "react";
import { ManagedFile, formatBytes, generateCleanName, cn } from "@/lib/metadata";

interface FileRowProps {
  managed: ManagedFile;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  index: number;
}

const STATUS_LABELS: Record<ManagedFile["status"], string> = {
  idle: "Queued",
  inspecting: "Reading…",
  ready: "Ready",
  cleaning: "Cleaning…",
  clean: "Clean",
  error: "Error",
};

const STATUS_DOT: Record<ManagedFile["status"], string> = {
  idle: "bg-[hsl(0,0%,80%)]",
  inspecting: "bg-amber-400 animate-pulse",
  ready: "bg-sky-400",
  cleaning: "bg-[hsl(220,90%,56%)] animate-pulse",
  clean: "bg-emerald-400",
  error: "bg-rose-400",
};

function fileTypeLabel(file: File): string {
  if (file.type === "image/jpeg" || file.type === "image/jpg") return "JPEG";
  if (file.type === "image/png") return "PNG";
  if (file.type === "image/webp") return "WebP";
  if (file.type === "image/tiff") return "TIFF";
  return file.type.split("/")[1]?.toUpperCase() ?? "FILE";
}

export function FileRow({ managed, onRemove, onDownload, index }: FileRowProps) {
  const { file, status, metadata, cleanedBlob, cleanedSize, originalSize } = managed;
  const hasGPS = metadata?.fields.some((f) => f.category === "location");

  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-4 py-4">
        {/* File type badge */}
        <div className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-[hsl(0,0%,96%)] flex items-center justify-center">
          <span className="text-[9px] font-semibold tracking-wider text-[hsl(0,0%,45%)] uppercase">
            {fileTypeLabel(file)}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-medium text-[hsl(0,0%,10%)] truncate max-w-[260px]">
              {file.name}
            </span>
            {/* Status indicator */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span
                className={cn(
                  "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
                  STATUS_DOT[status]
                )}
              />
              <span className="text-[12px] text-[hsl(0,0%,52%)]">
                {STATUS_LABELS[status]}
              </span>
            </div>
          </div>

          {/* Sub info row */}
          <div className="mt-1 flex items-center gap-3 text-[12px] text-[hsl(0,0%,58%)]">
            <span>{formatBytes(originalSize)}</span>
            {cleanedSize && (
              <>
                <span className="text-[hsl(0,0%,78%)]">→</span>
                <span className="text-emerald-600 font-medium">
                  {formatBytes(cleanedSize)}
                </span>
              </>
            )}
            {metadata?.hasMetadata && (
              <>
                <span className="text-[hsl(0,0%,78%)]">·</span>
                <span>
                  {metadata.fieldCount} field{metadata.fieldCount !== 1 ? "s" : ""} found
                </span>
                {hasGPS && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M5 10C5 10 1.5 6.5 1.5 4a3.5 3.5 0 017 0C8.5 6.5 5 10 5 10z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    </svg>
                    GPS
                  </span>
                )}
              </>
            )}
            {metadata && !metadata.hasMetadata && status === "ready" && (
              <>
                <span className="text-[hsl(0,0%,78%)]">·</span>
                <span className="text-emerald-600">No hidden data</span>
              </>
            )}
          </div>

          {/* Error */}
          {managed.error && (
            <p className="mt-1 text-[12px] text-rose-500">{managed.error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {status === "clean" && cleanedBlob && (
            <button
              onClick={() => onDownload(managed.id)}
              className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[hsl(220,90%,56%)] text-white hover:bg-[hsl(220,90%,50%)] transition-colors"
            >
              Save
            </button>
          )}
          <button
            onClick={() => onRemove(managed.id)}
            disabled={status === "inspecting" || status === "cleaning"}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(0,0%,65%)] hover:text-[hsl(0,0%,20%)] hover:bg-[hsl(0,0%,94%)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Metadata fields — expandable */}
      {metadata?.hasMetadata && status !== "clean" && (
        <MetadataGrid fields={metadata.fields} />
      )}

      <div className="h-px bg-[hsl(0,0%,92%)]" />
    </div>
  );
}

function MetadataGrid({
  fields,
}: {
  fields: import("@/lib/metadata").MetadataField[];
}) {
  const [expanded, setExpanded] = React.useState(false);
  const categoryOrder = ["location", "device", "timestamp", "technical", "other"] as const;

  const grouped = categoryOrder.reduce(
    (acc, cat) => {
      const catFields = fields.filter((f) => f.category === cat);
      if (catFields.length) acc[cat] = catFields;
      return acc;
    },
    {} as Partial<Record<string, typeof fields>>
  );

  const CATEGORY_LABELS: Record<string, string> = {
    location: "Location",
    device: "Device",
    timestamp: "Timestamps",
    technical: "Camera Settings",
    other: "Other",
  };

  const preview = fields.slice(0, 4);
  const shownFields = expanded ? fields : preview;

  return (
    <div className="mb-3 ml-14">
      <div className="rounded-xl bg-[hsl(0,0%,97%)] p-3">
        {!expanded ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {shownFields.map((f) => (
              <span key={f.key} className="text-[12px] text-[hsl(0,0%,42%)]">
                <span className="text-[hsl(0,0%,62%)]">{f.label}: </span>
                {f.value}
              </span>
            ))}
            {fields.length > 4 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[12px] text-[hsl(220,90%,56%)] font-medium"
              >
                +{fields.length - 4} more
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([cat, catFields]) => (
              <div key={cat}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(0,0%,58%)] mb-1.5">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                  {catFields!.map((f) => (
                    <div key={f.key} className="flex justify-between gap-2 text-[12px]">
                      <span className="text-[hsl(0,0%,58%)] truncate">{f.label}</span>
                      <span className="text-[hsl(0,0%,20%)] font-medium truncate text-right">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setExpanded(false)}
              className="text-[12px] text-[hsl(0,0%,58%)] hover:text-[hsl(0,0%,20%)] transition-colors"
            >
              Show less
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
