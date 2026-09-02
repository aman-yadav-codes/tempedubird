"use client";

import { useState, useEffect } from "react";
import { GraduationCap, HelpCircle, PhoneCall, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProgramEnrollmentDialog, type ProgramEnrollmentTarget } from "@/components/public/program-enrollment-dialog";
import { CourseEnquiryDialog, type CourseEnquiryTarget } from "@/components/public/course-enquiry-dialog";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import { useAuthStore } from "@/store";

interface CourseDetailEnrollButtonProps {
  course: {
    id: number;
    title: string;
    institute: string;
    price: string;
    duration: string;
    description?: string;
    institutionId?: number;
    institution_id?: number;
    fee_amount?: any;
    phone?: string | null;
    email?: string | null;
    institution?: {
      id: number;
      name: string;
      phone?: string | null;
      email?: string | null;
    } | null;
  };
}

export function CourseDetailEnrollButton({ course }: CourseDetailEnrollButtonProps) {
  const { user } = useAuthStore();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingEnquiry, setPendingEnquiry] = useState(false);

  // If user signs in or registers after clicking Enquiry, auto-open enquiry modal
  useEffect(() => {
    if (user && pendingEnquiry) {
      setPendingEnquiry(false);
      setAuthOpen(false);
      setEnquiryOpen(true);
    }
  }, [user, pendingEnquiry]);

  const targetProgram: ProgramEnrollmentTarget = {
    id: course.id,
    title: course.title,
    institution_id: course.institutionId || course.institution_id || course.institution?.id,
    institution_name: course.institute,
    fee_amount: course.fee_amount || course.price,
    duration: course.duration,
  };

  const targetEnquiry: CourseEnquiryTarget = {
    id: course.id,
    title: course.title,
    institute: course.institute,
    institution_id: course.institutionId || course.institution_id || course.institution?.id,
    price: course.price,
    duration: course.duration,
  };

  // Get Institute Phone Number
  const rawPhone = course.phone || course.institution?.phone || "";
  const cleanPhone = rawPhone.replace(/[^\d+]/g, "");

  const handleCallNow = () => {
    if (cleanPhone) {
      window.location.href = `tel:${cleanPhone}`;
    } else {
      toast.info(`Contacting ${course.institute} admissions...`);
      window.location.href = `tel:+919876543210`;
    }
  };

  const handleWhatsAppNow = () => {
    const defaultNumber = cleanPhone || "919876543210";
    const waNumber = defaultNumber.startsWith("+") ? defaultNumber.slice(1) : defaultNumber.startsWith("91") ? defaultNumber : `91${defaultNumber}`;
    const text = encodeURIComponent(
      `Hello ${course.institute}, I would like to inquire about the course "${course.title}". Please share syllabus, admission details, and fee structure.`
    );
    const waUrl = `https://wa.me/${waNumber}?text=${text}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleEnquiryClick = () => {
    if (user) {
      setEnquiryOpen(true);
    } else {
      toast.info("Please register or sign in first to send your course enquiry.", {
        description: "Your enquiry will be sent directly to the admissions office once registered.",
      });
      setPendingEnquiry(true);
      setAuthOpen(true);
    }
  };

  return (
    <>
      <div className="space-y-2.5 w-full">
        {/* Enroll Button */}
        <Button
          onClick={() => setEnrollOpen(true)}
          className="w-full font-extrabold shadow-md gap-2 h-11 text-sm bg-primary hover:bg-primary/95 text-primary-foreground cursor-pointer"
          size="lg"
        >
          <GraduationCap className="h-5 w-5" />
          Enroll Now
        </Button>

        {/* 3 Action Buttons: Call Now, WhatsApp Now, Enquiry Now */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {/* 1. Call Now */}
          <Button
            type="button"
            variant="outline"
            onClick={handleCallNow}
            className="w-full h-10 px-1 text-xs font-bold border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all flex flex-col items-center justify-center gap-0.5 shadow-2xs cursor-pointer"
            title={cleanPhone ? `Call ${cleanPhone}` : "Call Institute Admissions"}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight">Call Now</span>
          </Button>

          {/* 2. WhatsApp Now */}
          <Button
            type="button"
            variant="outline"
            onClick={handleWhatsAppNow}
            className="w-full h-10 px-1 text-xs font-bold border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all flex flex-col items-center justify-center gap-0.5 shadow-2xs cursor-pointer"
            title="Chat on WhatsApp"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight">WhatsApp</span>
          </Button>

          {/* 3. Enquiry Now */}
          <Button
            type="button"
            variant="outline"
            onClick={handleEnquiryClick}
            className="w-full h-10 px-1 text-xs font-bold border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all flex flex-col items-center justify-center gap-0.5 shadow-2xs cursor-pointer"
            title="Submit Course Enquiry"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight">Enquiry</span>
          </Button>
        </div>
      </div>

      <ProgramEnrollmentDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        program={targetProgram}
      />

      <CourseEnquiryDialog
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        course={targetEnquiry}
      />

      <AuthModalDialog
        open={authOpen}
        onOpenChange={(isOpen) => {
          setAuthOpen(isOpen);
          if (!isOpen && !user) setPendingEnquiry(false);
        }}
        defaultTab="signup"
        institutionId={targetProgram.institution_id || undefined}
      />
    </>
  );
}
