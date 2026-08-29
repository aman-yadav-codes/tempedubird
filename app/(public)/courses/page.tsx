"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Grid2X2,
  List,
  Loader2,
  Search,
  Award,
  Sparkles,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Headphones,
  BookOpen,
  GraduationCap,
  Calendar,
  Layers,
  ChevronRight,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

import { CourseCard } from "@/components/public/course-card";
import {
  CourseFilterSheet,
  DEFAULT_FILTERS,
  type FilterState,
} from "@/components/public/course-filter-sheet";
import { InstitutePagination } from "@/components/public/institutes/institute-pagination";
import { DebouncedSearchInput } from "@/components/shared/debounced-search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientPersistedState } from "@/hooks/use-client-persisted-state";
import { featuredCourses } from "@/lib/data/home-data";
import { ProgramEnrollmentDialog, type ProgramEnrollmentTarget } from "@/components/public/program-enrollment-dialog";
import { CourseEnquiryDialog, type CourseEnquiryTarget } from "@/components/public/course-enquiry-dialog";
import { PortalBannerAd } from "@/components/public/portal-banner-ad";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCategoryAvailability } from "@/hooks/use-category-availability";

const PAGE_SIZE = 9;

type CourseListItem = (typeof featuredCourses)[number] & {
  courseKey: string;
  categoryId?: number | null;
  selectedCategory?: string | null;
  selectedCategoryId?: number | null;
  seatsAvailable?: number | null;
  teachingMethod?: string | null;
  programType?: string | null;
  languages?: string[];
  subjects?: string[];
  sections?: string[];
  rating?: number;
  reviews?: number;
  fee_amount?: any;
  institutionId?: number;
  institution_id?: number;
  iconUrl?: string | null;
};

type PublicCourseCategory = {
  id: number;
  name: string;
  slug: string;
};

type CoursesDirectoryState = {
  search: string;
  category: string;
  filters: FilterState;
  page: number;
  viewMode: "grid" | "list";
};

const defaultCoursesState: CoursesDirectoryState = {
  search: "",
  category: "all",
  filters: DEFAULT_FILTERS,
  page: 1,
  viewMode: "grid",
};

const courseCatalog: CourseListItem[] = Array.from({ length: 20 }, (_, index) => {
  const base = featuredCourses[index % featuredCourses.length];
  const round = Math.floor(index / featuredCourses.length) + 1;

  return {
    ...base,
    courseKey: `${base.id}-${index + 1}`,
    title: round === 1 ? base.title : `${base.title} - Cohort ${round}`,
    reviews: base.reviews + index * 7,
  };
});

const fallbackCategories: PublicCourseCategory[] = Array.from(
  new Set(featuredCourses.map((course) => course.category)),
).map((name, index) => ({
  id: index + 1,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
}));

function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9]/g, ""));
}

function isFilterState(value: unknown): value is FilterState {
  if (!value || typeof value !== "object") return false;
  const filters = value as Partial<FilterState>;
  return (
    (filters.priceRange === null ||
      (typeof filters.priceRange === "object" &&
        filters.priceRange !== null &&
        typeof filters.priceRange.min === "number" &&
        typeof filters.priceRange.max === "number")) &&
    typeof filters.minRating === "number" &&
    Array.isArray(filters.tags) &&
    filters.tags.every((tag) => typeof tag === "string") &&
    typeof filters.sort === "string"
  );
}

function isCoursesDirectoryState(value: unknown): value is CoursesDirectoryState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<CoursesDirectoryState>;
  return (
    typeof state.search === "string" &&
    typeof state.category === "string" &&
    isFilterState(state.filters) &&
    typeof state.page === "number" &&
    Number.isInteger(state.page) &&
    state.page >= 1 &&
    (state.viewMode === "grid" || state.viewMode === "list")
  );
}

function countActiveFilters(filters: FilterState) {
  let count = 0;
  if (filters.priceRange !== null) count++;
  if (filters.minRating > 0) count++;
  if (filters.tags.length > 0) count++;
  if (filters.sort !== "default") count++;
  return count;
}

function normalizePublicCourse(value: unknown): CourseListItem | null {
  if (!value || typeof value !== "object") return null;
  const course = value as Record<string, unknown>;

  if (
    typeof course.id !== "number" ||
    typeof course.title !== "string" ||
    typeof course.institute !== "string" ||
    typeof course.category !== "string"
  ) {
    return null;
  }

  return {
    id: course.id,
    courseKey: `program-${course.id}`,
    slug: typeof course.slug === "string" ? course.slug : String(course.id),
    title: course.title,
    shortDescription: typeof course.shortDescription === "string" ? course.shortDescription : "",
    description: typeof course.description === "string" ? course.description : "",
    institute: course.institute,
    category: course.category,
    categoryId: typeof course.categoryId === "number" ? course.categoryId : null,
    selectedCategory: typeof course.selectedCategory === "string" ? course.selectedCategory : null,
    selectedCategoryId: typeof course.selectedCategoryId === "number" ? course.selectedCategoryId : null,
    duration: typeof course.duration === "string" ? course.duration : "Flexible",
    level: typeof course.level === "string" ? course.level : "Course",
    rating: typeof course.rating === "number" ? course.rating : (typeof course.course_avg_rating === "number" ? course.course_avg_rating : undefined),
    reviews: typeof course.reviews === "number" ? course.reviews : (typeof course.reviewsCount === "number" ? course.reviewsCount : (typeof course.course_reviews_count === "number" ? course.course_reviews_count : undefined)),
    price: typeof course.price === "string" ? course.price : "Contact",
    fee_amount: typeof course.fee_amount === "string" || typeof course.fee_amount === "number" ? course.fee_amount : undefined,
    institutionId: typeof course.institutionId === "number" ? course.institutionId : (typeof course.institution_id === "number" ? course.institution_id : undefined),
    institution_id: typeof course.institution_id === "number" ? course.institution_id : (typeof course.institutionId === "number" ? course.institutionId : undefined),
    verified: typeof course.verified === "boolean" ? course.verified : true,
    students: typeof course.students === "string" ? course.students : "Open seats",
    images: Array.isArray(course.images) ? (course.images as any) : [],
    seatsAvailable: typeof course.seatsAvailable === "number" ? course.seatsAvailable : null,
    teachingMethod: typeof course.teachingMethod === "string" ? course.teachingMethod : null,
    programType: typeof course.programType === "string" ? course.programType : null,
    languages: Array.isArray(course.languages) ? course.languages.filter((item): item is string => typeof item === "string") : [],
    subjects: Array.isArray(course.subjects) ? course.subjects.filter((item): item is string => typeof item === "string") : [],
    sections: Array.isArray(course.sections) ? course.sections.filter((item): item is string => typeof item === "string") : [],
    tags: Array.isArray(course.tags) ? course.tags.filter((item): item is string => typeof item === "string") : [],
  };
}

function filterCourses(state: CoursesDirectoryState, courses: CourseListItem[]): CourseListItem[] {
  let list = [...courses];
  const query = state.search.trim().toLowerCase();

  if (query) {
    list = list.filter(
      (course) =>
        course.title.toLowerCase().includes(query) ||
        course.institute.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query) ||
        (course.tags ?? []).some((tag) => tag.toLowerCase().includes(query)) ||
        (course.subjects ?? []).some((sub) => sub.toLowerCase().includes(query)) ||
        (course.selectedCategory ?? "").toLowerCase().includes(query),
    );
  }

  if (state.category !== "all") {
    list = list.filter((course) => course.category.toLowerCase() === state.category.toLowerCase());
  }

  if (state.filters.priceRange) {
    const { min, max } = state.filters.priceRange;
    list = list.filter((course) => {
      const price = parsePrice(course.price);
      return price >= min && price <= max;
    });
  }

  if (state.filters.minRating > 0) {
    list = list.filter((course) => typeof course.rating !== "number" || course.rating >= state.filters.minRating);
  }

  if (state.filters.tags.length > 0) {
    list = list.filter((course) =>
      state.filters.tags.some((tag) =>
        (course.tags ?? []).map((item) => item.toLowerCase()).includes(tag.toLowerCase()),
      ),
    );
  }

  switch (state.filters.sort) {
    case "rating-desc":
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case "rating-asc":
      list.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
      break;
    case "reviews-desc":
      list.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
      break;
    case "price-asc":
      list.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
      break;
    case "price-desc":
      list.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
      break;
  }

  return list;
}

function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Skeleton className="h-9 w-full rounded-xl" />
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Dynamic Middle Interstitial Banner for Courses
function CourseListingBanner({
  bannerIndex,
  onEnquire,
}: {
  bannerIndex: number;
  onEnquire: () => void;
}) {
  return (
    <PortalBannerAd
      section="course"
      placement="middle"
      onEnquire={onEnquire}
      fallbackBadge="NATIONAL SCHOLARSHIP 2026"
      fallbackTitle="Up to 100% Tuition Fee Concession & Merit Grants"
      fallbackDescription="Apply for verified national scholarship tests, institutional fee waivers & merit concessions across affiliated institutions."
      fallbackCta="Check Scholarship Eligibility"
    />
  );
}

export default function CoursesPage() {
  const { isInstitutionalAdmin, activeInstitutionId } = useCategoryAvailability();
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const [publicCategories, setPublicCategories] = useState<PublicCourseCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [publicCourses, setPublicCourses] = useState<CourseListItem[] | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedEnrollProgram, setSelectedEnrollProgram] = useState<ProgramEnrollmentTarget | null>(null);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [selectedEnquiryCourse, setSelectedEnquiryCourse] = useState<CourseEnquiryTarget | null>(null);

  const [state, setState] = useClientPersistedState<CoursesDirectoryState>(
    "edubird_courses_directory_state",
    defaultCoursesState,
    { validate: isCoursesDirectoryState },
  );

  const searchParams = useSearchParams();

  useEffect(() => {
    const urlCategory = searchParams?.get("category");
    if (urlCategory && urlCategory.trim() !== "") {
      setState((current) => ({
        ...current,
        category: urlCategory.trim(),
        page: 1,
      }));
    }
  }, [searchParams, setState]);

  // Record visitor search history
  useEffect(() => {
    const query = state.search.trim();
    if (!query || query.length < 3) return;

    const timer = setTimeout(() => {
      fetch("/api/public/search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          entity_type: "courses",
          category: state.category !== "all" ? state.category : "Courses",
        }),
      }).catch(() => undefined);
    }, 1500);

    return () => clearTimeout(timer);
  }, [state.search, state.category]);

  useEffect(() => {
    let isCancelled = false;

    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        const res = await fetch("/api/public/categories?limit=50");
        if (!res.ok) throw new Error("Failed to load categories");
        const json = await res.json();
        const rows: unknown[] = Array.isArray(json?.categories) ? json.categories : [];
        const nextCategories = rows
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const category = item as Record<string, unknown>;
            if (typeof category.id !== "number" || typeof category.name !== "string" || typeof category.slug !== "string") {
              return null;
            }
            return {
              id: category.id,
              name: category.name,
              slug: category.slug,
            };
          })
          .filter((item): item is PublicCourseCategory => item !== null);

        if (!isCancelled) {
          setPublicCategories(nextCategories);
        }
      } catch {
        if (!isCancelled) {
          setPublicCategories([]);
        }
      } finally {
        if (!isCancelled) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadCourses() {
      try {
        setCoursesLoading(true);
        const url =
          isInstitutionalAdmin && activeInstitutionId
            ? `/api/courses?limit=100&institutionId=${activeInstitutionId}`
            : "/api/courses?limit=100";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load courses");
        const json = await res.json();
        const rows: unknown[] = Array.isArray(json?.data) ? json.data : [];
        const nextCourses = rows
          .map(normalizePublicCourse)
          .filter((item): item is CourseListItem => item !== null);

        if (!isCancelled) {
          setPublicCourses(nextCourses);
        }
      } catch {
        if (!isCancelled) {
          setPublicCourses([]);
        }
      } finally {
        if (!isCancelled) {
          setCoursesLoading(false);
        }
      }
    }

    loadCourses();
    return () => {
      isCancelled = true;
    };
  }, [activeInstitutionId, isInstitutionalAdmin]);

  const handleEnrollClick = (program: {
    id: number;
    title: string;
    institute: string;
    price: string;
    duration: string;
    institution_id?: number;
    fee_amount?: string | number;
  }) => {
    setSelectedEnrollProgram({
      id: program.id,
      title: program.title,
      institute: program.institute,
      price: program.price,
      duration: program.duration,
      institution_id: program.institution_id,
      fee_amount: program.fee_amount,
    });
    setEnrollModalOpen(true);
  };

  const handleEnquireClick = (program: {
    id: number;
    title: string;
    institute: string;
    price: string;
    duration: string;
    institution_id?: number;
  }) => {
    setSelectedEnquiryCourse({
      id: program.id,
      title: program.title,
      institute: program.institute,
      price: program.price,
      duration: program.duration,
      institution_id: program.institution_id,
    });
    setEnquiryModalOpen(true);
  };

  const categoryOptions = useMemo(() => {
    if (publicCategories.length > 0) return publicCategories;
    return fallbackCategories;
  }, [publicCategories]);

  const fallbackCoursesWithMainCategories = useMemo(() => {
    if (categoryOptions.length === 0) return courseCatalog;

    return courseCatalog.map((course, index) => {
      const category = categoryOptions[index % categoryOptions.length]?.name ?? course.category;
      const tags = Array.from(new Set([...(course.tags ?? []), category]));

      return {
        ...course,
        category,
        tags,
      };
    });
  }, [categoryOptions]);

  const courses = activeInstitutionId ? (publicCourses ?? []) : (publicCourses ?? fallbackCoursesWithMainCategories);
  const isLoading = categoriesLoading || coursesLoading;
  const results = useMemo(() => filterCourses(state, courses), [courses, state]);
  const activeFilterCount = countActiveFilters(state.filters);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(state.page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageCourses = results.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    if (state.page !== safePage) {
      setState((current) => ({ ...current, page: safePage }));
    }
  }, [safePage, setState, state.page]);

  useEffect(() => {
    if (state.category === "all") return;

    const hasSelectedCategory = categoryOptions.some(
      (category) => category.name.toLowerCase() === state.category.toLowerCase(),
    );

    if (!hasSelectedCategory) {
      setState((current) => ({ ...current, category: "all", page: 1 }));
    }
  }, [categoryOptions, setState, state.category]);

  const updateState = (nextState: Partial<CoursesDirectoryState>) => {
    setState((current) => ({ ...current, ...nextState, page: 1 }));
  };

  const changePage = (page: number) => {
    setState((current) => ({ ...current, page }));
    window.requestAnimationFrame(() => {
      resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const clearAll = () => setState(defaultCoursesState);
  const isAnythingActive = state.search || state.category !== "all" || activeFilterCount > 0;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 space-y-6">
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Courses</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Title & Search Row */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-end border-b border-border/80 pb-6">
          <div>
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-1.5">Accredited Curriculum</Badge>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">Explore Courses & Programs</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Browse verified courses, fee structures, and syllabus modules from top accredited institutes.
            </p>
          </div>

          <div className="flex min-h-11 overflow-hidden rounded-xl border border-border bg-background shadow-2xs">
            <DebouncedSearchInput
              value={state.search}
              onValueChange={(search) => updateState({ search })}
              debounceMs={350}
              placeholder="Search courses, institutes, or subjects..."
              className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 text-sm shadow-none focus-visible:ring-0"
            />
            <button
              aria-label="Search courses"
              className="m-1 flex w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="sticky top-16 z-30 rounded-2xl border border-border bg-background/95 p-3 shadow-xs backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Select value={state.category} onValueChange={(category) => updateState({ category })}>
                <SelectTrigger className="h-10 w-[190px] bg-background font-medium rounded-xl">
                  <SelectValue />
                  {categoriesLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {categoriesLoading && (
                    <SelectItem value="loading-categories" disabled>
                      Loading categories...
                    </SelectItem>
                  )}
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isAnythingActive && (
                <button
                  onClick={clearAll}
                  className="h-10 rounded-xl border border-primary/40 bg-primary/10 px-4 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <CourseFilterSheet
                filters={state.filters}
                onApply={(filters) => updateState({ filters })}
                activeCount={activeFilterCount}
                categories={categoryOptions}
                isCategoriesLoading={categoriesLoading}
              />

              <Select
                value={state.filters.sort}
                onValueChange={(sort: FilterState["sort"]) =>
                  updateState({ filters: { ...state.filters, sort } })
                }
              >
                <SelectTrigger className="h-10 w-[190px] bg-background text-muted-foreground rounded-xl">
                  <span className="mr-2 shrink-0">Sort:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Popular</SelectItem>
                  <SelectItem value="rating-desc">Highest Rated</SelectItem>
                  <SelectItem value="reviews-desc">Most Reviews</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div ref={resultsTopRef} className="scroll-mt-48" />

        {/* 2-Column Main Layout: Listings Grid (3-per-row) on Left + Options/Ads on Right */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] items-start">
          {/* Main Listings Column */}
          <div className="space-y-6 min-w-0">
            {isLoading ? (
              <div
                className={
                  state.viewMode === "grid"
                    ? "grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                    : "grid gap-4"
                }
                aria-label="Loading courses"
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <CourseCardSkeleton key={index} />
                ))}
              </div>
            ) : pageCourses.length > 0 ? (
              <div
                className={
                  state.viewMode === "grid"
                    ? "grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 items-stretch"
                    : "grid gap-4"
                }
              >
                {pageCourses.map((course, idx) => {
                  const shouldInsertBanner = (idx + 1) % 3 === 0 && idx !== pageCourses.length - 1;
                  const bannerIdx = Math.floor(idx / 3);

                  return (
                    <React.Fragment key={course.courseKey}>
                      <CourseCard
                        {...course}
                        viewMode={state.viewMode}
                        onEnroll={handleEnrollClick}
                        onEnquire={handleEnquireClick}
                      />

                      {/* 200px Banner after every 3 listings */}
                      {shouldInsertBanner && (
                        <CourseListingBanner
                          bannerIndex={bannerIdx}
                          onEnquire={() => {
                            setSelectedEnquiryCourse({
                              id: course.id,
                              title: "General Admission Guidance",
                              institute: "EduBird Verified Partner",
                              price: "Free",
                              duration: "Academic Counseling",
                            });
                            setEnquiryModalOpen(true);
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/70 px-6 py-20 text-center shadow-2xs">
                <Search className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-lg font-bold text-foreground">No courses found</h3>
                <p className="mb-4 text-xs text-muted-foreground">Try adjusting or clearing your active filters.</p>
                <Button variant="outline" size="sm" onClick={clearAll} className="rounded-xl font-bold">
                  Clear all filters
                </Button>
              </div>
            )}

            {!isLoading && results.length > PAGE_SIZE && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/70 pt-6">
                <p className="text-xs text-muted-foreground font-semibold">
                  Showing{" "}
                  <span className="font-bold text-foreground">
                    {pageStart + 1}-{pageStart + pageCourses.length}
                  </span>{" "}
                  of <span className="font-bold text-foreground">{results.length}</span> courses
                </p>
                <InstitutePagination
                  page={safePage}
                  pageCount={pageCount}
                  onPageChange={changePage}
                />
              </div>
            )}
          </div>

          {/* Right Sidebar: Options & Advertisements */}
          <aside className="hidden lg:block space-y-6 sticky top-28 shrink-0">
            {/* Widget 1: Instant Course Advisory & Admission Helpline */}
            <Card className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                  <Headphones className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-foreground">Free Course Advisory</h4>
                  <p className="text-[11px] text-muted-foreground">Expert 1-on-1 Guidance</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect directly with certified counselors for eligibility verification, fee discount options, and batch timings.
              </p>

              <Button
                onClick={() => {
                  setSelectedEnquiryCourse({
                    id: 1,
                    title: "Free Career & Course Counseling",
                    institute: "Central Academic Advisory",
                    price: "100% Free",
                    duration: "Live Consultation",
                  });
                  setEnquiryModalOpen(true);
                }}
                className="w-full text-xs font-bold rounded-xl shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-1.5"
              >
                <Sparkles className="size-3.5" />
                <span>Request Free Call Back</span>
              </Button>
            </Card>

            {/* Widget 2: Dynamic Sponsored Advertisement Banner */}
            <PortalBannerAd
              section="course"
              placement="right_sidebar"
              fallbackBadge="SPECIAL OFFER"
              fallbackTitle="Free Entrance Mock Test Pass"
              fallbackDescription="Get full access to 1,500+ speed quizzes & past year solved papers."
              fallbackCta="Explore Mock Tests"
              fallbackUrl="/practice"
            />

            {/* Widget 3: Popular Course Categories */}
            <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Top Categories</h4>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {categoryOptions.slice(0, 8).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateState({ category: cat.name })}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      state.category === cat.name
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-muted hover:bg-muted/80 text-foreground border border-border/60"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </Card>

            {/* Widget 4: Quick Academic Portals */}
            <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Quick Academic Portals</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/institutes" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="size-3.5 text-primary" />
                      Verified Institutes Directory
                    </span>
                    <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/exams" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                    <span className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-primary" />
                      Entrance & Competitive Exams
                    </span>
                    <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/notes" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                    <span className="flex items-center gap-2">
                      <BookOpen className="size-3.5 text-primary" />
                      Lecture Notes & Formula Sheets
                    </span>
                    <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
                <li>
                  <Link href="/teachers" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="size-3.5 text-primary" />
                      Verified Faculty Members
                    </span>
                    <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </div>

      <ProgramEnrollmentDialog
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
        program={selectedEnrollProgram}
      />

      <CourseEnquiryDialog
        open={enquiryModalOpen}
        onOpenChange={setEnquiryModalOpen}
        course={selectedEnquiryCourse}
      />
    </div>
  );
}
