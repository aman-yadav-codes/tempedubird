This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Multi-Tenant Deployment

EduBird supports one repository with separate Vercel projects for platform and institution traffic.

Use the same `DATABASE_URL` for each deployment. Then choose exactly one app mode block below for each deployment.

Accepted `APP_TYPE` / `NEXT_PUBLIC_APP_TYPE` values:

- `all`: allows platform admins and institution-side users.
- `platform`: allows only platform admin accounts.
- `institution`: allows institution-side users only, including institution admins, teachers, students, parents, and drivers. Platform admins are blocked.
- `hybrid`: legacy alias for `all`; kept only for backward compatibility.

Use only one of these blocks per deployment.

### 1. All-in-One Deployment

Use this for `https://final-edubird.vercel.app/`. This deployment allows both platform and institution areas.

```env
# Both platform and institution routes are available.
APP_TYPE=all
NEXT_PUBLIC_APP_TYPE=all

# Current all-in-one Vercel URL.
NEXT_PUBLIC_APP_URL=https://final-edubird.vercel.app

# Platform/all-in-one hostnames. No protocol.
PLATFORM_HOSTS=final-edubird.vercel.app
NEXT_PUBLIC_PLATFORM_HOSTS=final-edubird.vercel.app

# Institution root domains for tenant subdomain fallback. No protocol.
INSTITUTION_DOMAIN_SUFFIXES=vercel.app
NEXT_PUBLIC_INSTITUTION_DOMAIN_SUFFIXES=vercel.app
```

### 2. Institution-Only Deployment

Use this for an institution deployment, for example `https://edubird-institution.vercel.app/`. This deployment is for one institution website and institution-scoped admin/student/teacher/parent/driver panels.

```env
# Only institution public site and institution-scoped panels are intended here.
APP_TYPE=institution
NEXT_PUBLIC_APP_TYPE=institution

# Current institution Vercel URL.
NEXT_PUBLIC_APP_URL=https://edubird-institution.vercel.app

# Required tenant lock for this institution deployment.
# Only users with a membership in this institution can login here.
INSTITUTION_ID=9
NEXT_PUBLIC_INSTITUTION_ID=9

# Institution root domains. No protocol.
# Used only as fallback when INSTITUTION_ID is not set.
INSTITUTION_DOMAIN_SUFFIXES=vercel.app
NEXT_PUBLIC_INSTITUTION_DOMAIN_SUFFIXES=vercel.app
```

### 3. Platform-Only Deployment

Use this for `https://platform-admin-only.vercel.app/`. This deployment is only for platform admin, sales, permissions, institution management, and platform-level operations.

```env
# Only platform/admin routes are intended for this deployment.
APP_TYPE=platform
NEXT_PUBLIC_APP_TYPE=platform

# Current platform-only Vercel URL.
NEXT_PUBLIC_APP_URL=https://platform-admin-only.vercel.app

# Platform hostnames. No protocol.
PLATFORM_HOSTS=platform-admin-only.vercel.app,final-edubird.vercel.app
NEXT_PUBLIC_PLATFORM_HOSTS=platform-admin-only.vercel.app,final-edubird.vercel.app
```

Institution deployments should set `INSTITUTION_ID` for the school they belong to. For example, Edubird uses `INSTITUTION_ID=9`; MP English School uses `INSTITUTION_ID=1`. When `INSTITUTION_ID` is present, it is used before domain matching. If it is not set, institution domains are resolved through `institution_domains`, then `INSTITUTION_DOMAIN_SUFFIXES` allows subdomain fallback such as `mp-english-school.vercel.app` resolving to institution slug `mp-english-school`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

