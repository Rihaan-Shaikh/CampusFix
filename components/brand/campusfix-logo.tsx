"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CampusFixLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CampusFixLogo({
  className,
  iconOnly = false,
  size = "md",
}: CampusFixLogoProps) {
  const iconDimensions = {
    sm: "h-6 w-6",
    md: "h-7 w-7",
    lg: "h-9 w-9",
  }[size];

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* Official CampusFix Badge Mark (Deep Navy + Orange Accent + Clean Geometry) */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg bg-[#0E1728] text-white shadow-xs border border-[#243145]/60 overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-105",
          iconDimensions
        )}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          aria-hidden="true"
        >
          {/* Subtle background grid accent */}
          <circle cx="16" cy="16" r="13" stroke="#243145" strokeWidth="1" strokeDasharray="2 2" />
          
          {/* Stylized Operations Wrench in White */}
          <path
            d="M21.5 10.5a4.2 4.2 0 0 0-5.4-.4l-3 3 2.2 2.2 3-3a4.2 4.2 0 0 0 3.2-1.8zM14.5 16l-4.2 4.2a1.4 1.4 0 0 0 2 2l4.2-4.2-2-2z"
            fill="#FFFFFF"
          />
          
          {/* Glowing Brand Orange Node / Spark */}
          <circle cx="21" cy="11" r="2.2" fill="#F59E0B" />
          <circle cx="21" cy="11" r="3.2" stroke="#F59E0B" strokeWidth="0.8" strokeOpacity="0.5" />
        </svg>
      </div>

      {/* Wordmark */}
      {!iconOnly && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-0.5">
            <span className={cn("font-bold tracking-tight text-foreground", textSizes)}>
              Campus<span className="text-[#F59E0B]">Fix</span>
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-medium mt-0.5">
            Facilities Ops
          </span>
        </div>
      )}
    </div>
  );
}
