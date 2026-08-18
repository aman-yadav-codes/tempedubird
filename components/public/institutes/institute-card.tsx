import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronRight, MapPin, ShieldCheck, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicInstitute } from "./institute-data";

import { buildInstituteUrl } from "@/lib/utils/seo-slug";

type InstituteCardProps = {
  institute: PublicInstitute;
  viewMode?: "grid" | "list";
};

export function InstituteCard({ institute, viewMode = "grid" }: InstituteCardProps) {
  const isList = viewMode === "list";
  const instUrl = buildInstituteUrl(institute.id, institute.name, institute.location);

  return (
    <Card className="group h-full gap-0 overflow-hidden rounded-lg border-border bg-card/90 py-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-[0_0_0_1px_rgba(239,68,68,0.25)]">
      <CardContent className={`h-full p-3 ${isList ? "grid gap-4 sm:grid-cols-[280px_1fr]" : "flex flex-col"}`}>
        <div className={`relative overflow-hidden rounded-md bg-muted ${isList ? "min-h-[190px]" : "h-[170px]"}`}>
          <Image
            src={institute.image}
            alt={`${institute.name} campus`}
            fill
            sizes={isList ? "(min-width: 768px) 260px, 100vw" : "(min-width: 1280px) 24vw, (min-width: 768px) 45vw, 100vw"}
            className="object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/45 to-transparent" />
          <div className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-br-lg border-b border-r border-primary/30 bg-background/90 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {institute.verified && (
            <Badge className="absolute right-2 top-2 h-6 max-w-[calc(100%-3.5rem)] bg-green-500 px-2 text-xs font-semibold text-white">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-1 pb-1 pt-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md text-xs">
              {institute.category}
            </Badge>
          </div>
          <h3 className="text-xl font-semibold leading-tight text-foreground transition group-hover:text-primary">
            <Link href={instUrl} className="hover:underline">
              {institute.name}
            </Link>
          </h3>
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {institute.location}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {institute.rating}
              <span className="text-muted-foreground">({institute.reviews})</span>
            </span>
            <span className="h-4 w-px bg-border" />
            <span>{institute.students} Students</span>
            <span className="h-4 w-px bg-border" />
            <span>{institute.courses} Courses</span>
          </div>

          <Link
            href={instUrl}
            className="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary/80 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            View Institute
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
