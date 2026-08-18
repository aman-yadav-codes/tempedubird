import { HeroSection } from "@/components/home/hero-section";
import { CategoriesSection } from "@/components/home/categories-section";
import { FeaturedCoursesSection } from "@/components/home/featured-courses-section";
import { WhyChooseUsSection } from "@/components/home/why-choose-us-section";
import { CtaSection } from "@/components/home/cta-section";

export const metadata = {
  title: "EduBird - Discover Courses, Top Institutes, Schools & Teachers Across India",
  description:
    "Explore verified courses, colleges, schools, coaching institutes, and expert faculty across India. Compare fee structures, syllabus, campus facilities, and enroll online.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategoriesSection />
      <FeaturedCoursesSection />
      <WhyChooseUsSection />
      <CtaSection />
    </>
  );
}
