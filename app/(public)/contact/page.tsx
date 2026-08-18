import Link from "next/link";
import { headers } from "next/headers";
import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone, Building2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { db } from "@/lib/db/db";
import { getCompanyPageBySlug } from "@/lib/queries/company";
import { getInstitutionBranches } from "@/lib/queries/institution-branches";
import { ContactLiveChat } from "@/components/public/contact-live-chat";
import { InstitutionBranch } from "@/lib/types/institution";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return {
    title: `Contact ${name}`,
    description: `Contact ${name} for course, admission, and support enquiries.`,
  };
}

export default async function ContactPage() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const companyPage = await getCompanyPageBySlug(db, "contact-us");

  let branches: InstitutionBranch[] = [];
  if (profile?.id) {
    try {
      branches = await getInstitutionBranches(db, profile.id);
    } catch (e) {
      console.error("Failed to fetch public institution branches:", e);
    }
  }

  const name = profile?.name ?? companyPage?.title ?? "EduBird";
  const meta = companyPage?.metadata || {};
  const companyBranches = Array.isArray(meta.branches) ? meta.branches : [];
  const displayBranches = branches.length > 0 ? branches : companyBranches;

  const email = profile?.email || meta.email || "support@edubird.com";
  const phone = profile?.phone || meta.phone || "+91 1234567890";
  const address = profile?.full_address || profile?.location_name || meta.address || "Orderly Bazar, Varanasi, Uttar Pradesh, India";
  const workingHours = meta.working_hours || "Monday - Saturday: 9:00 AM - 6:00 PM IST";
  const website = profile?.website;

  const contactItems = [
    {
      label: "Email Support",
      value: email,
      href: `mailto:${email}`,
      icon: Mail,
    },
    {
      label: "Phone",
      value: phone,
      href: `tel:${phone.replace(/\s+/g, "")}`,
      icon: Phone,
    },
    {
      label: "Working Hours",
      value: workingHours,
      href: null,
      icon: Clock,
    },
    {
      label: "Address",
      value: address,
      href: null,
      icon: MapPin,
    },
    ...(website
      ? [
          {
            label: "Website",
            value: website,
            href: website.startsWith("http") ? website : `https://${website}`,
            icon: ExternalLink,
          },
        ]
      : []),
  ];

  return (
    <div className="bg-background min-h-screen">
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Contact Us</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{name}</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {companyPage?.subtitle || "Reach out for course details, admission guidance, support requests, or general inquiries."}
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid: Live Support System + Contact Details & Quick Links */}
      <section className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left Column: Live Chat Widget + Branch Locations & Contact Info */}
        <div className="space-y-10">
          <ContactLiveChat />

          {/* Branch-wise Contact Details Section */}
          {displayBranches.length > 0 && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
                  <Building2 className="h-6 w-6 text-primary" />
                  Campus Locations & Branch Contacts
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect with our specific department desks, campus helplines, and regional branch offices.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {displayBranches.map((branch: any, bIdx: number) => {
                  const bName = branch.branch_name || branch.name || `Branch ${bIdx + 1}`;
                  const bPhones = branch.phones || [];
                  const bEmails = branch.emails || [];

                  return (
                    <div key={branch.id || bIdx} className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                          <h3 className="text-lg font-bold text-foreground">{bName}</h3>
                          {branch.is_primary && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 border border-amber-500/20">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Main Branch
                            </span>
                          )}
                        </div>

                        {branch.address && (
                          <div className="flex items-start gap-3 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="leading-relaxed">
                              {branch.address}
                              {branch.city ? `, ${branch.city}` : ""}
                              {branch.state ? `, ${branch.state}` : ""}
                              {branch.pincode ? ` - ${branch.pincode}` : ""}
                            </span>
                          </div>
                        )}

                        {branch.working_hours && (
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-primary shrink-0" />
                            <span>{branch.working_hours}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-2">
                        {bPhones.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone & WhatsApp Contacts</p>
                            <div className="space-y-1.5">
                              {bPhones.map((p: any, idx: number) => {
                                const rawNum = p.phone || p.number || "";
                                const isWhatsapp = p.type === "whatsapp" || p.title?.toLowerCase().includes("whatsapp");
                                const cleanDigits = rawNum.replace(/[^0-9]/g, "");

                                return (
                                  <div key={`phone-${idx}`} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-2.5 text-sm">
                                    <span className="text-muted-foreground font-medium flex items-center gap-2">
                                      {isWhatsapp ? (
                                        <span className="text-emerald-500 font-bold text-xs shrink-0">💬 WA</span>
                                      ) : (
                                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                                      )}
                                      {p.title || "Contact"}:
                                    </span>
                                    {isWhatsapp ? (
                                      <a
                                        href={`https://wa.me/${cleanDigits}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors font-mono"
                                      >
                                        {rawNum}
                                      </a>
                                    ) : (
                                      <a
                                        href={`tel:${rawNum.replace(/\s+/g, "")}`}
                                        className="font-semibold text-foreground hover:text-primary transition-colors font-mono"
                                      >
                                        {rawNum}
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {bEmails.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Desks</p>
                            <div className="space-y-1.5">
                              {bEmails.map((e: any, idx: number) => (
                                <div key={`email-${idx}`} className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-2.5 text-sm">
                                  <span className="text-muted-foreground font-medium flex items-center gap-2 truncate mr-2">
                                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                                    {e.title || "Email"}:
                                  </span>
                                  <a href={`mailto:${e.email}`} className="font-semibold text-foreground hover:text-primary transition-colors truncate font-mono">
                                    {e.email}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* General Overview Contact Cards */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">General Support & Inquiries</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {contactItems.map((item) => (
                <div key={item.label} className="rounded-lg border border-border bg-card p-5 shadow-xs">
                  <item.icon className="mb-4 h-6 w-6 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  {item.href ? (
                    <Link href={item.href} className="mt-2 block break-words font-semibold text-foreground hover:text-primary transition-colors">
                      {item.value}
                    </Link>
                  ) : (
                    <p className="mt-2 break-words font-semibold text-foreground">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {companyPage?.content && (
            <div
              className="prose prose-slate dark:prose-invert max-w-none rounded-xl border border-border bg-card p-6 shadow-xs"
              dangerouslySetInnerHTML={{ __html: companyPage.content }}
            />
          )}
        </div>

        {/* Right Column: Quick Info Card */}
        <aside className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
            <MessageCircle className="mb-4 h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Need quick help?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Explore our available courses and programs first, or check out our Frequently Asked Questions.
            </p>
            <div className="mt-6 space-y-3">
              <Button className="w-full" asChild>
                <Link href="/courses">Browse Courses</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/faqs">View FAQs</Link>
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
