"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { GraduationCap, School, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { cn } from "@/lib/utils";

type SocialLinksMap = {
  facebook?: string;
  twitter?: string;
  pinterest?: string;
  whatsapp?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
};

function formatSocialUrl(val?: string | null) {
  if (!val || !val.trim()) return "";
  const trimmed = val.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function formatWhatsappUrl(val?: string | null) {
  if (!val || !val.trim()) return "";
  const trimmed = val.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return `https://wa.me/${digitsOnly}`;
}

function FacebookIcon() {
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

function WhatsappIcon() {
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 0 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.262-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

export function PublicFooter() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { activeInstitution, activeInstitutionId } = useActiveInstitution();
  const [mounted, setMounted] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinksMap | null>(null);
  const [institutionInfo, setInstitutionInfo] = useState<any>(null);
  const [platformContact, setPlatformContact] = useState<{
    email?: string;
    phone?: string;
    address?: string;
  }>({});

  const defaultEnvInstId = process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID
    ? Number(process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID)
    : null;

  useEffect(() => {
    setMounted(true);

    fetch("/api/public/company/pages/social-links")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.metadata) {
          setSocialLinks(json.data.metadata);
        }
      })
      .catch(() => undefined);

    fetch("/api/public/company/pages/contact-us")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.metadata) {
          setPlatformContact({
            email: json.data.metadata.email,
            phone: json.data.metadata.phone,
            address: json.data.metadata.address,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  const isPlatformAdmin = Boolean(
    user?.is_super_admin || user?.role_codes?.includes("platform_admin")
  );

  const effectiveInstId = mounted
    ? activeInstitutionId || defaultEnvInstId
    : defaultEnvInstId;

  const isInstitutionalAdmin = Boolean(
    !isPlatformAdmin &&
      (user?.role_codes?.includes("institution_admin") ||
        user?.primary_role === "institution_admin" ||
        user?.memberships?.some((m) => m.role_code === "institution_admin") ||
        Boolean(effectiveInstId))
  );

  const isInstitutionView = Boolean(
    effectiveInstId && effectiveInstId > 0 && (
      (pathname === "/") ||
      isInstitutionalAdmin ||
      pathname.startsWith("/institution")
    )
  );

  useEffect(() => {
    if (effectiveInstId && isInstitutionView) {
      fetch(`/api/public/institution/info?institutionId=${effectiveInstId}`)
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
  }, [effectiveInstId, isInstitutionView]);


  const institutionDisplayName =
    institutionInfo?.name ||
    activeInstitution?.name ||
    user?.memberships?.[0]?.institution_name ||
    "Institution Campus";

  const institutionTagline =
    institutionInfo?.about ||
    "Verified educational institution offering comprehensive programs, dedicated faculty, and modern academic infrastructure.";

  const primaryBranch = institutionInfo?.branches?.[0];
  const institutionAddress = isInstitutionView
    ? institutionInfo?.location_name ||
      (primaryBranch?.address
        ? [primaryBranch.address, primaryBranch.city, primaryBranch.state].filter(Boolean).join(", ")
        : "Orderly Bazar, Varanasi, Uttar Pradesh, India")
    : platformContact.address || "Orderly Bazar, Varanasi, Uttar Pradesh, India";

  const resolveEmail = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null && "email" in val) return String((val as { email: unknown }).email || "");
    return "";
  };

  const resolvePhone = (val: unknown): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      if (obj.phone) return String(obj.phone);
      if (obj.number) return String(obj.number);
    }
    return "";
  };

  const institutionEmail = isInstitutionView
    ? resolveEmail(institutionInfo?.email) ||
      resolveEmail(primaryBranch?.emails?.[0]) ||
      "support@edubird.com"
    : platformContact.email || "support@edubird.com";

  const institutionPhone = isInstitutionView
    ? resolvePhone(institutionInfo?.phone) ||
      resolvePhone(primaryBranch?.phones?.[0]) ||
      "+91 1234567890"
    : platformContact.phone || "+91 1234567890";

  const activeSocials = useMemo(() => {
    if (!socialLinks) return [];
    const items = [
      { key: "facebook", label: "Facebook", url: formatSocialUrl(socialLinks.facebook), icon: FacebookIcon, color: "hover:text-[#1877F2] hover:border-[#1877F2]/40" },
      { key: "twitter", label: "X / Twitter", url: formatSocialUrl(socialLinks.twitter), icon: TwitterIcon, color: "hover:text-[#1DA1F2] hover:border-[#1DA1F2]/40" },
      { key: "pinterest", label: "Pinterest", url: formatSocialUrl(socialLinks.pinterest), icon: PinterestIcon, color: "hover:text-[#BD081C] hover:border-[#BD081C]/40" },
      { key: "whatsapp", label: "WhatsApp", url: formatWhatsappUrl(socialLinks.whatsapp), icon: WhatsappIcon, color: "hover:text-[#25D366] hover:border-[#25D366]/40" },
      { key: "instagram", label: "Instagram", url: formatSocialUrl(socialLinks.instagram), icon: InstagramIcon, color: "hover:text-[#E4405F] hover:border-[#E4405F]/40" },
      { key: "youtube", label: "YouTube", url: formatSocialUrl(socialLinks.youtube), icon: YoutubeIcon, color: "hover:text-[#FF0000] hover:border-[#FF0000]/40" },
      { key: "linkedin", label: "LinkedIn", url: formatSocialUrl(socialLinks.linkedin), icon: LinkedinIcon, color: "hover:text-[#0A66C2] hover:border-[#0A66C2]/40" },
    ];
    return items.filter((item) => Boolean(item.url));
  }, [socialLinks]);

  // Quick links: Institutes and duplicate About Us removed, replaced with Blogs
  const quickLinks = [
    { label: "All Courses", href: "/courses" },
    { label: "Products & Store", href: "/products" },
    { label: "Blogs", href: "/blogs" },
    { label: "Contact Us", href: "/contact" },
    { label: "FAQs", href: "/faqs" },
  ];

  const legalLinks = [
    { label: "About Us", href: "/about" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Copyright Policy", href: "/copyright" },
    { label: "Refund Policy", href: "/refund-policy" },
  ];

  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand Column */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              {isInstitutionView ? (
                <>
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#800000] text-white overflow-hidden shadow-xs">
                    {institutionInfo?.logo_url ? (
                      <Image
                        src={institutionInfo.logo_url}
                        alt={institutionDisplayName}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : (
                      <School className="h-4.5 w-4.5 text-white" />
                    )}
                  </div>
                  <span className="text-lg font-bold text-foreground truncate max-w-[200px]">
                    {institutionDisplayName}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <GraduationCap className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold text-foreground">EduBird</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {isInstitutionView ? institutionTagline : "Your trusted platform for finding verified courses from top educational institutes."}
            </p>

            {/* Social Media Links */}
            {activeSocials.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Follow Us</p>
                <div className="flex flex-wrap items-center gap-2">
                  {activeSocials.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.key}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={item.label}
                        aria-label={item.label}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all duration-200 hover:scale-110 shadow-xs",
                          item.color
                        )}
                      >
                        <Icon />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {quickLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">Company & Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {legalLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details Column (Dynamically fetched for Institution) */}
          <div>
            <h4 className="mb-4 font-semibold text-foreground">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="break-all">{institutionEmail}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <span>{institutionPhone}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{institutionAddress}</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {isInstitutionView ? institutionDisplayName : "EduBird"}. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground sm:justify-end">
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/copyright" className="hover:text-foreground transition-colors">
              Copyright Policy
            </Link>
            <Link href="/refund-policy" className="hover:text-foreground transition-colors">
              Refund Policy
            </Link>
            <Link href="/faqs" className="hover:text-foreground transition-colors">
              FAQs
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
