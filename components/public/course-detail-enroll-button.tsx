"use client";

import { useState } from "react";
import { GraduationCap, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgramEnrollmentDialog, type ProgramEnrollmentTarget } from "@/components/public/program-enrollment-dialog";
import { CourseEnquiryDialog, type CourseEnquiryTarget } from "@/components/public/course-enquiry-dialog";

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
  };
}

export function CourseDetailEnrollButton({ course }: CourseDetailEnrollButtonProps) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  const targetProgram: ProgramEnrollmentTarget = {
    id: course.id,
    title: course.title,
    institution_id: course.institutionId || course.institution_id,
    institution_name: course.institute,
    fee_amount: course.fee_amount || course.price,
    duration: course.duration,
  };

  const targetEnquiry: CourseEnquiryTarget = {
    id: course.id,
    title: course.title,
    institute: course.institute,
    institution_id: course.institutionId || course.institution_id,
    price: course.price,
    duration: course.duration,
  };

  return (
    <>
      <div className="space-y-2 w-full">
        <Button
          onClick={() => setEnrollOpen(true)}
          className="w-full font-bold shadow-md gap-2"
          size="lg"
        >
          <GraduationCap className="h-5 w-5" />
          Enroll Now
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => setEnquiryOpen(true)}
          className="w-full font-bold border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground gap-2"
          size="lg"
        >
          <HelpCircle className="h-4 w-4" />
          Course Enquiry
        </Button>
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
    </>
  );
}
