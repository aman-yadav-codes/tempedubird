# EduBird Socket Server

Standalone Socket.IO server for instant EduBird notifications.

The Next.js app still writes notifications to the database. After commit, it calls this socket server through a private HTTP endpoint, and the socket server emits to connected users.

## Ports

Open this on the Oracle instance:

```text
TCP 3040
```

If you place Nginx in front of it, expose `443` publicly and proxy `/socket.io` plus `/internal/notifications/publish` to `localhost:3040`.

## Environment

Copy `.env.example` to `.env` and update:

```env
SOCKET_PORT=3040
SOCKET_HOST=0.0.0.0
SOCKET_PATH=/socket.io
SOCKET_CORS_ORIGINS=https://final-edubird.vercel.app,http://localhost:3000
JWT_SECRET=same-secret-as-nextjs-app
SOCKET_INTERNAL_SECRET=long-random-private-secret
```

For horizontal scaling, install Redis and set:

```env
REDIS_URL=redis://127.0.0.1:6379
```

## App Env

Set these in the Next.js app:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3040
SOCKET_SERVER_INTERNAL_URL=http://localhost:3040
SOCKET_INTERNAL_SECRET=long-random-private-secret
```

In production, use the Oracle socket domain/IP:

```env
NEXT_PUBLIC_SOCKET_URL=https://socket.your-domain.com
SOCKET_SERVER_INTERNAL_URL=https://socket.your-domain.com
```

## Local Check

```bash
npm install
npm run check
npm start
```

Health:

```text
GET http://localhost:3040/health
```

Internal publish:

```text
POST /internal/notifications/publish
Authorization: Bearer SOCKET_INTERNAL_SECRET
```

## PM2

```bash
pm2 start ecosystem.config.cjs
pm2 logs edubird-socket-server
pm2 save
```
