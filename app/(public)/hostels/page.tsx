"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, CheckCircle2, ShieldCheck, Wifi, Utensils, Zap, Loader2, Search, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";

type HostelItem = {
  id: number;
  institution_id: number;
  name: string;
  type: string;
  capacity: number;
  available_beds: number;
  annual_fee: number;
  room_types: string;
  mess_facility: boolean;
  ac_available: boolean;
  wifi_available: boolean;
  security_deposit: number;
  description: string;
  rules: string;
  institution_name: string;
  institution_city: string;
};

export default function HostelsPublicPage() {
  const [hostels, setHostels] = useState<HostelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchHostels = async () => {
    try {
      const res = await fetch("/api/public/hostels");
      if (res.ok) {
        const json = await res.json();
        setHostels(json.hostels || []);
      }
    } catch (err) {
      console.error("Error loading hostels:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = hostels.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.institution_name && h.institution_name.toLowerCase().includes(search.toLowerCase())) ||
      (h.institution_city && h.institution_city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs items={[{ label: "Campus Hostels & Accommodation" }]} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-1">Campus Accommodation</Badge>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">On-Campus Hostels & Student Residence</h1>
            <p className="text-sm text-muted-foreground mt-1">Explore verified executive hostels, mess facilities, Wi-Fi amenities, and fee structures.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hostel or city..."
              className="pl-9 text-xs h-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading hostel facilities...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No campus hostels found matching your query.
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((h) => (
              <Card key={h.id} className="p-6 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {h.institution_name || "Apex Institute of Engineering & Technology"}
                      </span>
                      <h3 className="text-xl font-bold text-foreground leading-tight">{h.name}</h3>
                      {h.institution_city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5 text-primary" /> {h.institution_city}
                        </p>
                      )}
                    </div>

                    <Badge className={h.type === "Boys" ? "bg-blue-600" : "bg-purple-600"}>
                      {h.type} Hostel
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{h.description}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {h.ac_available && (
                      <Badge variant="outline" className="text-[11px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold">
                        <Zap className="h-3 w-3" /> AC Rooms
                      </Badge>
                    )}
                    {h.wifi_available && (
                      <Badge variant="outline" className="text-[11px] gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                        <Wifi className="h-3 w-3" /> 1Gbps Wi-Fi
                      </Badge>
                    )}
                    {h.mess_facility && (
                      <Badge variant="outline" className="text-[11px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                        <Utensils className="h-3 w-3" /> 4-Meal Mess
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[11px]">
                      {h.available_beds || 120} Beds Vacant
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground block">Annual Fee</span>
                    <span className="text-lg font-extrabold text-foreground">₹{Number(h.annual_fee || 90000).toLocaleString("en-IN")}</span>
                    <span className="text-xs text-muted-foreground"> / year</span>
                  </div>

                  <Link href={`/institutes/${h.institution_id || 155}`}>
                    <Button size="sm" className="font-bold text-xs gap-1.5 shadow-xs">
                      View Campus & Book
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
