import Link from "next/link";
import { MapPin, ChevronDown, Menu } from "lucide-react";

export function Navbar() {
  const links = ["Home", "Property", "Cars", "Businesses", "Food", "Travel", "Events", "More"];

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-[#0B0F19]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-white tracking-tight">
          FindMy<span className="text-yellow-500"><MapPin className="inline w-6 h-6 mb-1"/></span>
        </span>
        <span className="text-[10px] text-zinc-400 block -mt-1 ml-1 tracking-wider uppercase">
          Everything. Anywhere.
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-6">
        {links.map((link, idx) => (
          <Link
            key={link}
            href="#"
            className={`text-sm font-medium transition-colors ${
              link === "Home" ? "text-yellow-500 border-b-2 border-yellow-500 pb-1" : "text-zinc-300 hover:text-white"
            }`}
          >
            {link}
            {link === "More" && <ChevronDown className="inline w-4 h-4 ml-1 opacity-70" />}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-500 border border-yellow-500/50 rounded-full hover:bg-yellow-500/10 transition-colors">
          List Your Business
        </button>
        <button className="hidden sm:flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
          Login / Sign Up
        </button>
        <button className="lg:hidden text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}
