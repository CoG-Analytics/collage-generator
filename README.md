# Scrapbook Collage Generator Prototype

Client-side scrapbook collage web app prototype based on the PRD.

## Features

- Upload and validate 2-4 JPG/PNG images (max 20MB each)
- Select frame size and orientation
- Choose predefined 2/3/4-photo templates
- Real-time canvas preview with safe-zone overlay
- Per-slot fit mode (`cover`/`contain`), pan, zoom, and 90-degree rotation
- Export print-ready PNG at exact 300 DPI target dimensions

## Tech

- Next.js + React + TypeScript
- Zustand for state management
- Tailwind CSS
- react-dropzone for upload UX

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
