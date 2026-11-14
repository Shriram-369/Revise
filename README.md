# Revise Pro

Spaced-repetition revision app for developers. React (Vite) client, Express API, MongoDB Atlas.

## Structure
```
revise-pro/
├── client/            React app (Vite)
│   └── src/           App, Topics, TopicView, TopicForm, Review, Insights
├── server/
│   └── src/
│       ├── config.js          validated env vars
│       ├── index.js           app bootstrap, security, graceful shutdown
│       ├── middleware/        auth (JWT cookie), error handling
│       ├── models/            User, Topic
│       ├── routes/            auth, topics
│       └── utils/scheduler.js SM-2 spaced repetition
├── Dockerfile
└── package.json       root scripts
```

## Run locally
1. Atlas: create a free cluster, a database user, and allow your IP. Copy the connection string.
2. `cp server/.env.example server/.env` and fill in `MONGODB_URI` and `JWT_SECRET`
   (generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
3. From this folder:
   ```
   npm run install:all
   npm run dev
   ```
4. Open http://localhost:5173 (API runs on :4000, proxied by Vite).

## Production
- **Single server:** `npm run build`, then run the server with `NODE_ENV=production`. It serves `client/dist` and the API from one origin.
- **Docker:** `docker build -t revise-pro .` then `docker run -p 4000:4000 --env-file server/.env -e NODE_ENV=production revise-pro`
- Set `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production` on your host (Render, Railway, Fly.io...). In Atlas, allow your host's IP.
- Health check: `GET /healthz`. Serve over HTTPS; auth cookies are `Secure` in production.

## Features
Accounts, topics with notes/tags/links, code snippets with syntax highlighting, flashcards, SM-2 scheduling
(Again/Hard/Good/Easy), keyboard-driven review sessions (Space, then 1-4), daily goal, streak, 12-week activity map,
7-day workload, subject breakdown, search and filters with pagination, dark mode, JSON backup and restore.

## Images (Cloudinary)
1. Create a free account at cloudinary.com. In the dashboard, copy your **API environment variable**
   (it looks like `cloudinary://<api_key>:<api_secret>@<cloud_name>`; make sure the real API secret is filled in).
2. Add it as `CLOUDINARY_URL` in `server/.env` locally, and in Render's Environment tab when deployed.
3. Open a topic and use **Add image** (or paste a screenshot). Images are stored in Cloudinary; MongoDB only keeps their links.

Without `CLOUDINARY_URL` the app still works, and uploads show a "not configured" message.
Backup files include image links but Restore does not re-attach images.
