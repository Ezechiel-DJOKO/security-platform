// src/components/layout/Header.tsx
"use client";

import { Bell, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-16 border-b border-gray-800 bg-gray-950 px-6 flex items-center justify-between">
      // Dans Header.tsx, remplace la partie recherche :
        <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <Input
            type="text"
            placeholder="Rechercher..."
            className="pl-10 bg-gray-900 border-gray-700 w-full"
            />
        </div>
        </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] flex items-center justify-center rounded-full">
            3
          </span>
        </Button>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">Tanguy ADJOVI</p>
            <p className="text-xs text-gray-500">Administrateur</p>
          </div>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}