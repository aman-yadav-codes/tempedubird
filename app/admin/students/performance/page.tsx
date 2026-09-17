import { Metadata } from "next";
import { StudentsPerformanceClient } from "./students-performance-client";

export const metadata: Metadata = {
  title: "Students Performance | Institution Admin",
  description: "Monitor and evaluate holistic student academic scores, attendance trends, exam results, and at-risk student metrics.",
};

export default function StudentsPerformancePage() {
  return <StudentsPerformanceClient />;
}
