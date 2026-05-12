"use client";

import { useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileNav } from "./MobileNav";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 bg-white/95 backdrop-blur-sm px-4 md:px-5 shadow-[0_1px_0_0_#e5e5e5]">
      <Sheet>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden h-8 w-8 cursor-pointer text-foreground/60 hover:text-foreground hover:bg-[#f5f5f5]" />}
        >
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-52 p-0">
          <MobileNav />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#737373]" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-[13px] bg-[#f5f5f5] border-transparent rounded-md placeholder:text-[#a3a3a3] focus:bg-white focus:border-[#e5e5e5] focus:ring-0 transition-colors"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative cursor-pointer text-[#737373] hover:text-foreground hover:bg-[#f5f5f5]"
      >
        <Bell className="h-4 w-4" />
      </Button>
    </header>
  );
}
