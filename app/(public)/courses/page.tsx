"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Grid2X2, List, Loader2, Search } from "lucide-react";

import { CourseCard } from "@/components/public/course-card";
import {
  CourseFilterSheet,
  DEFAULT_FILTERS,
  type FilterState,
} from "@/components/public/course-filter-sheet";
import { InstitutePagination } from "@/components/public/institutes/institute-pagination";
import { DebouncedSearchInput } from "@/components/shared/debounced-search-input";
import { Button } from "@/components/ui/button";
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
import { RightInquiryForm } from "@/components/public/right-inquiry-form";
import { ProgramEnrollmentDialog, type ProgramEnrollmentTarget } from "@/components/public/program-enrollment-dialog";
import { CourseEnquiryDialog, type CourseEnquiryTarget } from "@/components/public/course-enquiry-dialog";
import Link from "next/link";

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

function isPublicCourseCategory(value: unknown): value is PublicCourseCategory {
  if (!value || typeof value !== "object") return false;
  const category = value as Partial<PublicCourseCategory>;
  return (
    typeof category.id === "number" &&
    typeof category.name === "string" &&
    typeof category.slug === "string"
  );
}

function isCourseImage(value: unknown): value is { id: number; url: string; mediaType?: "image" | "video" } {
  if (!value || typeof value !== "object") return false;
  const image = value as { id?: unknown; url?: unknown };
  return typeof image.id === "number" && typeof image.url === "string";
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
    rating: typeof course.rating === "number" ? course.rating : undefined,
    reviews: typeof course.reviews === "number" ? course.reviews : undefined,
    price: typeof course.price === "string" ? course.price : "Contact",
    fee_amount: typeof course.fee_amount === "string" || typeof course.fee_amount === "number" ? course.fee_amount : undefined,
    institutionId: typeof course.institutionId === "number" ? course.institutionId : (typeof course.institution_id === "number" ? course.institution_id : undefined),
    institution_id: typeof course.institution_id === "number" ? course.institution_id : (typeof course.institutionId === "number" ? course.institutionId : undefined),
    verified: typeof course.verified === "boolean" ? course.verified : true,
    students: typeof course.students === "string" ? course.students : "Open seats",
    seatsAvailable: typeof course.seatsAvailable === "number" ? course.seatsAvailable : null,
    teachingMethod: typeof course.teachingMethod === "string" ? course.teachingMethod : null,
    programType: typeof course.programType === "string" ? course.programType : null,
    languages: Array.isArray(course.languages) ? course.languages.filter((item): item is string => typeof item === "string") : [],
    subjects: Array.isArray(course.subjects) ? course.subjects.filter((item): item is string => typeof item === "string") : [],
    sections: Array.isArray(course.sections) ? course.sections.filter((item): item is string => typeof item === "string") : [],
    images: Array.isArray(course.images) ? course.images.filter(isCourseImage) : [],
    tags: Array.isArray(course.tags) ? course.tags.filter((item): item is string => typeof item === "string") : [],
  };
}

function filterCourses(state: CoursesDirectoryState, courses: CourseListItem[]) {
  const query = state.search.trim().toLowerCase();
  let list = [...courses];

  if (query) {
    list = list.filter((course) =>
      [course.title, course.institute, course.category, ...(course.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(query),
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

function CourseCardSkeleton({ viewMode }: { viewMode: CoursesDirectoryState["viewMode"] }) {
  if (viewMode === "list") {
    return (
      <div className="grid gap-4 rounded-lg border border-border bg-card/80 p-3 sm:grid-cols-[280px_minmax(0,1fr)]">
        <Skeleton className="aspect-[16/9] min-h-[180px] rounded-md" />
        <div className="flex min-w-0 flex-col justify-between gap-5 p-2">
          <div className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-7 w-3/5" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/80 p-3">
      <Skeleton className="aspect-[16/7] rounded-md" />
      <div className="space-y-4 p-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

import { useCategoryAvailability } from "@/hooks/use-category-availability";

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
    "public.courses.directory",
    defaultCoursesState,
    { version: 1, validate: isCoursesDirectoryState },
  );

  const handleEnrollClick = (prog: any) => {
    setSelectedEnrollProgram({
      id: prog.id,
      title: prog.title,
      institution_id: prog.institution_id || prog.institutionId,
      institution_name: prog.institute,
      fee_amount: prog.fee_amount || prog.price,
      duration: prog.duration,
    });
    setEnrollModalOpen(true);
  };

  const handleEnquireClick = (prog: any) => {
    setSelectedEnquiryCourse({
      id: prog.id,
      title: prog.title,
      institute: prog.institute,
      institution_id: prog.institution_id || prog.institutionId,
      price: prog.price,
      duration: prog.duration,
    });
    setEnquiryModalOpen(true);
  };

  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const response = await fetch("/api/categories?limit=100", { cache: "no-store" });
        if (!response.ok) return;

        const payload: unknown = await response.json();
        const rows =
          payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
            ? (payload as { data: unknown[] }).data.filter(isPublicCourseCategory)
            : [];

        if (!ignore && rows.length > 0) {
          setPublicCategories(rows);
        }
      } catch {
        if (!ignore) {
          setPublicCategories([]);
        }
      } finally {
        if (!ignore) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadCourses() {
      setCoursesLoading(true);
      try {
        const url =
          isInstitutionalAdmin && activeInstitutionId
            ? `/api/courses?limit=100&institutionId=${activeInstitutionId}`
            : "/api/courses?limit=100";
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          if (!ignore) setPublicCourses(null);
          return;
        }

        const payload: unknown = await response.json();
        const rows =
          payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
            ? (payload as { data: unknown[] }).data
                .map(normalizePublicCourse)
                .filter((item): item is CourseListItem => item !== null)
            : [];

        if (!ignore) {
          setPublicCourses(rows);
        }
      } catch {
        if (!ignore) {
          setPublicCourses(null);
        }
      } finally {
        if (!ignore) {
          setCoursesLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, [activeInstitutionId, isInstitutionalAdmin]);

  const categoryOptions = useMemo(() => {
    if (publicCategories.length > 0) return publicCategories;
    if (categoriesLoading) return [];
    return fallbackCategories;
  }, [categoriesLoading, publicCategories]);

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

  const courses = publicCourses ?? fallbackCoursesWithMainCategories;
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
    <div className="py-8">
      <div className="container mx-auto px-4">
        <Breadcrumb className="mb-6">
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

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-end">
          <div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Explore Courses</h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Browse verified courses from trusted institutes
            </p>
          </div>

          <div className="flex min-h-11 overflow-hidden rounded-md border border-border bg-background">
            <DebouncedSearchInput
              value={state.search}
              onValueChange={(search) => updateState({ search })}
              debounceMs={350}
              placeholder="Search courses, institute or skill..."
              className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 text-sm shadow-none focus-visible:ring-0"
            />
            <button
              aria-label="Search courses"
              className="m-1 flex w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="sticky top-16 z-30 mb-6 rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Select value={state.category} onValueChange={(category) => updateState({ category })}>
                <SelectTrigger className="h-10 w-[190px] bg-background font-medium">
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
                  className="h-10 rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
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
                <SelectTrigger className="h-10 w-[190px] bg-background text-muted-foreground">
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

              <div className="flex items-center gap-2">
                <button
                  aria-label="Grid view"
                  onClick={() => setState((current) => ({ ...current, viewMode: "grid" }))}
                  className={`flex h-10 w-10 items-center justify-center rounded-md border ${
                    state.viewMode === "grid" ? "border-primary text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  <Grid2X2 className="h-4 w-4" />
                </button>
                <button
                  aria-label="List view"
                  onClick={() => setState((current) => ({ ...current, viewMode: "list" }))}
                  className={`flex h-10 w-10 items-center justify-center rounded-md border ${
                    state.viewMode === "list" ? "border-primary text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div ref={resultsTopRef} className="scroll-mt-48" />

        <div className="space-y-6">
          {isLoading ? (
            <div
              className={
                state.viewMode === "grid"
                  ? "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid gap-5"
              }
              aria-label="Loading courses"
            >
              {Array.from({ length: PAGE_SIZE }, (_, index) => (
                <CourseCardSkeleton key={index} viewMode={state.viewMode} />
              ))}
            </div>
          ) : pageCourses.length > 0 ? (
            <div
              className={
                state.viewMode === "grid"
                  ? "grid gap-6 opacity-100 transition-opacity duration-300 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid gap-5 opacity-100 transition-opacity duration-300"
              }
            >
              {pageCourses.map((course) => (
                <CourseCard
                  key={course.courseKey}
                  {...course}
                  viewMode={state.viewMode}
                  onEnroll={handleEnrollClick}
                  onEnquire={handleEnquireClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card/70 px-6 py-20 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="mb-1 text-lg font-semibold text-foreground">No courses found</h3>
              <p className="mb-4 text-sm text-muted-foreground">Try adjusting or clearing your filters.</p>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear all filters
              </Button>
            </div>
          )}

          {!isLoading && results.length > PAGE_SIZE && (
            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {pageStart + 1}-{pageStart + pageCourses.length}
                </span>{" "}
                of <span className="font-semibold text-foreground">{results.length}</span> courses
              </p>
              <InstitutePagination
                page={safePage}
                pageCount={pageCount}
                onPageChange={changePage}
              />
              <span />
            </div>
          )}
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
