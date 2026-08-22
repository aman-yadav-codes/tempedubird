"use client";

import { useEffect, useState } from "react";
import { Building2, Globe2, ShieldCheck, Sparkles, ArrowRight, School, ChevronDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type LandingViewType = "platform" | "institution";

export type InstitutionOption = {
  id: number;
  name: string;
  slug?: string;
  type_name?: string;
};

interface LandingViewSwitcherProps {
  activeView: LandingViewType;
  onViewChange: (view: LandingViewType, institutionId?: number | null) => void;
  selectedInstitutionId?: number | null;
  selectedInstitutionName?: string;
}

export function LandingViewSwitcher({
  activeView,
  onViewChange,
  selectedInstitutionId,
  selectedInstitutionName,
}: LandingViewSwitcherProps) {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchInstitutions() {
      setLoadingInstitutions(true);
      try {
        const res = await fetch("/api/institutions?limit=50");
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json?.data) ? json.data : Array.isArray(json?.institutions) ? json.institutions : [];
          if (!ignore && items.length > 0) {
            setInstitutions(
              items.map((it: any) => ({
                id: it.id,
                name: it.name || it.slug || `Institution #${it.id}`,
                slug: it.slug,
                type_name: it.type_name || it.institution_type,
              }))
            );
          }
        }
      } catch {
        // silently fallback
      } finally {
        if (!ignore) setLoadingInstitutions(false);
      }
    }
    fetchInstitutions();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSelectInstitution = (instId: number) => {
    onViewChange("institution", instId);
  };

  const handleSelectPlatform = () => {
    onViewChange("platform", null);
  };

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-zinc-900 to-stone-900 text-white border-b border-white/10 sticky top-[65px] z-40 shadow-xl backdrop-blur-md">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left Title / Indicator */}
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold tracking-wide uppercase text-[11px] text-slate-400">
              Select Portal Edition:
            </span>
          </div>

          {/* Center / Right Dual Segmented Switcher */}
          <div className="flex items-center bg-black/60 p-1 rounded-2xl border border-white/15 shadow-inner w-full sm:w-auto max-w-xl">
            {/* Platform Admin Option */}
            <button
              type="button"
              id="switch-to-platform-view"
              onClick={handleSelectPlatform}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer select-none",
                activeView === "platform"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-white/30 scale-[1.02]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Globe2 className={cn("h-4 w-4 shrink-0 transition-transform", activeView === "platform" ? "scale-110 text-white" : "text-rose-400")} />
              <div className="flex flex-col items-start text-left leading-tight">
                <span className="font-extrabold flex items-center gap-1.5">
                  Platform Admin
                  {activeView === "platform" && (
                    <span className="hidden md:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white/20 uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </span>
                <span className="text-[10px] opacity-80 font-medium hidden md:inline">
                  Marketplace & Pan-India Hub
                </span>
              </div>
            </button>

            {/* Institutional Admin Option / Dropdown */}
            {institutions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    id="switch-to-institution-view"
                    className={cn(
                      "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer select-none",
                      activeView === "institution"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/30 scale-[1.02]"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <School className={cn("h-4 w-4 shrink-0 transition-transform", activeView === "institution" ? "scale-110 text-white" : "text-blue-400")} />
                    <div className="flex flex-col items-start text-left leading-tight min-w-0 max-w-[150px] sm:max-w-[180px]">
                      <span className="font-extrabold flex items-center gap-1 truncate">
                        {activeView === "institution" && selectedInstitutionName ? selectedInstitutionName : "Institute Admin"}
                        <ChevronDown className="h-3 w-3 opacity-70 shrink-0" />
                      </span>
                      <span className="text-[10px] opacity-80 font-medium hidden md:inline truncate">
                        {activeView === "institution" ? "Selected Campus ERP" : "Campus ERP & Management"}
                      </span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto bg-slate-900 border-white/10 text-white shadow-2xl">
                  <DropdownMenuLabel className="text-xs text-slate-400 font-bold">
                    Select Institution Campus
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {institutions.map((inst) => {
                    const isSelected = activeView === "institution" && selectedInstitutionId === inst.id;
                    return (
                      <DropdownMenuItem
                        key={inst.id}
                        onClick={() => handleSelectInstitution(inst.id)}
                        className={cn(
                          "flex items-center justify-between text-xs py-2 px-3 rounded-lg cursor-pointer hover:bg-white/10 transition-colors",
                          isSelected ? "bg-blue-600 text-white font-bold" : "text-slate-200"
                        )}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate">{inst.name}</span>
                          {inst.type_name && (
                            <span className="text-[10px] text-slate-400 opacity-80">{inst.type_name}</span>
                          )}
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-white" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                type="button"
                id="switch-to-institution-view"
                onClick={() => onViewChange("institution", selectedInstitutionId || 1)}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer select-none",
                  activeView === "institution"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/30 scale-[1.02]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <School className={cn("h-4 w-4 shrink-0 transition-transform", activeView === "institution" ? "scale-110 text-white" : "text-blue-400")} />
                <div className="flex flex-col items-start text-left leading-tight">
                  <span className="font-extrabold flex items-center gap-1.5">
                    Institute Admin
                    {activeView === "institution" && (
                      <span className="hidden md:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white/20 uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] opacity-80 font-medium hidden md:inline">
                    Campus ERP & Management
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Quick Info Tagline */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300">
            {activeView === "platform" ? (
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-300 font-semibold gap-1">
                <Sparkles className="h-3 w-3 text-rose-400" />
                <span>Browsing: Marketplace & Platform Network</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold gap-1">
                <Building2 className="h-3 w-3 text-blue-400" />
                <span>Browsing: {selectedInstitutionName || "Institutional Campus ERP Edition"}</span>
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

