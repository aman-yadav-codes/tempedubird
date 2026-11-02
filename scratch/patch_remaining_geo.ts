import fs from 'fs';

const filePath = 'app/admin/my-profile/my-profile-client.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target1 = `  const [taskStatusTab, setTaskStatusTab] = useState<string>("pending");`;
const replacement1 = `  const [taskStatusTab, setTaskStatusTab] = useState<string>("pending");

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

const target2 = `  const handleSubtaskStatusUpdate = async (task: any, subId: string, newStatus: string) => {`;
const replacement2 = `  const handleSubtaskStatusUpdate = async (task: any, subId: string | number, newStatus: string, explicitLocation?: any) => {`;

let norm = content.replace(/\r\n/g, '\n');
const normT1 = target1.replace(/\r\n/g, '\n');
const normR1 = replacement1.replace(/\r\n/g, '\n');
const normT2 = target2.replace(/\r\n/g, '\n');
const normR2 = replacement2.replace(/\r\n/g, '\n');

if (norm.includes(normT1)) {
  norm = norm.replace(normT1, normR1);
  console.log("Success: States added");
}
if (norm.includes(normT2)) {
  norm = norm.replace(normT2, normR2);
  console.log("Success: handleSubtaskStatusUpdate signature updated");
}

const final = content.includes('\r\n') ? norm.replace(/\n/g, '\r\n') : norm;
fs.writeFileSync(filePath, final, 'utf8');
console.log("Finished patching my-profile-client.tsx");
