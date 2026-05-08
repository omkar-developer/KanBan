# KanBan — Offline-first Notes & Kanban

  A fast, local-first Kanban-style notes app built with React, TypeScript, Vite, and Tauri. Focused on privacy, keyboard-friendly workflows, and delightful UX.

  ✨ Features
  - Offline-first with local storage and optional SQLite/Tauri backend
  - Drag & drop columns and cards with smooth animations
  - Rich Markdown notes, backlinks, and task comments
  - Themes, tag filtering, and quick-add parsing

  Getting started

  ```bash
  # install deps
  npm install

  # run in development (web)
  npm run dev

  # build for production
  npm run build

  # (Optional) run the Tauri desktop app
  npm run tauri dev
  ```

  Project layout (high level)
  - `src/` — UI, pages, components, and hooks
  - `src-tauri/` — native desktop glue (Tauri)
  - `storage/` — storage adapters (IndexedDB, SQLite)
  - `state/` — app state and stores

  Contributing

  Contributions are welcome — open an issue or a PR. Prefer small, focused changes and include screenshots for UI tweaks.

  License

  This project is MIT licensed. See LICENSE for details.

  Contact

  Built with ❤️ — open issues or reach out on GitHub.

  Screenshot / Demo

  Add a GIF or screenshot at `public/` and link it here to showcase the app.

  ---
