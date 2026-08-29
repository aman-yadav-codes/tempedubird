"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Sparkles,
  Search,
  Star,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Layers,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

export default function StudentRecommendedProductsPage() {
  const { accessToken, user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryCourse, setPrimaryCourse] = useState("");

  const loadRecommendedProducts = () => {
    setLoading(true);
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    fetch("/api/student/products/recommended?audience=student", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.recommended_products)) {
          setProducts(data.recommended_products);
          setPrimaryCourse(data.primary_course || "");
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecommendedProducts();
  }, [accessToken]);

  const handleOrder = (product: any) => {
    toast.success(`Inquiry initiated for "${product.title}". Our team will contact you for delivery details!`);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <Link href="/student/dashboard" className="text-xs font-bold text-primary flex items-center gap-1 mb-1 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="h-7 w-7 text-primary" />
            Recommended Study Products & Kits
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Personalized learning tools, lab kits, solved question banks, official uniform sets, and digital gadgets matched to your enrolled course ({primaryCourse || "Active Programs"}).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/student/search-history">
            <Button variant="outline" size="sm" className="font-bold text-xs gap-1.5 shadow-2xs">
              <Search className="h-4 w-4 text-primary" /> My Search History
            </Button>
          </Link>
        </div>
      </div>

      {/* REASON BANNER */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-foreground">
              Personalized Recommendations Engine Active
            </h3>
            <p className="text-xs text-muted-foreground">
              These items are curated specifically based on your course syllabus, exam timeline, and search queries.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/20 w-fit shrink-0">
          Tailored for {user?.full_name || "Student"}
        </Badge>
      </Card>

      {/* PRODUCTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((prod) => (
          <Card key={prod.id} className="overflow-hidden border-border bg-card shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between rounded-2xl">
            <div className="space-y-3">
              {/* Product Image & Badges */}
              <div className="relative h-48 w-full bg-muted overflow-hidden">
                <img
                  src={prod.image_url}
                  alt={prod.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px] font-extrabold bg-background/90 backdrop-blur-xs text-foreground shadow-2xs">
                    {prod.category}
                  </Badge>
                  {prod.badge_text && (
                    <Badge variant="outline" className="text-[10px] font-extrabold bg-primary text-primary-foreground border-transparent shadow-2xs">
                      {prod.badge_text}
                    </Badge>
                  )}
                </div>
                {prod.match_score && (
                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant="outline" className="text-[10px] font-extrabold bg-emerald-500 text-white border-transparent shadow-2xs flex items-center gap-1">
                      <Zap className="h-3 w-3 fill-current" /> {prod.match_score}% Match
                    </Badge>
                  </div>
                )}
              </div>

              {/* Recommendation Reason Pill */}
              <div className="px-4">
                <div className="p-2 rounded-xl bg-primary/5 border border-primary/15 text-[11px] font-bold text-primary flex items-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>{prod.recommendation_reason}</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="px-4 space-y-1.5">
                <h3 className="font-extrabold text-base text-foreground line-clamp-1">{prod.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{prod.description}</p>
              </div>

              {/* Features List */}
              {Array.isArray(prod.features) && prod.features.length > 0 && (
                <div className="px-4 space-y-1">
                  {prod.features.slice(0, 3).map((f: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Action */}
            <div className="p-4 border-t border-border mt-4 flex items-center justify-between gap-3 bg-muted/20">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-foreground">
                    ₹{Number(prod.sale_price || prod.price).toLocaleString("en-IN")}
                  </span>
                  {prod.sale_price && prod.sale_price < prod.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      ₹{Number(prod.price).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                  Free Student Delivery
                </span>
              </div>

              <Button
                size="sm"
                onClick={() => handleOrder(prod)}
                className="font-bold text-xs gap-1.5 shadow-2xs cursor-pointer rounded-xl"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> Order Now
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
