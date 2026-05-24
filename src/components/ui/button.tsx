// src/components/ui/button.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
}

export function Button({ 
  className, 
  variant = "default", 
  size = "default", 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        {
          "bg-blue-600 text-white hover:bg-blue-700": variant === "default",
          "border border-gray-700 hover:bg-gray-900": variant === "outline",
          "hover:bg-gray-900 text-gray-400": variant === "ghost",
          "h-10 px-4 py-2": size === "default",
          "h-9 px-3 text-sm": size === "sm",
          "h-10 w-10": size === "icon",
        },
        className
      )}
      {...props}
    />
  );
}