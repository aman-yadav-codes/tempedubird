export type TrackerTriggerType =
    | "page_view"
    | "enroll"
    | "contact"
    | "demo"
    | "callback"
    | "enquiry";

export interface TrackerSettings {
    tracking_enabled: boolean;
    tracker_update_interval_minutes: number;
}

export interface CreateVisitorSessionData {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    firstPageUrl?: string | null;
    currentPageUrl?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmTerm?: string | null;
    utmContent?: string | null;
}

export interface TrackVisitorActivityData {
    trackingToken: string;
    pageUrl: string;
    pageTitle?: string | null;
    triggerType: TrackerTriggerType;
    updateOnly?: boolean;
}
