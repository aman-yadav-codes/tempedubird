import { getDayCheckInSessions } from '../app/lib/task-attendance-sync';

// Test that check-in & check-out sessions with geo-locations are properly structured
const mockTasksWithGeo = [
  {
    id: 101,
    title: "Website UI Revamp",
    history: [
      {
        action: "started",
        timestamp: "2026-10-30T09:15:00.000Z",
        user_name: "Aman Yadav",
        location: { latitude: 25.3176, longitude: 82.9739, accuracy: 12, address: "Sigra, Varanasi, UP" },
        subtask_title: "Hero section redesign",
      },
      {
        action: "stopped",
        timestamp: "2026-10-30T11:45:00.000Z",
        user_name: "Aman Yadav",
        location: { latitude: 25.3182, longitude: 82.9745, accuracy: 10, address: "Sigra Crossroad, Varanasi, UP" },
        subtask_title: "Hero section redesign",
      },
      {
        action: "started",
        timestamp: "2026-10-30T13:00:00.000Z",
        user_name: "Aman Yadav",
        location: { latitude: 25.3200, longitude: 82.9800, accuracy: 15, address: "Bhelupur, Varanasi, UP" },
        subtask_title: "Footer & contact form testing",
      },
      {
        action: "stopped",
        timestamp: "2026-10-30T15:30:00.000Z",
        user_name: "Aman Yadav",
        location: { latitude: 25.3210, longitude: 82.9810, accuracy: 14, address: "Bhelupur Market, Varanasi, UP" },
        subtask_title: "Footer & contact form testing",
      },
    ],
  },
];

const sessions = getDayCheckInSessions(mockTasksWithGeo, "2026-10-30");

console.log("=== GEO-LOCATION SESSIONS FOR 30 OCT 2026 ===");
console.log("Total sessions:", sessions.length);

sessions.forEach((s) => {
  console.log(`\n--- Session #${s.sessionIndex} ---`);
  console.log("Task:", s.taskTitle);
  console.log("Deliverable:", s.subtaskTitle);
  console.log(`Punch In : ${s.startFormatted} at [Lat: ${s.startLocation?.latitude}, Lng: ${s.startLocation?.longitude}] (${s.startLocation?.address})`);
  console.log(`Punch Out: ${s.stopFormatted} at [Lat: ${s.stopLocation?.latitude}, Lng: ${s.stopLocation?.longitude}] (${s.stopLocation?.address})`);
  console.log(`Duration : ${s.durationFormatted} (${s.durationMinutes} mins)`);
  console.log(`Status   : ${s.status}`);
});

if (sessions.length === 2 && sessions[0].startLocation?.latitude === 25.3176) {
  console.log("\n>>> TEST PASSED: Daily Geo Sessions reconstructed accurately! <<<");
} else {
  console.error("Test failed!");
  process.exit(1);
}
