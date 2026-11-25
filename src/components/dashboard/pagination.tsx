"use client";
import { Icons } from "@/utils/icons";
import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  showSummary?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  showSummary = true,
}: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem =
    totalItems === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={
        showSummary
          ? "flex flex-col sm:flex-row items-center justify-between gap-4 py-4 w-full"
          : "flex items-center justify-center gap-2 w-full"
      }
    >
      {showSummary && (
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{startItem}</span> to{" "}
          <span className="font-medium">{endItem}</span> of{" "}
          <span className="font-medium">{totalItems}</span> results
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors shrink-0 hover:cursor-pointer disabled:hover:cursor-default"
          aria-label="Previous page"
        >
          <Icons.ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <button
              type="button"
              key={index}
              onClick={() => typeof page === "number" && handlePageChange(page)}
              disabled={page === "..." || page === currentPage}
              className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium border transition-colors shrink-0 ${
                page === currentPage
                  ? "bg-primary text-primary-foreground border-primary"
                  : page === "..."
                    ? "cursor-default border-transparent text-muted-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground hover:cursor-pointer"
              }`}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors shrink-0 hover:cursor-pointer disabled:hover:cursor-default"
          aria-label="Next page"
        >
          <Icons.ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
