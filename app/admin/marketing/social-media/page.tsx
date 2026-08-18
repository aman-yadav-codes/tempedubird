"use client";

import { useState } from "react";
import { Share2, Plus, Calendar, Megaphone, CheckCircle, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function SocialMediaPage() {
  const [postText, setPostText] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Social Media Marketing Console
          </h1>
          <p className="text-sm text-muted-foreground">
            Schedule social media posts, launch campaigns, and track engagement across Facebook, Instagram, LinkedIn, and X.
          </p>
        </div>

        <Button className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>New Social Campaign</span>
        </Button>
      </div>

      {/* Social Accounts Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { platform: "Facebook Page", status: "Connected", followers: "14,250", handle: "@edubirdofficial" },
          { platform: "Instagram Business", status: "Connected", followers: "28,900", handle: "@edubird_edu" },
          { platform: "LinkedIn Page", status: "Connected", followers: "8,640", handle: "EduBird Platforms" },
          { platform: "X (Twitter)", status: "Active", followers: "5,120", handle: "@EduBirdApp" },
        ].map((acc, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">{acc.platform}</span>
              <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {acc.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{acc.handle}</p>
            <p className="text-lg font-extrabold text-foreground pt-1">{acc.followers} followers</p>
          </div>
        ))}
      </div>

      {/* Quick Post Publisher */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Multi-Platform Post Publisher
        </h3>

        <Textarea
          placeholder="Write your campaign announcement or social post here..."
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          rows={4}
          className="bg-background text-sm"
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">Applies to Facebook, Instagram & LinkedIn automatically</span>
          <Button className="gap-2" disabled={!postText.trim()}>
            <Megaphone className="h-4 w-4" />
            <span>Publish Now</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
