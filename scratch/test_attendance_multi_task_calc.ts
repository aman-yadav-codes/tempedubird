import { calculateDayTaskAttendance } from '../app/lib/task-attendance-sync';

// Test the user's specific scenario:
// "if someone start task first start of any task of the day will count as check in 
// and last task stop count as checkout and staff can start or stop task anytime 
// but start stop of task will be store in history of task as well it will calculate total hours of work staff done. 
// example if today is monday and date is 1 jan 2027 and i woorked on 5 diffret task 
// then it will calculate all task working hour and show it as total working hours of mine for that day."

const targetDate = "2027-01-01";

// 5 tasks worked on Jan 1, 2027:
// Task 1: 09:00 AM to 10:00 AM (1 hour)
// Task 2: 11:00 AM to 12:00 PM (1 hour)
// Task 3: 01:00 PM to 02:00 PM (1 hour)
// Task 4: 03:00 PM to 04:00 PM (1 hour)
// Task 5: 05:00 PM to 06:00 PM (1 hour)
const mockTasks = [
  {
    id: 101,
    title: "Task 1 - Landing Page Wireframes",
    history: [
      { action: "started", timestamp: "2027-01-01T09:00:00.000Z", user_name: "Staff 1" },
      { action: "stopped", timestamp: "2027-01-01T10:00:00.000Z", user_name: "Staff 1" },
    ],
  },
  {
    id: 102,
    title: "Task 2 - API Auth Endpoints",
    history: [
      { action: "started", timestamp: "2027-01-01T11:00:00.000Z", user_name: "Staff 1" },
      { action: "stopped", timestamp: "2027-01-01T12:00:00.000Z", user_name: "Staff 1" },
    ],
  },
  {
    id: 103,
    title: "Task 3 - Database Migration Scripts",
    history: [
      { action: "started", timestamp: "2027-01-01T13:00:00.000Z", user_name: "Staff 1" },
      { action: "stopped", timestamp: "2027-01-01T14:00:00.000Z", user_name: "Staff 1" },
    ],
  },
  {
    id: 104,
    title: "Task 4 - Bugfix for Checkout flow",
    history: [
      { action: "started", timestamp: "2027-01-01T15:00:00.000Z", user_name: "Staff 1" },
      { action: "stopped", timestamp: "2027-01-01T16:00:00.000Z", user_name: "Staff 1" },
    ],
  },
  {
    id: 105,
    title: "Task 5 - Client Deliverable QA Review",
    history: [
      { action: "started", timestamp: "2027-01-01T17:00:00.000Z", user_name: "Staff 1" },
      { action: "stopped", timestamp: "2027-01-01T18:00:00.000Z", user_name: "Staff 1" },
    ],
  },
];

const metrics = calculateDayTaskAttendance(mockTasks, targetDate);

console.log("=== MULTI-TASK ATTENDANCE VERIFICATION ===");
console.log("Target Date:", metrics.dateStr);
console.log("Check-in Time (First start of day):", metrics.checkInTime);
console.log("Check-out Time (Last stop of day):", metrics.checkOutTime);
console.log("Check-in Count:", metrics.checkInCount);
console.log("Working Hours (Total active hours staff worked):", metrics.workingHours, "hours");
console.log("Task Hours:", metrics.taskHours, "hours");
console.log("Working Minutes:", metrics.workingMinutes, "minutes");
console.log("Tasks Worked:", metrics.taskTitles);
console.log("Attendance Status:", metrics.status);
console.log("Dedication Tier:", metrics.dedicationTier);

if (metrics.workingHours === 5 && metrics.taskHours === 5) {
  console.log("\n>>> TEST PASSED: Exactly 5.0 hours calculated from 5 tasks worked! <<<");
} else {
  console.error("\n>>> TEST FAILED: Expected 5.0 hours, got:", metrics.workingHours);
  process.exit(1);
}
