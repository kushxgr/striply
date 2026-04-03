# Striply

**Clean files. No traces.**

A fast, privacy-first tool that strips hidden data from your files — GPS coordinates, camera details, timestamps, and more — without ever leaving your device.

---

## What it does

Every photo you take contains invisible metadata baked in by your camera or phone. This can include your precise location, the device you used, when the photo was taken, and dozens of technical details you may not want to share.

Striply reads this data, shows you exactly what's embedded, and produces a clean version of your file — all inside your browser. Nothing is uploaded. Nothing is stored. No servers involved.

---

## Features

- **Instant inspection** — detects EXIF data including GPS, device info, timestamps, and camera settings
- **One-click cleaning** — removes all embedded metadata while preserving full image quality
- **Batch support** — handle multiple files in a single flow
- **Download individually or as a ZIP** — clean files are named consistently (`filename-clean.ext`)
- **Fully client-side** — all processing happens in the browser using WebAssembly-free JS libraries
- **Zero tracking** — no analytics, no cookies, no data collection of any kind

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui, Radix UI |
| Typography | Geist (via `next/font`) |
| Metadata reading | `exifr` |
| Metadata removal | `piexifjs` + custom PNG chunk stripper |
| Archive output | `jszip` |
| Containerization | Docker + Docker Compose |

---

## Local setup

**Requirements:** Node.js 18+, npm

```bash
# Clone the repository
git clone https://github.com/your-username/striply.git
cd striply

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Docker setup

```bash
# Build and run with Docker Compose
docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

To stop:

```bash
docker compose down
```

---

## How the privacy model works

Striply processes everything locally in your browser using JavaScript. Here's what that means in practice:

- Files are read directly from your device using the [File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API)
- Metadata is parsed in-memory using `exifr`
- Cleaned files are generated in-memory and offered as downloads
- **No file content, metadata, or any other data is ever transmitted to a server**
- The app has no backend, no database, and no analytics

You can verify this by running the app offline — it works exactly the same.

---

## Project structure

```
striply/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout with font config and metadata
│   │   ├── page.tsx          # Main application page
│   │   └── globals.css       # Global styles and CSS variables
│   ├── components/
│   │   ├── FileDropZone.tsx  # Drag-and-drop / file selection area
│   │   └── FileRow.tsx       # Per-file display with metadata + actions
│   └── lib/
│       └── metadata.ts       # Core: inspect, clean, format, utilities
├── public/
├── Dockerfile
├── docker-compose.yml
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Supported formats

| Format | Metadata detection | Metadata removal |
|---|---|---|
| JPEG / JPG | ✅ Full EXIF | ✅ Complete |
| PNG | ✅ Text chunks | ✅ Complete |
| WebP | ✅ EXIF | ⚠️ Best effort |
| TIFF | ✅ Full EXIF | ⚠️ Best effort |

---

## Future improvements

- [ ] Support for video files (MP4 metadata)
- [ ] PDF metadata detection and removal
- [ ] Side-by-side before/after metadata diff view
- [ ] Drag-to-reorder file list
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] PWA support for offline use
- [ ] CLI version for batch processing in scripts

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss the direction.

---

## License

MIT

---

*Built with care. No hidden data. Ironic, right?*
