"use client";

import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/metadata";

interface FileDropZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/heic",
];

function isSupported(file: File) {
  return (
    SUPPORTED_TYPES.includes(file.type) ||
    /\.(jpe?g|png|webp|tiff?|heic)$/i.test(file.name)
  );
}

export function FileDropZone({ onFilesAdded, disabled }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter(isSupported);
      if (files.length) onFilesAdded(files);
    },
    [onFilesAdded, disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter(isSupported);
      if (files.length) onFilesAdded(files);
      e.target.value = "";
    },
    [onFilesAdded]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "group relative cursor-pointer select-none transition-all duration-300",
        "rounded-2xl py-16 px-8 text-center",
        dragging
          ? "bg-[hsl(220_90%_56%/0.06)] ring-2 ring-[hsl(220_90%_56%/0.3)]"
          : "bg-[hsl(0_0%_97%)] hover:bg-[hsl(220_90%_56%/0.03)] ring-1 ring-[hsl(0_0%_90%)] hover:ring-[hsl(220_90%_56%/0.2)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={SUPPORTED_TYPES.join(",")}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4">
        {/* Minimal icon */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
            dragging
              ? "bg-[hsl(220_90%_56%/0.12)] scale-110"
              : "bg-white shadow-sm group-hover:scale-105"
          )}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className={cn(
              "transition-colors duration-300",
              dragging
                ? "text-[hsl(220,90%,56%)]"
                : "text-[hsl(0,0%,40%)] group-hover:text-[hsl(220,90%,56%)]"
            )}
          >
            <path
              d="M10 2v10M6 6l4-4 4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div>
          <p className="text-[15px] font-medium text-[hsl(0,0%,12%)]">
            {dragging ? "Release to add files" : "Drop files here"}
          </p>
          <p className="mt-1 text-[13px] text-[hsl(0,0%,52%)]">
            or{" "}
            <span className="text-[hsl(220,90%,56%)] font-medium">
              browse your device
            </span>
          </p>
        </div>

        <p className="text-[12px] text-[hsl(0,0%,62%)]">
          JPEG · PNG · WebP · TIFF
        </p>
      </div>
    </div>
  );
}
