// src/components/dashboard/KPICard.tsx
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number; // pourcentage d'évolution
  color?: "blue" | "red" | "green" | "yellow";
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: KPICardProps) {
  const colorClasses = {
    blue: "text-blue-400",
    red: "text-red-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-4xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gray-900 ${colorClasses[color]}`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-4 text-sm">
          <span className={trend >= 0 ? "text-green-400" : "text-red-400"}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
          <span className="text-gray-500 ml-2">ce mois</span>
        </div>
      )}
    </div>
  );
}