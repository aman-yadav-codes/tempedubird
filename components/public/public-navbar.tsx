"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  School,
  Info,
  Target,
  Users2,
  Sparkles,
  MoreHorizontal,
  Image as ImageIcon,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
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
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import type { PublicInstitutionNavItem, PublicNavbarBrand } from "@/lib/api/public-nav";

import { useCategoryAvailability, type CategoryKey } from "@/hooks/use-category-availability";

type PublicNavbarProps = {
  brand?: PublicNavbarBrand;
  showInstitutesLink?: boolean;
  institutionNavItems?: PublicInstitutionNavItem[];
};

const CATEGORY_ITEMS: { key: CategoryKey; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "courses", label: "Course", href: "/courses", icon: BookOpen },
  { key: "institutes", label: "Institute", href: "/institutes", icon: Building2 },
  { key: "practice", label: "Practice", href: "/practice", icon: CheckSquare },
  { key: "notes", label: "Notes", href: "/notes", icon: BookMarked },
  { key: "teachers", label: "Teachers", href: "/teachers", icon: UserCheck },
  { key: "exams", label: "Exams", href: "/exams", icon: Award },
  { key: "libraries", label: "Library", href: "/libraries", icon: Library },
  { key: "hostels", label: "Hostel", href: "/hostels", icon: Building2 },
  { key: "blogs", label: "Blogs", href: "/blogs", icon: FileText },
  { key: "gallery", label: "Gallery", href: "/gallery", icon: ImageIcon },
  { key: "contact", label: "Contact", href: "/contact", icon: PhoneCall },
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
  const searchParams = useSearchParams();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { activeInstitution, activeInstitutionId } = useActiveInstitution();
  const { isCategoryVisible, isInstitutionalAdmin, activeInstitutionName } = useCategoryAvailability();

  const [landingViewMode, setLandingViewMode] = useState<"platform" | "institution">("platform");
  const [institutionInfo, setInstitutionInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const defaultEnvInstId = process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID
    ? Number(process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID)
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch institution info dynamically for logged in institution admin
  useEffect(() => {
    const instId = activeInstitutionId || user?.memberships?.[0]?.institution_id || defaultEnvInstId;
    if (instId) {
      fetch(`/api/public/institution/info?institutionId=${instId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setInstitutionInfo(json.data);
          }
        })
        .catch(() => undefined);
    } else {
      setInstitutionInfo(null);
    }
  }, [activeInstitutionId, user, defaultEnvInstId]);

  const activeUrlParam = searchParams?.get("view") || searchParams?.get("mode") || searchParams?.get("portal");
  const activeInstParamId = searchParams?.get("institution_id") || searchParams?.get("institute_id") || searchParams?.get("inst_id") || searchParams?.get("institution");
  const effectiveNavInstId = activeInstParamId ? Number(activeInstParamId) : defaultEnvInstId;

  // SSR & initial client render must strictly align with brand.isInstitution to prevent hydration mismatch
  const isInstitutionView = mounted
    ? (activeUrlParam !== "platform" && Boolean(effectiveNavInstId))
    : Boolean(brand?.isInstitution);

  const institutionDisplayName =
    institutionInfo?.name ||
    (brand?.isInstitution ? brand.name : "Institution");

  // Platform marketplace: strictly the 9 Marketplace modules (without Gallery or Contact)
  const PLATFORM_MARKETPLACE_KEYS: CategoryKey[] = [
    "courses",
    "institutes",
    "practice",
    "notes",
    "teachers",
    "exams",
    "libraries",
    "hostels",
    "blogs",
  ];
  const platformCategoryItems = CATEGORY_ITEMS.filter((item) =>
    PLATFORM_MARKETPLACE_KEYS.includes(item.key)
  );

  // Institution edition menu: WITHOUT the "Institute" tab, but WITH dynamic record checking!
  const institutionCategoryItems = CATEGORY_ITEMS.filter(
    (item) =>
      item.key !== "institutes" &&
      item.key !== "contact" &&
      (!mounted || isCategoryVisible(item.key))
  );
  const effectiveInstitutionItems = institutionCategoryItems;

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
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Brand Logo & Name (Dynamically switches to Institution Brand for Institution Admin) */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          {isInstitutionView ? (
            <>
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#800000] to-rose-900 text-white font-black text-sm shadow-sm overflow-hidden border border-rose-200/50">
                {institutionInfo?.logo_url ? (
                  <Image
                    src={institutionInfo.logo_url}
                    alt={institutionDisplayName}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <School className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[190px] md:max-w-[230px] leading-tight">
                <span className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight truncate group-hover:text-rose-700 transition-colors">
                  {institutionDisplayName}
                </span>
                <span className="text-[9px] font-semibold text-rose-700 uppercase tracking-wider truncate">
                  Campus Portal
                </span>
              </div>
            </>
          ) : (
            <>
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
              <span className="text-xl font-bold text-gray-900 tracking-tight font-sans group-hover:text-rose-700 transition-colors">
                EduBird
              </span>
            </>
          )}
        </Link>

        {/* Center: Category Navigation Menu in Top Header (About Us FIRST before Courses, and only categories with added records) */}
        {isInstitutionView ? (
          <div className="flex-1 flex items-center justify-start lg:justify-center mx-1 sm:mx-2 py-1">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
              {/* 1. About Us Dropdown FIRST (Mission, Vision & Goal, About Founder, About Institute) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold transition-all duration-200 cursor-pointer select-none outline-none",
                      pathname.startsWith("/about")
                        ? "bg-[#FEE2E2] text-[#991B1B] font-bold shadow-2xs border border-rose-200/60"
                        : "text-[#800000] hover:text-[#991B1B] hover:bg-rose-100/50"
                    )}
                  >
                    <Info className="h-3.5 w-3.5 shrink-0 text-[#800000]" />
                    <span>About Us</span>
                    <ChevronDown className="h-3 w-3 text-[#800000]/70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-1.5 space-y-1 bg-white border border-gray-200 shadow-xl rounded-xl">
                  <DropdownMenuItem asChild className="cursor-pointer py-2 px-3 rounded-lg hover:bg-rose-50">
                    <Link href="/about#mission-vision" className="flex items-center gap-2.5 w-full text-xs font-semibold text-gray-800 hover:text-rose-800">
                      <Target className="h-4 w-4 text-rose-600 shrink-0" />
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold">Mission, Vision & Goal</span>
                        <span className="text-[10px] text-gray-500 font-normal">Core principles & aims</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer py-2 px-3 rounded-lg hover:bg-rose-50">
                    <Link href="/about#founder" className="flex items-center gap-2.5 w-full text-xs font-semibold text-gray-800 hover:text-rose-800">
                      <User className="h-4 w-4 text-rose-600 shrink-0" />
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold">About Founder</span>
                        <span className="text-[10px] text-gray-500 font-normal">Leadership & founders</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer py-2 px-3 rounded-lg hover:bg-rose-50">
                    <Link href="/about#facilities" className="flex items-center gap-2.5 w-full text-xs font-semibold text-gray-800 hover:text-rose-800">
                      <Sparkles className="h-4 w-4 text-rose-600 shrink-0" />
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold">Facilities & Infrastructure</span>
                        <span className="text-[10px] text-gray-500 font-normal">Labs, sports & campus amenities</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer py-2 px-3 rounded-lg hover:bg-rose-50">
                    <Link href="/about#institute" className="flex items-center gap-2.5 w-full text-xs font-semibold text-gray-800 hover:text-rose-800">
                      <Building2 className="h-4 w-4 text-rose-600 shrink-0" />
                      <div className="flex flex-col leading-tight">
                        <span className="font-bold">About Institute</span>
                        <span className="text-[10px] text-gray-500 font-normal">Overview & heritage</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 2. Primary visible items (only categories where institution admin has added records) */}
              {effectiveInstitutionItems.slice(0, 4).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.label || pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setActiveTab(item.label)}
                    className={cn(
                      "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
                      isActive
                        ? "bg-[#FEE2E2] text-[#991B1B] font-bold shadow-2xs border border-rose-200/60"
                        : "text-[#800000] hover:text-[#991B1B] hover:bg-rose-100/50"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#991B1B]" : "text-[#800000]")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* 3. Overflow "More" dropdown for items beyond 4 (only categories with data) */}
              {effectiveInstitutionItems.length > 4 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold transition-all duration-200 cursor-pointer select-none outline-none",
                        effectiveInstitutionItems.slice(4).some((it) => activeTab === it.label || pathname === it.href)
                          ? "bg-[#FEE2E2] text-[#991B1B] font-bold shadow-2xs border border-rose-200/60"
                          : "text-[#800000] hover:text-[#991B1B] hover:bg-rose-100/50"
                      )}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-[#800000]" />
                      <span>More</span>
                      <ChevronDown className="h-3 w-3 text-[#800000]/70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 p-1.5 space-y-1 bg-white border border-gray-200 shadow-xl rounded-xl">
                    {effectiveInstitutionItems.slice(4).map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.label || pathname === item.href;
                      return (
                        <DropdownMenuItem key={item.label} asChild className="cursor-pointer py-2 px-3 rounded-lg hover:bg-rose-50">
                          <Link
                            href={item.href}
                            onClick={() => setActiveTab(item.label)}
                            className={cn(
                              "flex items-center gap-2.5 w-full text-xs font-semibold",
                              isActive ? "text-[#991B1B] font-bold bg-rose-50" : "text-gray-800 hover:text-rose-800"
                            )}
                          >
                            <Icon className="h-4 w-4 text-rose-600 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-start lg:justify-center mx-1 sm:mx-2 py-1">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
              {/* Primary visible items for platform admin (first 5) */}
              {platformCategoryItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.label || pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setActiveTab(item.label)}
                    className={cn(
                      "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
                      isActive
                        ? "bg-[#FEE2E2] text-[#991B1B] font-bold shadow-2xs border border-rose-200/60"
                        : "text-[#800000] hover:text-[#991B1B] hover:bg-rose-100/50"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#991B1B]" : "text-[#800000]")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Overflow "More" dropdown for items beyond the first 5 (Exams, Library, Hostel, Blogs) */}
              {platformCategoryItems.length > 5 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold transition-all duration-200 cursor-pointer select-none outline-none",
                        platformCategoryItems.slice(5).some((it) => activeTab === it.label || pathname === it.href)
                          ? "bg-[#FEE2E2] text-[#991B1B] font-bold shadow-2xs border border-rose-200/60"
                          : "text-[#800000] hover:text-[#991B1B] hover:bg-rose-100/50"
                      )}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-[#800000]" />
                      <span>More</span>
                      <ChevronDown className="h-3 w-3 text-[#800000]/70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 p-1.5 space-y-1 bg-white border border-gray-200 shadow-xl rounded-xl">
                    {platformCategoryItems.slice(5).map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.label || pathname === item.href;
                      return (
                        <DropdownMenuItem key={item.label} asChild className="cursor-pointer py-2 px-3 rounded-lg hover:bg-rose-50">
                          <Link
                            href={item.href}
                            onClick={() => setActiveTab(item.label)}
                            className={cn(
                              "flex items-center gap-2.5 w-full text-xs font-semibold",
                              isActive ? "text-[#991B1B] font-bold bg-rose-50" : "text-gray-800 hover:text-rose-800"
                            )}
                          >
                            <Icon className="h-4 w-4 text-rose-600 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}

        {/* Right Actions & Dropdowns */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* + Add Listings Direct Button (Only for Platform Admin View) */}
          {!isInstitutionView && (
            <Link
              href="/packages"
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 bg-white text-[#A81C1C] hover:bg-rose-50/50 shadow-2xs transition-colors outline-none cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#A81C1C] stroke-[2.5]" />
              <span>Add Listings</span>
            </Link>
          )}

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
                  className="flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-rose-200 transition-all outline-none cursor-pointer"
                  title={displayName || "User profile"}
                  aria-label="User profile"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#800000] text-xs font-bold text-white shadow-2xs overflow-hidden hover:opacity-90 transition-opacity">
                    {initials}
                  </div>
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
                  <Link href={toRoleRoutePath("/admin", user)} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="h-4 w-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">Dashboard</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Overview & stats</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer py-2.5 px-3 rounded-lg">
                  <Link href={toRoleRoutePath("/admin/account", user)} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <User className="h-4 w-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">Profile</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Manage your profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer py-2.5 px-3 rounded-lg">
                  <Link href={toRoleRoutePath("/admin/company", user)} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 text-gray-700" />
                      <span className="text-xs font-semibold text-gray-900">My Preferences</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Account settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer py-2.5 px-3 rounded-lg">
                  <Link href={toRoleRoutePath("/admin/notifications", user)} className="flex items-center justify-between w-full">
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

      {/* Auth Modal Dialog for Sign In & Sign Up */}
      <AuthModalDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDialogTab}
        institutionId={brand.isInstitution ? (activeInstitutionId || 1) : undefined}
      />
    </header>
  );
}
