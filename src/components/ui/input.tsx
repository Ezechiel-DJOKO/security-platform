// src/components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm focus:border-blue-600 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}