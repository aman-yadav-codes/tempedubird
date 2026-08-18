import { ChevronLeft, ChevronRight } from "lucide-react";

type InstitutePaginationProps = {
  page?: number;
  currentPage?: number;
  pageCount?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
};

export function InstitutePagination({
  page,
  currentPage,
  pageCount,
  totalPages,
  onPageChange,
}: InstitutePaginationProps) {
  const activePage = currentPage ?? page ?? 1;
  const total = totalPages ?? pageCount ?? 1;

  if (total <= 1) return null;

  return (
    <div className="flex justify-center">
      <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-background p-1">
        <button
          className="flex h-9 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-45"
          disabled={activePage <= 1}
          onClick={() => onPageChange(activePage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        {Array.from({ length: total }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            className={`h-9 w-9 rounded-md text-sm font-medium transition ${
              pageNumber === activePage
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          className="flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-45"
          disabled={activePage >= total}
          onClick={() => onPageChange(activePage + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
