# EduBird Cron Jobs Worker

Standalone PM2 worker for processing EduBird scheduled jobs outside Vercel Cron.
It starts from `.env`, then syncs runtime settings from the app database through:

```text
GET /api/cron/worker-config
POST /api/cron/worker-heartbeat
```

The worker calls the Next.js endpoint:

```text
GET /api/cron/run-scheduled-jobs
```

That endpoint runs `runDueScheduledJobs()` in the main app, which publishes due blogs and marks jobs completed.

## Environment

Copy `.env.example` to `.env` and update:

```env
CRON_TARGET_URL=https://your-domain.com/api/cron/run-scheduled-jobs
CRON_SECRET=same-secret-as-nextjs-app
CRON_INTERVAL_MS=60000
CRON_REQUEST_TIMEOUT_MS=30000
CRON_RUN_ON_START=true
```

`CRON_INTERVAL_MS`, `CRON_REQUEST_TIMEOUT_MS`, `CRON_RUN_ON_START`, `WORKER_NAME`,
`HEALTH_PORT`, `CRON_TARGET_URL`, and the runtime cron secret can be updated from
Settings -> General -> Cron Jobs by a platform admin.

`CRON_CONFIG_SECRET` is optional. If set, it is used only to fetch worker config.
If omitted, `CRON_SECRET` is used for both config sync and cron execution.

`HEALTH_PORT` is optional. If set, the worker exposes a local JSON health endpoint:

```text
http://localhost:3030/health
```

## Local Check

```bash
npm run check
npm start
```

## PM2

```bash
pm2 start ecosystem.config.cjs
pm2 logs edubird-cron-jobs
pm2 save
```
