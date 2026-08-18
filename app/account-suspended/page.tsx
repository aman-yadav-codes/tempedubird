import Link from "next/link";
import { AlertTriangle, Home, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

export default async function AccountSuspendedPage({
  searchParams,
}: {
  searchParams?: Promise<{ reason?: string }>;
}) {
  const reason = (await searchParams)?.reason;
  const institutionSuspended = reason === "institution";

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
          <AlertTriangle className="size-8 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your account has been suspended
        </h1>

        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {institutionSuspended
            ? "Your institution access is currently suspended. Please contact your institution for more details."
            : "Your account is currently inactive. Please contact your institution for more details."}
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="size-4" />
              Home
            </Link>
          </Button>

          <Button asChild className="gap-2">
            <Link href="/contact">
              <Mail className="size-4" />
              Contact Institution
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
