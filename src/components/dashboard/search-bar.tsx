"use client";
import { useDebounce } from "@/hooks/useDebounce";
import { Icons } from "@/utils/icons";
import useSetParamsForPagination from "@/utils/setParamsForPagination";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  placeholder = "Search...",
  className = "",
}: SearchBarProps) {
  const searchParams = useSearchParams();
  const setParams = useSetParamsForPagination();
  const urlSearch = searchParams.get("search") || "";

  const [value, setValue] = useState(urlSearch);
  const debouncedValue = useDebounce(value, 350);
  const isFirstRender = useRef(true);
  const prevUrlSearchRef = useRef(urlSearch);

  // Sync input when URL search param is cleared or changed externally (e.g. Clear button or tab switch)
  useEffect(() => {
    if (prevUrlSearchRef.current !== urlSearch) {
      prevUrlSearchRef.current = urlSearch;
      setValue(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debouncedValue !== urlSearch) {
      prevUrlSearchRef.current = debouncedValue;
      setParams({ search: debouncedValue || null, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  return (
    <div className={`relative ${className}`}>
      <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 h-9 rounded border border-input bg-card text-sm text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-colors"
      />
    </div>
  );
}
