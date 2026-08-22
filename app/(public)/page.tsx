import { Suspense } from "react";
import { HomeLandingContainer } from "@/components/home/home-landing-container";
import { PlatformAdminLanding } from "@/components/home/platform-admin-landing";

export const metadata = {
  title: "EduBird - Unified Education Platform & Campus ERP System",
  description:
    "Explore verified courses, colleges, schools, coaching institutes, and automated campus ERP solutions across India. Discover courses or manage your educational institution.",
};

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <PlatformAdminLanding />
        </div>
      }
    >
      <HomeLandingContainer />
    </Suspense>
  );
}
