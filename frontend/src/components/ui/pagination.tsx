"use client"

import * as React from "react"
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  perPageOptions?: number[];
  loading?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 25, 50, 100],
  loading = false,
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endIndex = Math.min(currentPage * perPage, totalItems);

  return (
    <div className={cn("flex items-center justify-between gap-4 py-4", className)}>
      {/* Rows per page selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 h-10 px-4 rounded-xl border border-input bg-background text-sm font-bold text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary outline-none transition-all"
          >
            <span>{perPage} per page</span>
            <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44 p-1.5 border border-border rounded-2xl shadow-xl bg-popover text-popover-foreground z-[100]">
          {perPageOptions.map((option) => {
            const isSelected = perPage === option;
            return (
              <DropdownMenuItem
                key={option}
                onClick={() => {
                  onPerPageChange(option);
                  onPageChange(1); // Reset to page 1 on per-page changes
                }}
                className={cn(
                  "flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl cursor-pointer transition-all outline-none my-0.5",
                  isSelected
                    ? "bg-primary/10 text-primary font-bold dark:bg-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                )}
              >
                {/* Custom Checkbox */}
                <div
                  className={cn(
                    "flex items-center justify-center w-4 h-4 rounded border transition-all mr-2.5",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input bg-transparent"
                  )}
                >
                  {isSelected && (
                    <svg
                      className="w-2.5 h-2.5 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      />
                    </svg>
                  )}
                </div>
                <span>{option} per page</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Range Display & Navigation Controls */}
      <div className="flex items-center h-10 border border-input rounded-xl bg-background overflow-hidden">
        {/* Page Range Text */}
        <span className="px-4 text-sm font-bold text-muted-foreground whitespace-nowrap select-none">
          {startIndex}-{endIndex} of {totalItems}
        </span>
        
        {/* Divider */}
        <div className="w-px h-full bg-input" />

        {/* Prev Page Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="flex items-center justify-center w-10 h-full text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition-all outline-none"
          title="Previous Page"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-full bg-input" />

        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="flex items-center justify-center w-10 h-full text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent transition-all outline-none"
          title="Next Page"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
