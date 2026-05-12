# Tahi Tonga Bookings — Production Deploy SOP

## Prerequisites
- Access to the codebase on your local Mac
- SSH access to vps206

---

## Step 1 — Merge & Push from Local Mac

If changes were made on `branch1main`, merge them into `main` first:

```bash
git checkout main
git merge branch1main
git push origin main
```

If changes were already committed directly to `main`, just push:

```bash
git push origin main
```

---

## Step 2 — SSH into the Server

```bash
ssh tahi_bookings@vps206
cd ~/apps/tahi_booking
```

---

## Step 3 — Set Up PATH (required every session)

```bash
export PATH=/home/tahi_bookings/apps/tahi_booking/node-v20.10.0-linux-x64-glibc-217/bin:$PATH
```

> **Tip:** To avoid doing this every time, add that line to `~/.bashrc` on the server.

---

## Step 4 — Pull, Install, Build & Restart

```bash
git pull origin main && npm install && npm run build && /home/tahi_bookings/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin/pm2 restart all
```

---

## Step 5 — Verify

Check the app is online:

```bash
/home/tahi_bookings/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin/pm2 list
```

You should see `tahi-bookings` with status **online**. Then visit the production site to confirm.

---

## One-liner (after PATH is set)

Once Step 3 is done, the full deploy is a single command:

```bash
git pull origin main && npm install && npm run build && /home/tahi_bookings/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin/pm2 restart all
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pm2: command not found` | Re-run Step 3 (PATH not set) |
| `next: command not found` | Re-run Step 3 (PATH not set) |
| `node: GLIBC not found` | You're using the wrong node — re-run Step 3 |
| Build fails with TypeScript error | Fix the error locally, commit, push, then re-run Step 4 |
| App shows old version after restart | Clear browser cache or check `pm2 list` — status must be `online` |
| `pm2 restart` shows version mismatch warning | Safe to ignore — app still restarts correctly |
