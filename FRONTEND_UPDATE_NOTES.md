# Frontend update notes

## Install
1. Copy everything inside `src/` over your project's `src/` folder (same paths; it replaces your old files).
2. No new npm packages are needed (React, react-router-dom, axios and Tailwind are already in your project).
3. Optional `.env` in the frontend: `VITE_API_URL=http://127.0.0.1:5000/api` (this is also the default).
4. Replace the backend with the updated `backend_optimized.zip` from this chat (two small additions below).

Fixed on the way: `App.jsx` imported `./components/sidebar` (lowercase), which works on Windows but breaks on Linux/CI builds.

## What changed

| Area | Change |
|---|---|
| Design | New navy sidebar with sections, top bar with user menu, coloured stat cards, area chart, quick actions, recent sessions table and system status, following your mock-up. Responsive: the sidebar becomes a drawer on phones. |
| Skeleton loading | Every list, table, chart, stat card and status row shows a skeleton on first load (`components/Skeleton.jsx`). Pages are lazy-loaded with a page skeleton. Refreshing keeps the old data on screen (dimmed) instead of flashing a skeleton. |
| Other loading states | `Button` has a `loading` spinner (login, save, deactivate, export, start/end session, face save). Camera "Starting camera..." overlay, per-row busy state, "Loading courses..." in selects. |
| Errors | Each section shows its own error with a Retry link. "Cannot reach the server" is shown when the backend is down. |
| Webcam loop | One frame at a time (no `setInterval`), 640 px JPEG at 0.7 quality, waits for the previous response, backs off when the server says `busy`, cancels the in-flight request when the session ends or the page closes. |
| Backend features used | Pagination (`page`, `limit`, `total`, `pages`) on students and reports; `busy`/`throttled` recognition replies; 409 "already active session" now resumes that session; `/api/health` and `/api/health/db` drive System Status; dates validated by the backend are filterable on Reports. |
| Fewer requests | A recognised student's record comes from the `/recognize` response, so the page no longer re-downloads the whole session after every scan. Search is debounced (350 ms). |
| New pages | Lecturers (list + add), Register Faces (list with Face status), Profile. They are the sidebar items in your design. |
| Face registration | Opens in a modal, 3-5 photos (backend accepts 3-8), per-photo remove, pose hints, clear progress text while the server processes. |
| Login | No more pre-filled admin email and password. Signed-in users skip the login page. |

## Backend additions (so the dashboard shows real data)
* `GET /api/reports/dashboard` now also returns `weekly`: `[{date, present}]` for the last 7 days (drives the chart; "present today" comes from it too).
* `GET /api/attendance` sessions now include `lecturer_name`.

## Not copied from the mock-up (the backend has no data for it)
* "Absent" line, growth arrows (↑2%) and "Today's Attendance 92.5%": absences are not stored, so the chart shows students marked present per day and the card shows the present count.
* Notification bell with a badge: there are no notifications. The user menu is kept.
* The crest image: a neutral shield icon is used; swap in your own logo in `Sidebar.jsx` and `Login.jsx`.

## How it was checked
Built with Vite 6 + Tailwind 4 and run in Chromium against a mock API shaped like the backend (including a 1.8 s delay to capture skeletons) and a fake camera: all pages rendered without console errors; the camera loop sent 5 frames with 0 overlapping requests, did not duplicate a repeat sighting, and stopped sending when the session ended. Not tested against the real backend, real face recognition or Tailwind 3.

## Browser face recognition (ONNX Runtime Web)
* `npm install onnxruntime-web@1.31.1` (exact version; matches `public/ort/`).
* New: `src/services/faceEngine.js`, `src/hooks/useFaceEngine.js`, `src/components/ModelStatus.jsx`, `public/models/*`, `public/ort/*`, `vercel.json`.
* Changed: `api.js` (sends embeddings), `FaceRegister.jsx`, `Attendance.jsx`, `WebcamCapture.jsx`, `Students.jsx`, `Faces.jsx`, `DashboardView.jsx`.
* `EMBEDDING_MODEL` in `faceEngine.js` must equal the backend's `EMBEDDING_MODEL`.
* Full details, threshold, re-registration and deployment: `FACE_MIGRATION.md` in the backend folder.
