"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckCircle2,
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
} from "lucide-react";

const HERO_STATS = [
  { value: "50,000+", label: "Courses", icon: BookOpen },
  { value: "10,000+", label: "Institutes", icon: Users },
  { value: "100+", label: "Categories", icon: GraduationCap },
  { value: "1M+", label: "Learners", icon: TrendingUp },
];

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDFD] via-[#FFF8F8]/60 to-white py-12 lg:py-20 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Verified Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/80 text-[#D92D20] text-xs font-semibold border border-rose-200/60 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#D92D20]" />
              <span>Verified Learning Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
              Find Your Perfect Course from{" "}
              <span className="text-[#D92D20]">Top Institutes</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              Discover verified courses from trusted educational institutions.
              Compare, enroll, and start your learning journey today.
            </p>

            {/* Hero Search Box */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl shadow-lg border border-gray-100 max-w-2xl"
            >
              <div className="relative flex-1 w-full flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, institutes, or skills..."
                  className="w-full bg-transparent text-gray-900 text-sm font-normal py-3 pl-11 pr-4 outline-none placeholder:text-gray-400"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto bg-[#D92D20] hover:bg-[#B91C1C] text-white font-bold text-sm px-7 py-3 rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
              >
                Search Courses
              </button>
            </form>

            {/* 4 Stat Badges */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl border-t border-gray-100">
              {HERO_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-3 p-2 rounded-xl">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D92D20]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900 leading-none">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-500 font-medium mt-1">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Hero Image Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Background ambient glow */}
              <div className="absolute -top-4 -bottom-4 -left-4 -right-4 bg-gradient-to-r from-rose-200/40 via-orange-100/40 to-rose-300/30 rounded-3xl blur-xl -z-10" />

              <div className="relative rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-2xl">
                <div className="relative h-[340px] sm:h-[420px] w-full">
                  <Image
                    src="/images/hero-books.jpg"
                    alt="Stack of graduation textbooks and cap"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
