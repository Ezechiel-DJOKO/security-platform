// src/components/common/StatusBadge.tsx
import { ReactNode } from "react";

interface StatusBadgeProps {
  status: string;
  variant?: "severity" | "compliance" | "default";
}

// src/components/common/StatusBadge.tsx
export function StatusBadge({ status, variant = "default" }: { 
  status: string; 
  variant?: "severity" | "compliance" | "default" 
}) {
  const getStyles = () => {
    if (variant === "severity") {
      if (status === "Critique") return "bg-red-500/20 text-red-400 border border-red-500/30";
      if (status === "Haute") return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
    }
    if (variant === "compliance") {
      if (status === "Compliant") return "bg-green-500/20 text-green-400";
      if (status === "Partial") return "bg-orange-500/20 text-orange-400";
      return "bg-blue-500/20 text-blue-400";
    }
    return "bg-gray-500/20 text-gray-400";
  };

  return (
    <span className={`inline-block px-4 py-1.5 rounded-2xl text-sm font-semibold ${getStyles()}`}>
      {status}
    </span>
  );
}