import type { Metadata } from "next";
import { TeachersDirectory } from "@/components/public/teachers/teachers-directory";

export const metadata: Metadata = {
  title: "Faculty & Teachers Directory | EduBird",
  description:
    "Explore verified teachers, subject specialists, and competitive exam faculty members across India. Connect directly with expert educators.",
  alternates: {
    canonical: "/teachers",
  },
  openGraph: {
    title: "Faculty & Teachers Directory - EduBird",
    description:
      "Find verified educational faculty trusted by learners across India.",
    url: "/teachers",
    siteName: "EduBird",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TeachersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:py-8">
        <TeachersDirectory />
      </div>
    </div>
  );
}
