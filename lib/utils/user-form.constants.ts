import {
    BriefcaseBusiness,
    CheckCircle2,
    MapPin,
    UserPlus,
    UserRound,
} from "lucide-react";

export const NO_GENDER = "none";

export const MONTHS: Array<[string, string]> = [
    ["1", "Jan"],
    ["2", "Feb"],
    ["3", "Mar"],
    ["4", "Apr"],
    ["5", "May"],
    ["6", "Jun"],
    ["7", "Jul"],
    ["8", "Aug"],
    ["9", "Sep"],
    ["10", "Oct"],
    ["11", "Nov"],
    ["12", "Dec"],
];

export const TEACHER_TYPE_OPTIONS = [
    { value: "individual_teacher", label: "Individual teacher" },
    { value: "institute_teacher", label: "Institute teacher" },
] as const;

export const steps = [
    { label: "Account", icon: UserRound },
    { label: "Profile", icon: UserPlus },
    { label: "Location", icon: MapPin },
    { label: "Background", icon: BriefcaseBusiness },
    { label: "Review", icon: CheckCircle2 },
] as const;
