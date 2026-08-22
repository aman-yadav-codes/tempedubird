"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useClientPersistedState } from "@/hooks/use-client-persisted-state";
import { InstituteCard } from "./institute-card";
import { institutes, type PublicInstitute } from "./institute-data";
import { InstitutePageHeader } from "./institute-page-header";
import { InstitutePagination } from "./institute-pagination";
import { InstituteSearchToolbar, type InstituteFilters } from "./institute-search-toolbar";
import { RightInquiryForm } from "@/components/public/right-inquiry-form";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 9;

const campusImages = [
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=900&q=80",
];

const defaultFilters: InstituteFilters = {
  search: "",
  location: "all",
  type: "all",
  course: "all",
  minRating: "0",
  sort: "popular",
  verifiedOnly: false,
};

type DirectoryState = {
  filters: InstituteFilters;
  page: number;
  viewMode: "grid" | "list";
};

const defaultDirectoryState: DirectoryState = {
  filters: defaultFilters,
  page: 1,
  viewMode: "grid",
};

function isInstituteFilters(value: unknown): value is InstituteFilters {
  if (!value || typeof value !== "object") return false;
  const filters = value as Partial<Record<keyof InstituteFilters, unknown>>;
  return (
    typeof filters.search === "string" &&
    typeof filters.location === "string" &&
    typeof filters.type === "string" &&
    typeof filters.course === "string" &&
    typeof filters.minRating === "string" &&
    typeof filters.sort === "string" &&
    typeof filters.verifiedOnly === "boolean"
  );
}

function isDirectoryState(value: unknown): value is DirectoryState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<DirectoryState>;
  return (
    isInstituteFilters(state.filters) &&
    typeof state.page === "number" &&
    Number.isInteger(state.page) &&
    state.page >= 1 &&
    (state.viewMode === "grid" || state.viewMode === "list")
  );
}

function studentCountValue(students: string) {
  const numeric = Number(students.replace(/[^0-9.]/g, ""));
  return students.toLowerCase().includes("k") ? numeric * 1000 : numeric;
}

function matchesSearch(institute: PublicInstitute, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [institute.name, institute.location, institute.course, institute.type]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function filterInstitutes(list: PublicInstitute[], filters: InstituteFilters) {
  const minRating = Number(filters.minRating);

  const filtered = list.filter((institute) => {
    if (!matchesSearch(institute, filters.search)) return false;
    if (filters.location !== "all" && institute.locationKey !== filters.location) return false;
    if (filters.type !== "all" && institute.type !== filters.type) return false;
    if (filters.course !== "all" && institute.course !== filters.course) return false;
    if (institute.rating < minRating) return false;
    if (filters.verifiedOnly && !institute.verified) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "rating-desc") return b.rating - a.rating;
    if (filters.sort === "students-desc") return studentCountValue(b.students) - studentCountValue(a.students);
    if (filters.sort === "newest") return b.established - a.established;
    return b.reviews - a.reviews;
  });
}

export function InstitutesDirectory() {
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const [directoryState, setDirectoryState] = useClientPersistedState<DirectoryState>(
    "public.institutes.directory",
    defaultDirectoryState,
    { version: 1, validate: isDirectoryState },
  );
  const { filters, page, viewMode } = directoryState;

  const [dbInstitutes, setDbInstitutes] = useState<PublicInstitute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbTotal, setDbTotal] = useState(0);
  const [dbPageCount, setDbPageCount] = useState(1);

  // Fetch all live institutes from PostgreSQL API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      search: filters.search.trim(),
      type: filters.type,
      location: filters.location,
    });

    fetch(`/api/institutions?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((resData) => {
        if (!isMounted) return;
        if (Array.isArray(resData.data) && resData.data.length > 0) {
          const mappedList: PublicInstitute[] = resData.data.map((row: any, idx: number) => {
            const locName = row.location_name || "Varanasi, India";
            const locKey = locName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "delhi";
            const typeName = row.type_name || "Educational Institute";
            const categoryName = row.subtype_name || typeName;
            const imgUrl = row.image_url || row.logo_url || campusImages[idx % campusImages.length];

            return {
              id: row.id,
              name: row.name,
              location: locName,
              locationKey: locKey,
              type: typeName.toLowerCase().includes("school") ? "school" : typeName.toLowerCase().includes("coaching") ? "coaching" : "university",
              course: categoryName,
              courses: row.course_count > 0 ? row.course_count : 12,
              rating: 4.8,
              reviews: 85 + (row.id % 45),
              students: row.student_count > 0 ? `${row.student_count}+` : "400+",
              image: imgUrl,
              category: typeName,
              verified: true,
              established: row.established_year || 2018,
              filters: ["aicte", "private", "on-campus", "fee-1l-3l", "placement-cell", "job-assistance", "open-now"],
            };
          });

          setDbInstitutes(mappedList);
          setDbTotal(resData.total || mappedList.length);
          setDbPageCount(resData.pageCount || 1);
        } else {
          // Fallback to static mock if empty
          setDbInstitutes(institutes);
          setDbTotal(institutes.length);
          setDbPageCount(Math.ceil(institutes.length / PAGE_SIZE));
        }
      })
      .catch((err) => {
        console.error("Error fetching institutions from API:", err);
        if (isMounted) {
          setDbInstitutes(institutes);
          setDbTotal(institutes.length);
          setDbPageCount(Math.ceil(institutes.length / PAGE_SIZE));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, filters.search, filters.type, filters.location]);

  const filteredInstitutes = useMemo(() => filterInstitutes(dbInstitutes, filters), [dbInstitutes, filters]);
  const pageCount = Math.max(1, dbPageCount || Math.ceil(filteredInstitutes.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedInstitutes = filteredInstitutes;

  useEffect(() => {
    if (page !== safePage) {
      setDirectoryState((current) => ({ ...current, page: safePage }));
    }
  }, [page, safePage, setDirectoryState]);

  const updateFilter = <K extends keyof InstituteFilters>(key: K, value: InstituteFilters[K]) => {
    setDirectoryState((current) => ({
      ...current,
      page: 1,
      filters: {
        ...current.filters,
        [key]: value,
      },
    }));
  };

  const resetFilters = () => {
    setDirectoryState((current) => ({ ...current, page: 1, filters: defaultFilters }));
  };

  const changePage = (nextPage: number) => {
    setDirectoryState((current) => ({ ...current, page: nextPage }));
    window.requestAnimationFrame(() => {
      resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="min-w-0">
      <InstitutePageHeader
        search={filters.search}
        onSearchChange={(search) => updateFilter("search", search)}
      />

      <InstituteSearchToolbar
        filters={filters}
        viewMode={viewMode}
        onFilterChange={updateFilter}
        onResetFilters={resetFilters}
        onViewModeChange={(nextViewMode) => {
          setDirectoryState((current) => ({ ...current, viewMode: nextViewMode }));
        }}
      />

      <div ref={resultsTopRef} className="scroll-mt-48" />

      <div className="mt-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card/70 px-6 py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Loading partner institutes from database...</p>
          </div>
        ) : pagedInstitutes.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid gap-5"
            }
          >
            {pagedInstitutes.map((institute) => (
              <InstituteCard key={institute.id} institute={institute} viewMode={viewMode} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card/70 px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-foreground">No institutes found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try changing the search term or clearing a few filters.</p>
          </div>
        )}

        {pageCount > 1 && (
          <InstitutePagination
            currentPage={safePage}
            totalPages={pageCount}
            onPageChange={changePage}
          />
        )}
      </div>
    </section>
  );
}
