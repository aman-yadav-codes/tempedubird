"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  Download,
  Filter,
  GraduationCap,
  LineChart,
  PieChart,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type StudentGrowthItem = {
  id: number;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  previousScore: number;
  currentScore: number;
  growthDelta: number;
  attendanceRate: number;
  strongSubject: string;
  weakSubject: string;
  status: "exceptional" | "improving" | "stable" | "needs_attention";
};

const SAMPLE_STUDENTS: StudentGrowthItem[] = [
  {
    id: 1,
    name: "Aarav Sharma",
    admissionNo: "ADM-2025-014",
    className: "Class 10",
    section: "Section A",
    previousScore: 74,
    currentScore: 88,
    growthDelta: +14,
    attendanceRate: 96,
    strongSubject: "Mathematics",
    weakSubject: "Social Studies",
    status: "exceptional",
  },
  {
    id: 2,
    name: "Diya Patel",
    admissionNo: "ADM-2025-022",
    className: "Class 10",
    section: "Section A",
    previousScore: 82,
    currentScore: 92,
    growthDelta: +10,
    attendanceRate: 98,
    strongSubject: "Science",
    weakSubject: "Hindi",
    status: "exceptional",
  },
  {
    id: 3,
    name: "Rohan Verma",
    admissionNo: "ADM-2025-039",
    className: "Class 10",
    section: "Section B",
    previousScore: 68,
    currentScore: 76,
    growthDelta: +8,
    attendanceRate: 91,
    strongSubject: "English",
    weakSubject: "Mathematics",
    status: "improving",
  },
  {
    id: 4,
    name: "Ananya Gupta",
    admissionNo: "ADM-2025-045",
    className: "Class 9",
    section: "Section A",
    previousScore: 61,
    currentScore: 71,
    growthDelta: +10,
    attendanceRate: 89,
    strongSubject: "Science",
    weakSubject: "Physics",
    status: "improving",
  },
  {
    id: 5,
    name: "Kabir Mehta",
    admissionNo: "ADM-2025-058",
    className: "Class 9",
    section: "Section B",
    previousScore: 78,
    currentScore: 79,
    growthDelta: +1,
    attendanceRate: 85,
    strongSubject: "Computer Science",
    weakSubject: "Chemistry",
    status: "stable",
  },
  {
    id: 6,
    name: "Sneha Reddy",
    admissionNo: "ADM-2025-063",
    className: "Class 10",
    section: "Section B",
    previousScore: 72,
    currentScore: 63,
    growthDelta: -9,
    attendanceRate: 74,
    strongSubject: "English",
    weakSubject: "Mathematics",
    status: "needs_attention",
  },
];

const SUBJECT_PERFORMANCES = [
  { subject: "Mathematics", avgScore: 82.4, growth: "+8.2%", benchmark: 75, color: "bg-blue-500" },
  { subject: "Science", avgScore: 84.8, growth: "+6.5%", benchmark: 75, color: "bg-emerald-500" },
  { subject: "English", avgScore: 79.2, growth: "+4.1%", benchmark: 70, color: "bg-purple-500" },
  { subject: "Social Studies", avgScore: 73.6, growth: "+2.8%", benchmark: 70, color: "bg-amber-500" },
  { subject: "Computer Science", avgScore: 88.5, growth: "+11.4%", benchmark: 80, color: "bg-sky-500" },
  { subject: "Hindi", avgScore: 76.0, growth: "+1.9%", benchmark: 70, color: "bg-rose-500" },
];

const TERM_TIMELINE = [
  { term: "Unit Test 1 (Apr)", classAvg: 71.5, topPercentile: 91.0, passingRate: "92%" },
  { term: "Unit Test 2 (Jul)", classAvg: 74.2, topPercentile: 93.5, passingRate: "94%" },
  { term: "Mid-Term Exam (Oct)", classAvg: 77.8, topPercentile: 95.0, passingRate: "96%" },
  { term: "Unit Test 3 (Dec)", classAvg: 80.4, topPercentile: 96.8, passingRate: "97%" },
  { term: "Pre-Board / Final (Feb)", classAvg: 83.2, topPercentile: 98.4, passingRate: "99%" },
];

export default function GrowthChartPage() {
  useAdminGuard();
  const { activeInstitution } = useActiveInstitution();

  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentGrowthItem | null>(SAMPLE_STUDENTS[0]);

  const filteredStudents = useMemo(() => {
    return SAMPLE_STUDENTS.filter((s) => {
      if (selectedClass !== "all" && s.className !== selectedClass) return false;
      if (selectedSection !== "all" && s.section !== selectedSection) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          s.name.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q) ||
          s.strongSubject.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedClass, selectedSection, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1.5">
            <TrendingUp className="size-3.5" />
            <span>Academic Performance &amp; Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Academic Growth Chart
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Track student learning curves, subject mastery trends, exam performance trajectories, and academic growth indexes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold cursor-pointer">
            <Download className="size-3.5" />
            Export Growth Report
          </Button>
        </div>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-gradient-to-br from-card to-primary/5 shadow-2xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Overall Class Average
            </CardDescription>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-black text-foreground">80.8%</span>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-bold gap-1">
                <ArrowUpRight className="size-3.5" /> +9.3%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Across all subjects in {activeInstitution?.name || "Institution"}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-emerald-500/5 shadow-2xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Average Growth Index
            </CardDescription>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-black text-emerald-600">+8.4 pts</span>
              <Badge variant="outline" className="text-xs font-bold">
                Term-over-Term
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">87% of students showed positive growth</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-blue-500/5 shadow-2xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Highest Subject Growth
            </CardDescription>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-foreground truncate">Comp. Science</span>
              <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-xs font-bold">
                +11.4%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Class average score reached 88.5%</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-card to-amber-500/5 shadow-2xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Attention Required
            </CardDescription>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-black text-amber-600">6 Students</span>
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30 font-bold">
                Declining
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Remedial coaching recommended</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-card p-3.5 rounded-xl border border-border/60 shadow-xs">
        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground">Class / Grade</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-8.5 text-xs bg-background">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="Class 10">Class 10</SelectItem>
              <SelectItem value="Class 9">Class 9</SelectItem>
              <SelectItem value="Class 8">Class 8</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground">Section</Label>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="h-8.5 text-xs bg-background">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              <SelectItem value="Section A">Section A</SelectItem>
              <SelectItem value="Section B">Section B</SelectItem>
              <SelectItem value="Section C">Section C</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground">Academic Term</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="h-8.5 text-xs bg-background">
              <SelectValue placeholder="Cumulative Growth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Full Year Cumulative</SelectItem>
              <SelectItem value="term1">Term 1 (Apr - Sep)</SelectItem>
              <SelectItem value="term2">Term 2 (Oct - Mar)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-bold text-muted-foreground">Search Student</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, roll no..."
              className="h-8.5 pl-8 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* Main Analytics Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border">
          <TabsTrigger value="overview" className="gap-2 text-xs font-bold cursor-pointer">
            <LineChart className="size-3.5" />
            Cohort Trajectory
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2 text-xs font-bold cursor-pointer">
            <BookOpen className="size-3.5" />
            Subject Mastery
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2 text-xs font-bold cursor-pointer">
            <Users className="size-3.5" />
            Student Growth Tracker
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: COHORT TRAJECTORY */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Visual Timeline Bar Chart */}
            <Card className="lg:col-span-2 border-border/60 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Exam-over-Exam Class Growth</CardTitle>
                    <CardDescription className="text-xs">
                      Average score trajectory across all assessment cycles this academic session
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold">
                    Session 2025-2026
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3.5">
                  {TERM_TIMELINE.map((item, idx) => (
                    <div key={item.term} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{item.term}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-[11px]">Top: {item.topPercentile}%</span>
                          <span className="font-black text-primary text-sm">{item.classAvg}%</span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                        <div
                          className="bg-primary h-full transition-all duration-500 rounded-full"
                          style={{ width: `${item.classAvg}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border bg-muted/20 p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <span>
                      Overall cohort scores increased by <strong>+11.7%</strong> from Unit Test 1 to Pre-Boards.
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-bold shrink-0">
                    High Acceleration
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Attendance & Growth Correlation */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Attendance vs. Growth</CardTitle>
                <CardDescription className="text-xs">
                  Correlation between attendance rate and score improvements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border bg-card space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>90%+ Attendance</span>
                      <span className="text-emerald-600 font-black">+12.4 pts growth</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Average score: 86.4% across 48 students</p>
                  </div>

                  <div className="p-3 rounded-xl border bg-card space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>75% - 89% Attendance</span>
                      <span className="text-blue-600 font-black">+6.1 pts growth</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Average score: 74.8% across 22 students</p>
                  </div>

                  <div className="p-3 rounded-xl border bg-card space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Below 75% Attendance</span>
                      <span className="text-rose-600 font-black">-3.2 pts decline</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Average score: 62.1% across 6 students</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                  💡 Students with 90%+ attendance exhibit <strong>2x higher score improvements</strong> on periodic exams.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: SUBJECT MASTERY */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUBJECT_PERFORMANCES.map((s) => (
              <Card key={s.subject} className="border-border/60 shadow-xs">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">{s.subject}</CardTitle>
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs font-bold">
                      {s.growth}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">Benchmark Target: {s.benchmark}%</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-foreground">{s.avgScore}%</span>
                    <span className="text-xs text-muted-foreground">
                      {s.avgScore >= s.benchmark ? "Above Benchmark" : "Below Benchmark"}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                      style={{ width: `${s.avgScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 3: STUDENT GROWTH TRACKER */}
        <TabsContent value="students" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Student List */}
            <div className="lg:col-span-7 rounded-xl border bg-card divide-y overflow-hidden">
              <div className="p-3.5 bg-muted/20 font-bold text-xs flex items-center justify-between">
                <span>Student Performance Roster ({filteredStudents.length})</span>
                <span className="text-[11px] text-muted-foreground">Click to inspect growth card</span>
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                  const isPositive = student.growthDelta >= 0;
                  return (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer hover:bg-muted/40 ${
                        isSelected ? "bg-primary/5 border-l-4 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{student.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {student.admissionNo} • {student.className} ({student.section})
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-0.5">
                        <div className="flex items-center justify-end gap-1.5 font-bold">
                          <span className="text-sm font-black text-foreground">{student.currentScore}%</span>
                          <span
                            className={`inline-flex items-center text-[11px] font-bold ${
                              isPositive ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isPositive ? `+${student.growthDelta}%` : `${student.growthDelta}%`}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase tracking-wider font-bold ${
                            student.status === "exceptional"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : student.status === "needs_attention"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          }`}
                        >
                          {student.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Student Detail Card */}
            <div className="lg:col-span-5">
              {selectedStudent ? (
                <Card className="border-border/60 shadow-xs h-full flex flex-col">
                  <CardHeader className="pb-3 border-b bg-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-primary text-primary-foreground font-black text-lg flex items-center justify-center shadow-xs">
                        {selectedStudent.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{selectedStudent.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {selectedStudent.admissionNo} • {selectedStudent.className} ({selectedStudent.section})
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Previous Score</span>
                        <p className="text-lg font-black text-foreground">{selectedStudent.previousScore}%</p>
                      </div>
                      <div className="p-3 rounded-xl border bg-primary/10 border-primary/20 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-primary font-mono">Current Score</span>
                        <p className="text-lg font-black text-primary">{selectedStudent.currentScore}%</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground">Net Growth:</span>
                        <span className="font-black text-emerald-600 text-sm">
                          {selectedStudent.growthDelta >= 0
                            ? `+${selectedStudent.growthDelta}%`
                            : `${selectedStudent.growthDelta}%`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground">Attendance Rate:</span>
                        <span className="font-bold text-foreground">{selectedStudent.attendanceRate}%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground">Strong Subject:</span>
                        <span className="font-bold text-emerald-600">{selectedStudent.strongSubject}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-card border">
                        <span className="text-muted-foreground">Opportunity Area:</span>
                        <span className="font-bold text-amber-600">{selectedStudent.weakSubject}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground">
                      📈 <strong>Observation:</strong> {selectedStudent.name} is showing steady upward momentum in{" "}
                      {selectedStudent.strongSubject}. Recommended focus on {selectedStudent.weakSubject} exercises before upcoming exams.
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground p-8 text-center">
                  Select a student from the roster to inspect detailed growth metrics.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
