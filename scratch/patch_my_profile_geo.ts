import fs from 'fs';

const filePath = 'app/admin/my-profile/my-profile-client.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports at the top
const importTarget = `import { captureBrowserLocation } from "@/app/lib/geolocation";`;
const importReplacement = `import { captureBrowserLocation } from "@/app/lib/geolocation";
import { DailyGeoAttendanceHistoryDialog } from "@/components/daily-geo-attendance-history-dialog";
import { CheckInLocationDialog } from "@/components/check-in-location-dialog";`;

// 2. Add state inside MyProfileClient
const stateTarget = `  const [taskStatusTab, setTaskStatusTab] = useState<string>("all");`;
const stateReplacement = `  const [taskStatusTab, setTaskStatusTab] = useState<string>("all");

  // Daily Geo Attendance History Dialog State
  const [geoHistoryDialogOpen, setGeoHistoryDialogOpen] = useState<boolean>(false);
  const [selectedGeoHistoryRow, setSelectedGeoHistoryRow] = useState<any | null>(null);

  // Check-In Location Verification Dialog State
  const [locationCheckInOpen, setLocationCheckInOpen] = useState<boolean>(false);
  const [pendingCheckInInfo, setPendingCheckInInfo] = useState<{
    task: any;
    subId?: string | number | null;
    subTitle?: string | null;
  } | null>(null);

  const requestStartTaskWithLocation = (task: any, subId?: string | number | null, subTitle?: string | null) => {
    if (activeRunningTask && activeRunningTask.id !== task.id) {
      toast.error("Only one task can be started at a time. Please stop your active task first.");
      return;
    }
    setPendingCheckInInfo({ task, subId, subTitle });
    setLocationCheckInOpen(true);
  };

  const handleConfirmLocationCheckIn = async (locData: any) => {
    if (!pendingCheckInInfo) return;
    const { task, subId, subTitle } = pendingCheckInInfo;
    if (subId) {
      await handleSubtaskStatusUpdate(task, subId, "in_progress", locData);
    } else {
      await handleUpdateTaskStatus(task.id, "in_progress", locData);
    }
    setLocationCheckInOpen(false);
    setPendingCheckInInfo(null);
  };`;

// 3. Update handleUpdateTaskStatus signature and startLoc
const updateStatusTarget = `  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    const isCreator = Boolean(user?.id && targetTask?.created_by && Number(targetTask.created_by) === Number(user.id));

    if ((newStatus === "completed" || newStatus === "cancelled") && !isCreator) {
      toast.error("Only the person who created the main task can mark it as Completed or Cancelled");
      return;
    }

    if (newStatus === "in_progress") {
      if (activeRunningTask && activeRunningTask.id !== taskId) {
        toast.error("Only one task can be started at a time. Please stop or complete your active task first.");
        return;
      }
    }

    // Capture browser geolocation automatically if starting task
    let startLoc = null;
    if (newStatus === "in_progress") {
      try {
        startLoc = await captureBrowserLocation(4000);
      } catch (err) {
        console.warn("Could not capture browser location", err);
      }
    }`;

const updateStatusReplacement = `  const handleUpdateTaskStatus = async (taskId: number, newStatus: string, explicitLocation?: any) => {
    const targetTask = tasks.find(t => t.id === taskId);
    const isCreator = Boolean(user?.id && targetTask?.created_by && Number(targetTask.created_by) === Number(user.id));

    if ((newStatus === "completed" || newStatus === "cancelled") && !isCreator) {
      toast.error("Only the person who created the main task can mark it as Completed or Cancelled");
      return;
    }

    if (newStatus === "in_progress") {
      if (activeRunningTask && activeRunningTask.id !== taskId) {
        toast.error("Only one task can be started at a time. Please stop or complete your active task first.");
        return;
      }
    }

    // Use explicit verified location or capture automatically
    let startLoc = explicitLocation || null;
    if (newStatus === "in_progress" && !startLoc) {
      try {
        startLoc = await captureBrowserLocation(4000);
      } catch (err) {
        console.warn("Could not capture browser location", err);
      }
    }`;

// 4. Update handleSubtaskStatusUpdate signature and startLoc
const subtaskTarget = `  const handleSubtaskStatusUpdate = async (parentTask: any, subId: string | number, newStatus: string) => {
    if (newStatus === "in_progress") {
      const isOtherInProgress = tasks.some(t => {
        if (t.id !== parentTask.id) {
          return normalizeTaskStatus(t.status) === "in_progress" ||
            (Array.isArray(t.sub_tasks) && t.sub_tasks.some((s: any) => normalizeTaskStatus(s.status) === "in_progress"));
        }
        return Array.isArray(t.sub_tasks) && t.sub_tasks.some((s: any) => s.id !== subId && normalizeTaskStatus(s.status) === "in_progress");
      });

      if (isOtherInProgress) {
        toast.error("Another task or deliverable is already in progress. Please stop or complete it first.");
        return;
      }
    }`;

const subtaskReplacement = `  const handleSubtaskStatusUpdate = async (parentTask: any, subId: string | number, newStatus: string, explicitLocation?: any) => {
    if (newStatus === "in_progress") {
      const isOtherInProgress = tasks.some(t => {
        if (t.id !== parentTask.id) {
          return normalizeTaskStatus(t.status) === "in_progress" ||
            (Array.isArray(t.sub_tasks) && t.sub_tasks.some((s: any) => normalizeTaskStatus(s.status) === "in_progress"));
        }
        return Array.isArray(t.sub_tasks) && t.sub_tasks.some((s: any) => s.id !== subId && normalizeTaskStatus(s.status) === "in_progress");
      });

      if (isOtherInProgress) {
        toast.error("Another task or deliverable is already in progress. Please stop or complete it first.");
        return;
      }
    }`;

// 5. Update startLoc in handleSubtaskStatusUpdate
const subtaskLocTarget = `    // Capture browser geolocation automatically if starting task
    let startLoc = null;
    if (newStatus === "in_progress") {
      try {
        startLoc = await captureBrowserLocation(4000);
      } catch (err) {
        console.warn("Could not capture browser location", err);
      }
    }`;

const subtaskLocReplacement = `    // Use explicit verified location or capture automatically
    let startLoc = explicitLocation || null;
    if (newStatus === "in_progress" && !startLoc) {
      try {
        startLoc = await captureBrowserLocation(4000);
      } catch (err) {
        console.warn("Could not capture browser location", err);
      }
    }`;

// 6. Update Check-In Count TD in the attendance table to make it clickable
const checkInTdTarget = `                        {/* Check-in Count */}
                        <td className="p-3 text-center font-mono font-medium">
                          {row.checkInCount > 0 ? (
                            <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary">
                              {row.checkInCount}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>`;

const checkInTdReplacement = `                        {/* Check-in Count - Clickable Geo History */}
                        <td className="p-3 text-center font-mono font-medium">
                          {row.checkInCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGeoHistoryRow(row);
                                setGeoHistoryDialogOpen(true);
                              }}
                              title="Click to view Check-In & Check-Out Geo-Location history for this day"
                              className="inline-flex items-center gap-1 cursor-pointer group focus:outline-hidden"
                            >
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-bold bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs hover:scale-110 cursor-pointer flex items-center gap-1 px-2 py-0.5"
                              >
                                <MapPin className="w-2.5 h-2.5 text-primary group-hover:text-primary-foreground" />
                                <span>{row.checkInCount}</span>
                              </Badge>
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>`;

// 7. Update button onClick for starting main task
const startBtnTarget = `onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}`;
const startBtnReplacement = `onClick={() => requestStartTaskWithLocation(task)}`;

// 8. Update button onClick for starting subtask
const startSubBtnTarget = `onClick={() => handleSubtaskStatusUpdate(task, sub.id, "in_progress")}`;
const startSubBtnReplacement = `onClick={() => requestStartTaskWithLocation(task, sub.id, sub.title)}`;

// 9. Mount dialogs at bottom of component before closing div
const dialogMountTarget = `      </Dialog>
    </div>
  );
}`;

const dialogMountReplacement = `      </Dialog>

      {/* Daily Check-In & Check-Out Geo-Location History Dialog */}
      <DailyGeoAttendanceHistoryDialog
        open={geoHistoryDialogOpen}
        onOpenChange={setGeoHistoryDialogOpen}
        dateKey={selectedGeoHistoryRow?.dateKey || null}
        dateFormatted={selectedGeoHistoryRow?.dateFormatted}
        tasks={tasks}
        shiftLabel={attendanceData?.shift_info?.label || "09:00 AM - 05:00 PM (General Shift)"}
        expectedHours={attendanceData?.shift_info?.expectedHours || 8}
        rowMetrics={selectedGeoHistoryRow}
      />

      {/* Geo-Location Confirmation Dialog Before Check-In */}
      <CheckInLocationDialog
        open={locationCheckInOpen}
        onOpenChange={setLocationCheckInOpen}
        taskTitle={pendingCheckInInfo?.task?.title || "Task"}
        subtaskTitle={pendingCheckInInfo?.subTitle}
        urgency={pendingCheckInInfo?.task?.urgency}
        onConfirm={handleConfirmLocationCheckIn}
      />
    </div>
  );
}`;

// Normalize CRLF to LF
let norm = content.replace(/\r\n/g, '\n');

function replaceOrLog(name: string, tgt: string, repl: string) {
  const normT = tgt.replace(/\r\n/g, '\n');
  const normR = repl.replace(/\r\n/g, '\n');
  if (norm.includes(normT)) {
    norm = norm.replace(normT, normR);
    console.log("Success: " + name);
  } else {
    console.warn("Failed: " + name);
  }
}

replaceOrLog("1. Imports", importTarget, importReplacement);
replaceOrLog("2. States", stateTarget, stateReplacement);
replaceOrLog("3. handleUpdateTaskStatus", updateStatusTarget, updateStatusReplacement);
replaceOrLog("4. handleSubtaskStatusUpdate", subtaskTarget, subtaskReplacement);
replaceOrLog("5. subtaskLoc", subtaskLocTarget, subtaskLocReplacement);
replaceOrLog("6. checkInTd", checkInTdTarget, checkInTdReplacement);
replaceOrLog("7. startBtn", startBtnTarget, startBtnReplacement);
replaceOrLog("8. startSubBtn", startSubBtnTarget, startSubBtnReplacement);
replaceOrLog("9. dialogMount", dialogMountTarget, dialogMountReplacement);

const final = content.includes('\r\n') ? norm.replace(/\n/g, '\r\n') : norm;
fs.writeFileSync(filePath, final, 'utf8');
console.log("Finished patching my-profile-client.tsx for Geo History and Check-In confirmation");
