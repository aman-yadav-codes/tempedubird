"use client";

import { useState } from "react";
import {
  Share2,
  Plus,
  Calendar,
  Megaphone,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
  Clock,
  BarChart2,
  Trash2,
  Check,
  Send,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type SocialPost = {
  id: string;
  title: string;
  platforms: string[];
  content: string;
  status: "Published" | "Scheduled" | "Draft";
  scheduledFor: string;
  reach: string;
  engagement: string;
  date: string;
};

export default function SocialMediaPage() {
  const [postText, setPostText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "Facebook",
    "Instagram",
    "LinkedIn",
    "X (Twitter)",
  ]);
  const [posts, setPosts] = useState<SocialPost[]>([
    {
      id: "1",
      title: "Admissions Open for 2026 Batch",
      platforms: ["Facebook", "Instagram", "LinkedIn"],
      content:
        "Excited to announce admissions are now officially open for Academic Year 2026-27! Apply today for state-of-the-art courses and early bird scholarships.",
      status: "Published",
      scheduledFor: "Immediate",
      reach: "14,850",
      engagement: "8.4%",
      date: "Today at 10:30 AM",
    },
    {
      id: "2",
      title: "Annual Sports & Tech Fest 2026",
      platforms: ["Instagram", "Facebook"],
      content:
        "Get ready for the biggest celebration of innovation, talent, and athleticism! Mark your calendars for next weekend.",
      status: "Scheduled",
      scheduledFor: "Tomorrow at 09:00 AM",
      reach: "--",
      engagement: "--",
      date: "Tomorrow",
    },
    {
      id: "3",
      title: "Faculty Spotlight: Excellence in Science",
      platforms: ["LinkedIn", "X (Twitter)"],
      content:
        "Congratulations to our senior faculty members for presenting groundbreaking research at the National Education Summit!",
      status: "Published",
      scheduledFor: "Yesterday",
      reach: "6,420",
      engagement: "6.1%",
      date: "2 days ago",
    },
  ]);

  // Campaign Dialog State
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignType, setCampaignType] = useState("admissions");
  const [campaignContent, setCampaignContent] = useState("");
  const [campaignSchedule, setCampaignSchedule] = useState("immediate");
  const [campaignPlatforms, setCampaignPlatforms] = useState<string[]>([
    "Facebook",
    "Instagram",
  ]);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const toggleCampaignPlatform = (p: string) => {
    setCampaignPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleQuickPublish = () => {
    if (!postText.trim()) {
      toast.error("Please enter text for your post.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one social media platform.");
      return;
    }

    const newPost: SocialPost = {
      id: String(Date.now()),
      title: postText.slice(0, 45) + (postText.length > 45 ? "..." : ""),
      platforms: [...selectedPlatforms],
      content: postText,
      status: "Published",
      scheduledFor: "Immediate",
      reach: "Just published",
      engagement: "0%",
      date: "Just now",
    };

    setPosts([newPost, ...posts]);
    setPostText("");
    toast.success(`Published post across ${selectedPlatforms.join(", ")}!`);
  };

  const handleLaunchCampaign = () => {
    if (!campaignTitle.trim()) {
      toast.error("Please enter a campaign name.");
      return;
    }
    if (!campaignContent.trim()) {
      toast.error("Please enter campaign content.");
      return;
    }
    if (campaignPlatforms.length === 0) {
      toast.error("Please select at least one target platform.");
      return;
    }

    const newPost: SocialPost = {
      id: String(Date.now()),
      title: campaignTitle,
      platforms: [...campaignPlatforms],
      content: campaignContent,
      status: campaignSchedule === "immediate" ? "Published" : "Scheduled",
      scheduledFor: campaignSchedule === "immediate" ? "Immediate" : "Scheduled Date",
      reach: campaignSchedule === "immediate" ? "Live" : "--",
      engagement: campaignSchedule === "immediate" ? "0%" : "--",
      date: "Just now",
    };

    setPosts([newPost, ...posts]);
    setCampaignOpen(false);
    setCampaignTitle("");
    setCampaignContent("");
    toast.success(
      campaignSchedule === "immediate"
        ? `Campaign "${campaignTitle}" launched successfully!`
        : `Campaign "${campaignTitle}" scheduled successfully!`
    );
  };

  const handleDeletePost = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Post removed from campaign log.");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
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

        <Button
          onClick={() => setCampaignOpen(true)}
          className="gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Social Campaign</span>
        </Button>
      </div>

      {/* Social Accounts Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { platform: "Facebook Page", status: "Connected", followers: "14,250", handle: "@edubirdofficial", color: "text-blue-600" },
          { platform: "Instagram Business", status: "Connected", followers: "28,900", handle: "@edubird_edu", color: "text-pink-600" },
          { platform: "LinkedIn Page", status: "Connected", followers: "8,640", handle: "EduBird Platforms", color: "text-sky-700" },
          { platform: "X (Twitter)", status: "Active", followers: "5,120", handle: "@EduBirdApp", color: "text-zinc-800 dark:text-zinc-200" },
        ].map((acc, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">{acc.platform}</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold">
                {acc.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{acc.handle}</p>
            <p className="text-lg font-extrabold text-foreground pt-1">{acc.followers} followers</p>
          </div>
        ))}
      </div>

      {/* Multi-Platform Post Publisher */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Multi-Platform Post Publisher
          </h3>

          {/* Platform Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {["Facebook", "Instagram", "LinkedIn", "X (Twitter)"].map((p) => {
              const active = selectedPlatforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {active && <Check className="h-3 w-3" />}
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          placeholder="Write your campaign announcement or social post here (e.g. scholarship updates, admissions open, campus events)..."
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          rows={4}
          className="bg-background text-sm resize-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{postText.length} characters</span>
            <span>•</span>
            <span>Broadcasting to {selectedPlatforms.length} platform(s)</span>
          </div>

          <Button
            onClick={handleQuickPublish}
            disabled={!postText.trim()}
            className="gap-2 cursor-pointer"
          >
            <Megaphone className="h-4 w-4" />
            <span>Publish Now</span>
          </Button>
        </div>
      </div>

      {/* Recent Posts and Campaigns List */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Campaigns & Social Feed
          </h3>
          <Badge variant="outline" className="text-xs font-medium">
            {posts.length} Posts Total
          </Badge>
        </div>

        <div className="divide-y divide-border">
          {posts.map((p) => (
            <div key={p.id} className="py-4 space-y-2 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">{p.title}</h4>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      p.status === "Published"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    }`}
                  >
                    {p.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {p.date}
                  </span>
                  <button
                    onClick={() => handleDeletePost(p.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Remove post"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{p.content}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px]">Platforms:</span>
                  {p.platforms.map((plat) => (
                    <Badge key={plat} variant="secondary" className="text-[10px]">
                      {plat}
                    </Badge>
                  ))}
                </div>

                {p.status === "Published" && (
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Reach: <strong className="text-foreground">{p.reach}</strong></span>
                    <span>Engagement: <strong className="text-foreground">{p.engagement}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Social Campaign Modal Dialog */}
      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Create New Social Campaign
            </DialogTitle>
            <DialogDescription>
              Launch coordinated promotional campaigns across connected institute social handles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="camp-name">Campaign Name *</Label>
              <Input
                id="camp-name"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="e.g. Scholarship Entrance Exam 2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Campaign Goal</Label>
                <Select value={campaignType} onValueChange={setCampaignType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admissions">Admission Leads</SelectItem>
                    <SelectItem value="event">Campus Event / Fest</SelectItem>
                    <SelectItem value="branding">Brand Awareness</SelectItem>
                    <SelectItem value="offer">Discount & Scholarship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Schedule Time</Label>
                <Select value={campaignSchedule} onValueChange={setCampaignSchedule}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Publish Immediately</SelectItem>
                    <SelectItem value="scheduled">Schedule for Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Platforms</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Facebook", "Instagram", "LinkedIn", "X (Twitter)"].map((plat) => {
                  const checked = campaignPlatforms.includes(plat);
                  return (
                    <label
                      key={plat}
                      className="flex items-center gap-2 text-xs border rounded-lg p-2.5 cursor-pointer bg-card hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCampaignPlatform(plat)}
                      />
                      <span className="font-medium text-foreground">{plat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="camp-content">Post Content *</Label>
              <Textarea
                id="camp-content"
                value={campaignContent}
                onChange={(e) => setCampaignContent(e.target.value)}
                placeholder="Write your full campaign message and hashtags..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCampaignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLaunchCampaign} className="font-bold">
              Launch Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
