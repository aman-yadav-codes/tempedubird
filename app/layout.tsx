import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { RootProviders } from "@/components/providers/root-providers";
import { ThemeInit } from "@/components/providers/theme-init";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://edubird.in"),
  title: {
    default: "EduBird — Find Your Perfect Course",
    template: "%s — EduBird",
  },
  description:
    "Discover verified courses from trusted educational institutions. Compare, enroll, and start your learning journey today.",
  icons: {
    icon: "/icons/edubird.ico",
    shortcut: "/icons/edubird.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("app-theme")?.value;
  const initialTheme = cookieTheme === "light" || cookieTheme === "dark" ? cookieTheme : "dark";
  const initialScope = "public";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme-scope={initialScope}
      data-theme={initialTheme}
      style={{ colorScheme: initialTheme }}
      className={cn(
        "h-full",
        initialTheme === "dark" && "dark",
        "antialiased",
        geistSans.variable,
        "font-sans",
        inter.variable
      )}
    >

      <body
        suppressHydrationWarning={true}
        className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeInit />
        <RootProviders>
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
