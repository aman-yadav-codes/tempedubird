"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MapPin,
  Globe,
  Bell,
  ChevronDown,
  BookOpen,
  Building2,
  CheckSquare,
  BookMarked,
  UserCheck,
  ShoppingCart,
  Award,
  FileStack,
  Library,
  FileText,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Settings,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { clearBrowserSessionData } from "@/lib/auth/clear-browser-session";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import type { PublicInstitutionNavItem, PublicNavbarBrand } from "@/lib/api/public-nav";

type PublicNavbarProps = {
  brand?: PublicNavbarBrand;
  showInstitutesLink?: boolean;
  institutionNavItems?: PublicInstitutionNavItem[];
};

const CATEGORY_ITEMS = [
  { label: "Course", href: "/courses", icon: BookOpen },
  { label: "Institute", href: "/institutes", icon: Building2 },
  { label: "Practice", href: "/practice", icon: CheckSquare },
  { label: "Notes", href: "/notes", icon: BookMarked },
  { label: "Teachers", href: "/teachers", icon: UserCheck },
  { label: "Exams", href: "/exams", icon: Award },
  { label: "Library", href: "/libraries", icon: Library },
  { label: "Hostel", href: "/hostels", icon: Building2 },
  { label: "Blogs", href: "/blogs", icon: FileText },
];

const LOCATIONS = ["All Locations", "Varanasi", "New Delhi", "Mumbai", "Bangalore", "Kolkata", "Online"];
const LANGUAGES = ["English", "Hindi", "Bengali", "Gujarati", "Marathi"];

function getInitials(name?: string | null) {
  if (!name || !name.trim()) return "EA";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export function PublicNavbar({
  brand = {
    name: "EduBird",
    logoUrl: "/icons/edubird.webp",
    isInstitution: false,
  },
}: PublicNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [activeTab, setActiveTab] = useState("Notes");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<"signin" | "signup">("signin");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const displayName = user?.full_name || "";
  const displaySubtext = user?.is_super_admin
    ? "Platform Admin"
    : user?.memberships?.[0]?.institution_name || user?.primary_role || "Member";
  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-2xs border-b border-gray-100">
      {/* Top Header Bar */}
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <Image
              src="/icons/edubird.webp"
              alt="EduBird logo"
              fill
              sizes="36px"
              priority
              className="object-contain"
            />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight font-sans">
            EduBird
          </span>
        </Link>

        {/* Center: Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-xl mx-2 lg:mx-6 relative hidden md:flex items-center"
        >
          <Search className="absolute left-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search practice topics, exams, or colleges..."
            className="w-full bg-[#F3F4F6] text-gray-800 text-sm font-normal py-2.5 pl-10 pr-4 rounded-xl border border-transparent focus:bg-white focus:border-rose-300 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all placeholder:text-gray-400"
          />
        </form>

        {/* Right Actions & Dropdowns */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* + Add Listings Direct Button */}
          <Link
            href="/packages"
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 bg-white text-[#A81C1C] hover:bg-rose-50/50 shadow-2xs transition-colors outline-none cursor-pointer"
          >
            <Plus className="h-4 w-4 text-[#A81C1C] stroke-[2.5]" />
            <span>Add Listings</span>
          </Link>

          {/* Location Dropdown - Icon Only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 shadow-2xs transition-colors outline-none cursor-pointer"
                title={selectedLocation}
                aria-label="Select Location"
              >
                <MapPin className="h-4 w-4 text-gray-700" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select Location
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LOCATIONS.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={cn("cursor-pointer", selectedLocation === loc && "font-semibold text-rose-700")}
                >
                  {loc}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language Dropdown - Icon Only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 shadow-2xs transition-colors outline-none cursor-pointer"
                title={selectedLanguage}
                aria-label="Select Language"
              >
                <Globe className="h-4 w-4 text-gray-700" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Language
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={cn("cursor-pointer", selectedLanguage === lang && "font-semibold text-rose-700")}
                >
                  {lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logged In User Profile Pill & Notifications vs Sign In Button */}
          {isAuthenticated && user ? (
            <>
              {/* Notification Bell - Only appears after login/registration */}
              <button
                type="button"
                className="relative p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-700" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#800000] px-1 text-[10px] font-bold text-white shadow-2xs">
                  6
                </span>
              </button>

              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-50 transition-colors outline-none cursor-pointer"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#800000] text-xs font-bold text-white shadow-2xs overflow-hidden">
                    {initials}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="text-xs font-bold text-gray-900 truncate max-w-[110px]">
                      {displayName}
                    </span>
                    <span className="text-[10px] font-medium text-gray-500 truncate max-w-[110px]">
                      {displaySubtext}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-2 space-y-1">
                {/* Header User Details */}
                <div className="flex items-center gap-3 p-2 pb-3 border-b border-gray-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#800000] text-sm font-bold text-white shadow-2xs">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{displaySubtext}</p>
                  </div>
                </div>

                {/* Dropdown Items from Screenshot 1 */}
                <DropdownMenuItem asChild className="cursor-pointer py-2.5 px-3 rounded-lg">
                  <Link href="/admin/dashboard" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="h-4 w-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">Dashboard</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Overview & stats</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer py-2.5 px-3 rounded-lg">
                  <Link href="/admin/profile" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <User className="h-4 w-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">Profile</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Manage your profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer py-2.5 px-3 rounded-lg">
                  <Link href="/admin/company" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">My Preferences</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Account settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer py-2.5 px-3 rounded-lg">
                  <Link href="/admin/notifications" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <Bell className="h-4 w-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">Notifications</span>
                    </div>
                    <span className="text-[10px] text-gray-400">View all notifications</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer py-2.5 px-3 rounded-lg">
                  <Link href="/faqs" className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="h-4 w-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">Help & Support</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Get help & support</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/logout", { method: "POST" });
                    } finally {
                      clearAuth();
                      clearBrowserSessionData();
                      toast.success("You have been signed out.");
                      window.location.href = "/";
                    }
                  }}
                  className="cursor-pointer py-2.5 px-3 rounded-lg text-rose-600 focus:text-rose-600 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="h-4 w-4 text-rose-600" />
                    <span className="text-xs font-bold text-rose-600">Logout</span>
                  </div>
                  <span className="text-[10px] text-rose-400">Sign out from account</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthDialogTab("signin");
                setAuthDialogOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#800000] text-white hover:bg-[#600000] shadow-2xs transition-colors cursor-pointer"
            >
              <User className="h-4 w-4" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="flex md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Expand */}
      <div className="px-4 pb-2 md:hidden">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search practice topics, exams, or colleges..."
            className="w-full bg-[#F3F4F6] text-gray-800 text-xs py-2 pl-9 pr-3 rounded-lg outline-none"
          />
        </form>
      </div>

      {/* Row 2: Category Navigation Menu Bar */}
      <div className="bg-[#FFF5F5]/90 border-t border-b border-rose-100/70 shadow-2xs">
        <div className="container mx-auto px-4 flex items-center justify-start md:justify-center gap-1 sm:gap-2 md:gap-4 overflow-x-auto py-2.5 no-scrollbar text-xs font-medium">
          {CATEGORY_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.label || pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setActiveTab(item.label)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-[#FEE2E2] text-[#991B1B] font-bold shadow-2xs border border-rose-200/60"
                    : "text-[#800000] hover:text-[#991B1B] hover:bg-rose-100/50"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[#991B1B]" : "text-[#800000]")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Auth Modal Dialog for Sign In & Sign Up */}
      <AuthModalDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDialogTab}
      />
    </header>
  );
}
