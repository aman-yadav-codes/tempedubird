"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgramEnrollmentDialog, type ProgramEnrollmentTarget } from "@/components/public/program-enrollment-dialog";

interface CourseDetailEnrollButtonProps {
  course: {
    id: number;
    title: string;
    institute: string;
    price: string;
    duration: string;
    description?: string;
  };
}

export function CourseDetailEnrollButton({ course }: CourseDetailEnrollButtonProps) {
  const [open, setOpen] = useState(false);

  const targetProgram: ProgramEnrollmentTarget = {
    id: course.id,
    title: course.title,
    institution_name: course.institute,
    fee_amount: course.price,
    duration: course.duration,
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full font-bold shadow-md gap-2"
        size="lg"
      >
        <GraduationCap className="h-5 w-5" />
        Enroll Now
      </Button>

      <ProgramEnrollmentDialog
        open={open}
        onOpenChange={setOpen}
        program={targetProgram}
      />
    </>
  );
}
