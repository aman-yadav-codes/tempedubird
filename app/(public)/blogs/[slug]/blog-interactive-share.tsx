"use client";

import React, { useState } from "react";
import { Share2, MessageSquare, Star, Copy, Check, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UniversalFeedbackDialog } from "@/components/public/universal-feedback-dialog";

export function BlogInteractiveShare({
  articleId,
  title,
  slug,
  authorName,
  instituteName,
}: {
  articleId: number;
  title: string;
  slug: string;
  authorName: string;
  instituteName: string;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  const getArticleUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/blogs/${slug}`;
    }
    return `https://edubird.org/blogs/${slug}`;
  };

  const handleCopy = () => {
    const url = getArticleUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Article link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToWhatsapp = () => {
    const url = getArticleUrl();
    const text = encodeURIComponent(`*${title}*\nRead this educational article on EduBird:\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const shareToTwitter = () => {
    const url = getArticleUrl();
    const text = encodeURIComponent(`${title} on @EduBird\n${url}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareToLinkedIn = () => {
    const url = getArticleUrl();
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
  };

  return (
    <>
      <Card className="p-4 sm:p-5 rounded-2xl border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLiked(!liked);
              toast.success(liked ? "Feedback removed" : "Thanks for your appreciation!");
            }}
            className={`text-xs font-bold gap-1.5 rounded-xl cursor-pointer ${
              liked ? "bg-primary/10 text-primary border-primary/30" : ""
            }`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${liked ? "fill-primary" : ""}`} />
            <span>{liked ? "Helpful (1)" : "Helpful"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setFeedbackOpen(true)}
            className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl cursor-pointer"
          >
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>Rate & Comment</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Share2 className="h-3.5 w-3.5" /> Share:
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={shareToWhatsapp}
            title="Share on WhatsApp"
            className="h-8 w-8 rounded-full border-border hover:border-emerald-500 hover:text-emerald-600 cursor-pointer"
          >
            <span className="font-bold text-xs text-emerald-600">W</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={shareToTwitter}
            title="Share on Twitter / X"
            className="h-8 w-8 rounded-full border-border hover:border-sky-500 hover:text-sky-500 cursor-pointer"
          >
            <span className="font-bold text-xs">X</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={shareToLinkedIn}
            title="Share on LinkedIn"
            className="h-8 w-8 rounded-full border-border hover:border-blue-600 hover:text-blue-600 cursor-pointer"
          >
            <span className="font-bold text-xs text-blue-600">in</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title="Copy Link"
            className="h-8 w-8 rounded-full border-border hover:border-primary hover:text-primary cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </Card>

      {/* Universal Feedback Dialog */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          type: "blog",
          id: articleId,
          title,
          subtitle: `${instituteName} • By ${authorName}`,
          avg_rating: 4.9,
          review_count: 14,
        }}
      />
    </>
  );
}
