"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  count?: number | string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
    className?: string;
  };
  backLink?: {
    href: string;
    label: string;
  };
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  count,
  badge,
  backLink,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5",
        className
      )}
    >
      <div className="space-y-1">
        {backLink && (
          <Link
            href={backLink.href}
            className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline transition-all mb-1 w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span>{backLink.label}</span>
          </Link>
        )}

        <div className="flex items-center gap-2.5 flex-wrap">
          {Icon && (
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <span>{title}</span>
            {count !== undefined && (
              <span className="text-muted-foreground font-bold text-xl md:text-2xl">
                ({count})
              </span>
            )}
          </h1>
          {badge && (
            <Badge
              variant={badge.variant || "secondary"}
              className={cn(
                "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5",
                badge.className
              )}
            >
              {badge.text}
            </Badge>
          )}
        </div>

        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  icon: Icon,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
        <span>{title}</span>
      </div>
      {action && <div className="normal-case tracking-normal">{action}</div>}
    </div>
  );
}

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  isActive?: boolean;
  children: React.ReactNode;
}

export function ContentCard({
  isActive,
  children,
  className,
  ...props
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5 md:p-6 bg-card border transition-all duration-200",
        isActive
          ? "border-2 border-primary ring-4 ring-primary/10 shadow-md"
          : "border-border/80 shadow-xs hover:border-border hover:shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 animate-in fade-in-50 duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}
