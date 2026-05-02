export type IssueStatus = "OPEN" | "PROGRESS" | "CLOSED";
export type IssueCondition = "C" | "D" | "E";
export type IssueSource = "DCS/PANEL" | "FIELD";

export type PreventiveIssue = {
  id: string;
  date: string;
  plantArea: string;
  subArea: string;
  equipmentService: string;
  tagNo: string;
  source: IssueSource;
  condition: IssueCondition;
  remark: string;
  checkedBy: string;
  status: IssueStatus;
};

export const ISSUE_STORAGE_KEY = "instrument-dji.preventive.issues";
export const ISSUE_UPDATED_EVENT = "instrument-dji.issue-updated";

export const fallbackIssues: PreventiveIssue[] = [
  { id: "demo-1", date: "2026-03-04", plantArea: "HYDRAZINE", subArea: "DISTILLATION", equipmentService: "LEVEL DC-1022", tagNo: "LIA-1202", source: "DCS/PANEL", condition: "C", remark: "Indicator kurang stabil", checkedBy: "Demo User", status: "OPEN" },
  { id: "demo-2", date: "2026-03-04", plantArea: "HYDRAZINE", subArea: "DISTILLATION", equipmentService: "DC-1021 TO WWT", tagNo: "LIC-1201", source: "DCS/PANEL", condition: "E", remark: "No signal dari DCS", checkedBy: "Demo User", status: "OPEN" },
  { id: "demo-3", date: "2026-03-04", plantArea: "HYDRAZINE", subArea: "DISTILLATION", equipmentService: "DC-1021 TO WWT", tagNo: "LIC-1201", source: "FIELD", condition: "D", remark: "No signal dari DCS", checkedBy: "Demo User", status: "PROGRESS" },
  { id: "demo-4", date: "2026-03-05", plantArea: "HDCA", subArea: "HDCA BATCH PROCESS", equipmentService: "R-4021 TO COND", tagNo: "TIC-4021", source: "FIELD", condition: "C", remark: "Pembacaan mulai drifting", checkedBy: "Demo User", status: "CLOSED" },
  { id: "demo-5", date: "2026-03-06", plantArea: "HYPO", subArea: "HYPO PROCESS", equipmentService: "CL2 TO T-4502", tagNo: "FICQ-4502", source: "DCS/PANEL", condition: "D", remark: "Display panel intermittent", checkedBy: "Demo User", status: "OPEN" },
];

export function loadPreventiveIssues() {
  try {
    const raw = localStorage.getItem(ISSUE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PreventiveIssue[]) : [];
    return parsed.length ? parsed : fallbackIssues;
  } catch {
    return fallbackIssues;
  }
}

export function savePreventiveIssues(issues: PreventiveIssue[]) {
  localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issues));
  window.dispatchEvent(new CustomEvent(ISSUE_UPDATED_EVENT));
}
