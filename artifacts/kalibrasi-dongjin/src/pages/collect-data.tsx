import { CalendarDays, Download, Eye, FileText, Plus, Printer, Save, Search, Send, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

type ReportMode = "daily" | "weekly" | "monthly";
type CollectStatus = "DRAFT" | "SUBMITTED" | "REVIEWED" | "RETURNED";
type Condition = "GOOD" | "WARNING" | "PROBLEM";

type CollectItem = {
  id: string;
  date: string;
  pic: string;
  plantArea: string;
  subArea: string;
  equipment: string;
  activityType: string;
  collectType: string;
  readingValue: string;
  unit: string;
  description: string;
  condition: Condition;
  status: CollectStatus;
  manpower: string;
  durationHours: string;
  result: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
};

type CollectSummary = {
  total: number;
  good: number;
  warning: number;
  problem: number;
  submitted: number;
  reviewed: number;
};

const STORAGE_KEY = "instrument-dji.pic-collect-report.items.v1";
const DRAFT_KEY = "instrument-dji.pic-collect-report.draft.v1";

const plantAreas = [
  "HYPO PROCESS",
  "HYDRAZINE",
  "HDCA",
  "E-PROCESS",
  "PANNEVISE DRYING",
  "PE - MIXING",
  "ZET O MILL",
  "ADCA MILLING",
  "OBSH TSH",
  "REFRIGERATOR",
  "WWT",
  "DEMIN WATER",
  "CCTV",
  "DCS PC",
  "GAS DETECTOR",
  "UPS",
  "OTHER",
];

const subAreaOptions: Record<string, string[]> = {
  "HYPO PROCESS": ["HYPO PROCESS", "RAW MATERIAL", "REACTION", "STORAGE", "UTILITY"],
  "HYDRAZINE": [
    "HYDRAZINE 1 - DISTILLATION",
    "HYDRAZINE 1 - HYDROLYSIS",
    "HYDRAZINE 1 - RAW MATERIAL",
    "HYDRAZINE 1 - RECOVERY PROCESS",
    "HYDRAZINE 1 - SEPARATION",
    "HYDRAZINE 1 - SYNTHESIS",
    "HYDRAZINE 2 - DISTILLATION",
    "HYDRAZINE 2 - HYDROLYSIS",
    "HYDRAZINE 2 - RAW MATERIAL",
    "HYDRAZINE 2 - RECOVERY PROCESS",
    "HYDRAZINE 2 - SEPARATION",
    "HYDRAZINE 2 - SYNTHESIS",
    "HYDRAZINE 80%",
  ],
  "HDCA": [
    "HDCA CONTINUOUS PROCESS",
    "HDCA BATCH PROCESS",
    "NH3 RECOVERY PROCESS",
    "HDCA PANNEVISE",
    "STORAGE TANK & DISSOLVER",
    "WTR COOLING PROCESS",
  ],
  "E-PROCESS": [
    "AGING & HCL RECOVERY #1",
    "AGING & HCL RECOVERY #2",
    "AGING PLANT",
    "REACTION #1",
    "REACTION #2",
  ],
  "PANNEVISE DRYING": ["PANNEVISE 5", "PANNEVISE 6", "PANNEVISE 7", "PANNEVISE 8", "OLD / NEW DRYING"],
  "PE - MIXING": ["SUPER MIXER A-B", "SUPER MIXER C", "PE-SP MIXER"],
  "ZET O MILL": ["ZET O MILL - 1", "ZET O MILL - 2", "ZET O MILL - 3", "ZET O MILL - 4", "ZET O MILL - 5", "ZET O MILL - 6"],
  "ADCA MILLING": ["QLD-1", "QLD-2", "QLD-3 / HOSOKAWA", "QLD-4", "MILLING SUPPORT"],
  "OBSH TSH": ["REAKTOR", "OBSH - DRYING", "OBSH - MILLING", "SCRUBBER"],
  "REFRIGERATOR": ["REFRIGERATOR", "TANGKI BRINE", "HYPO SIRKULASI", "COOLING WATER"],
  "WWT": ["WWT", "LIMBAH OUTLET", "PUMP AREA", "PANEL WWT"],
  "DEMIN WATER": ["DEMIN WATER", "PANEL DEMIN", "PUMP DEMIN", "TANK DEMIN"],
  "CCTV": ["PRODUCTION", "BEA CUKAI", "LIMBAH OUTLET", "GATE / LOADING"],
  "DCS PC": ["SERVER / DATABASE", "HYDRAZINE", "HDCA, HYPO, E-PROCESS", "OPERATOR STATION"],
  "GAS DETECTOR": ["GAS DETECTOR CL2", "GAS DETECTOR NH3", "FIELD SENSOR", "DCS ALARM"],
  "UPS": ["HYDRAZINE", "HDCA, HYPO, E-PROCESS", "BATTERY", "BACKUP POWER"],
  "OTHER": ["OTHER"],
};

const collectTypes = [
  "Reading / Actual Value",
  "Condition Check",
  "Problem Finding",
  "Work Result",
  "Follow Up",
  "Spare Part / Material",
  "Man Power",
  "Downtime / Duration",
  "Photo / Evidence Note",
];

const activityTypes = [
  "Preventive",
  "Corrective",
  "Calibration",
  "Inspection",
  "Troubleshooting",
  "Collect Data",
  "Support Production",
  "Other",
];

const conditionOptions: Array<{ value: Condition; label: string }> = [
  { value: "GOOD", label: "Good / Normal" },
  { value: "WARNING", label: "Warning / Perlu Monitoring" },
  { value: "PROBLEM", label: "Problem / Perlu Tindakan" },
];

const statusLabels: Record<CollectStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
  RETURNED: "Returned",
};

const conditionLabels: Record<Condition, string> = {
  GOOD: "Good",
  WARNING: "Warning",
  PROBLEM: "Problem",
};

const conditionClass: Record<Condition, string> = {
  GOOD: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  WARNING: "border-yellow-500 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
  PROBLEM: "border-red-500 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function currentMonth() {
  return todayJakarta().slice(0, 7);
}

function currentWeekStart() {
  const date = new Date(`${todayJakarta()}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthEnd(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatMonth(value: string) {
  if (!value) return "-";
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

function userDisplayName(user: { name?: string | null; username?: string | null } | null | undefined) {
  return user?.name || user?.username || "Current User";
}

function firstSubArea(plantArea: string) {
  return subAreaOptions[plantArea]?.[0] ?? "OTHER";
}

function normalizeSubArea(plantArea: string, subArea: string) {
  const options = subAreaOptions[plantArea] ?? ["OTHER"];
  return options.includes(subArea) ? subArea : options[0];
}

function collectTypeHelp(type: string) {
  switch (type) {
    case "Reading / Actual Value":
      return "Isi nilai aktual seperti temperature, pressure, level, flow, mA, %RH, voltage, runtime, atau reading lain.";
    case "Condition Check":
      return "Isi hasil kondisi equipment: normal, abnormal, noise, leak, loose, dirty, alarm, dan sejenisnya.";
    case "Problem Finding":
      return "Isi temuan masalah yang perlu ditindaklanjuti.";
    case "Work Result":
      return "Isi hasil pekerjaan yang sudah dilakukan.";
    case "Follow Up":
      return "Isi rencana tindak lanjut, PIC berikutnya, atau target penyelesaian.";
    case "Spare Part / Material":
      return "Isi kebutuhan spare part/material dan ketersediaannya.";
    case "Man Power":
      return "Isi jumlah orang atau kebutuhan manpower.";
    case "Downtime / Duration":
      return "Isi lama pekerjaan/downtime.";
    default:
      return "Isi data pendukung atau evidence dalam bentuk catatan.";
  }
}

function newDraft(pic: string): CollectItem {
  const now = new Date().toISOString();
  return {
    id: makeId("collect"),
    date: todayJakarta(),
    pic,
    plantArea: "HYPO PROCESS",
    subArea: firstSubArea("HYPO PROCESS"),
    equipment: "",
    activityType: "Collect Data",
    collectType: "Reading / Actual Value",
    readingValue: "",
    unit: "",
    description: "",
    condition: "GOOD",
    status: "DRAFT",
    manpower: "1",
    durationHours: "",
    result: "",
    remark: "",
    createdAt: now,
    updatedAt: now,
  };
}

function loadItems(): CollectItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveItems(items: CollectItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadDraft(pic: string): CollectItem {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CollectItem;
      return { ...parsed, pic };
    }
  } catch {
    // ignore
  }
  return newDraft(pic);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function summarize(items: CollectItem[]): CollectSummary {
  return items.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.condition === "GOOD") acc.good += 1;
      if (item.condition === "WARNING") acc.warning += 1;
      if (item.condition === "PROBLEM") acc.problem += 1;
      if (item.status === "SUBMITTED") acc.submitted += 1;
      if (item.status === "REVIEWED") acc.reviewed += 1;
      return acc;
    },
    { total: 0, good: 0, warning: 0, problem: 0, submitted: 0, reviewed: 0 },
  );
}

function groupBy<T>(items: T[], keyer: (item: T) => string) {
  return items.reduce((acc, item) => {
    const key = keyer(item) || "-";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export default function CollectDataPage() {
  const { user } = useAuth();
  const currentUserName = userDisplayName(user);

  const [mode, setMode] = useState<ReportMode>("daily");
  const [items, setItems] = useState<CollectItem[]>(() => loadItems());
  const [draft, setDraft] = useState<CollectItem>(() => loadDraft(currentUserName));
  const [selectedDate, setSelectedDate] = useState(todayJakarta());
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [searchTerm, setSearchTerm] = useState("");
  const [viewedItem, setViewedItem] = useState<CollectItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const weekEnd = addDays(weekStart, 6);
  const monthStart = `${selectedMonth}-01`;
  const monthFinish = monthEnd(selectedMonth);

  const baseFiltered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const byMode =
        mode === "daily"
          ? item.date === selectedDate
          : mode === "weekly"
            ? item.date >= weekStart && item.date <= weekEnd
            : item.date >= monthStart && item.date <= monthFinish;

      if (!byMode) return false;
      if (!query) return true;

      return [
        item.date,
        item.pic,
        item.plantArea,
        item.subArea,
        item.equipment,
        item.activityType,
        item.collectType,
        item.readingValue,
        item.unit,
        item.description,
        item.condition,
        item.status,
        item.result,
        item.remark,
      ].join(" ").toLowerCase().includes(query);
    });
  }, [items, mode, selectedDate, weekStart, weekEnd, monthStart, monthFinish, searchTerm]);

  const summary = useMemo(() => summarize(baseFiltered), [baseFiltered]);
  const groupedByDate = useMemo(() => groupBy(baseFiltered, (item) => item.date), [baseFiltered]);
  const groupedByArea = useMemo(() => groupBy(baseFiltered, (item) => item.plantArea), [baseFiltered]);

  const printTitle =
    mode === "daily"
      ? `PIC COLLECT REPORT - DAILY (${formatDate(selectedDate)})`
      : mode === "weekly"
        ? `PIC COLLECT REPORT - WEEKLY (${formatDate(weekStart)} - ${formatDate(weekEnd)})`
        : `PIC COLLECT REPORT - MONTHLY (${formatMonth(selectedMonth)})`;

  function updateDraft(patch: Partial<CollectItem>) {
    setDraft((current) => {
      const next = { ...current, ...patch, pic: currentUserName, updatedAt: new Date().toISOString() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }

  function resetDraft() {
    const fresh = newDraft(currentUserName);
    setDraft(fresh);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(fresh));
  }

  function validateDraft() {
    if (!draft.plantArea.trim()) return "Plant Area wajib diisi.";
    if (!draft.subArea.trim()) return "Sub Area wajib dipilih.";
    if (!draft.equipment.trim()) return "Equipment wajib diisi.";
    if (!draft.description.trim() && !draft.readingValue.trim() && !draft.result.trim()) return "Minimal isi Description, Reading Value, atau Result.";
    if (draft.condition !== "GOOD" && !draft.remark.trim()) return "Remark wajib untuk condition Warning/Problem.";
    return "";
  }

  function saveDraft() {
    const error = validateDraft();
    if (error) {
      setMessage(error);
      return;
    }

    const now = new Date().toISOString();
    const normalized: CollectItem = {
      ...draft,
      pic: currentUserName,
      status: "DRAFT",
      updatedAt: now,
      createdAt: draft.createdAt || now,
    };

    const next = [normalized, ...items.filter((item) => item.id !== normalized.id)];
    setItems(next);
    saveItems(next);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(normalized));
    setMessage("Collect Data tersimpan sebagai Draft.");
  }

  function submitDraft() {
    const error = validateDraft();
    if (error) {
      setMessage(error);
      return;
    }

    const now = new Date().toISOString();
    const normalized: CollectItem = {
      ...draft,
      pic: currentUserName,
      status: "SUBMITTED",
      updatedAt: now,
      createdAt: draft.createdAt || now,
    };

    const next = [normalized, ...items.filter((item) => item.id !== normalized.id)];
    setItems(next);
    saveItems(next);
    setMessage("Collect Data berhasil disubmit ke Collect Report.");
    resetDraft();
  }

  function loadItem(item: CollectItem) {
    setDraft(item);
    setViewedItem(null);
    setMode("daily");
    setSelectedDate(item.date);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteItem(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    saveItems(next);
    if (viewedItem?.id === id) setViewedItem(null);
  }

  function updateItemStatus(id: string, status: CollectStatus) {
    const next = items.map((item) => (item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    setItems(next);
    saveItems(next);
  }

  function printReport() {
    document.body.classList.add("collect-report-print-mode");
    window.print();
    window.setTimeout(() => document.body.classList.remove("collect-report-print-mode"), 500);
  }

  function exportCsv() {
    const headers = [
      "Date",
      "PIC",
      "Plant Area",
      "Sub Area",
      "Equipment",
      "Activity Type",
      "Collect Type",
      "Reading Value",
      "Unit",
      "Description",
      "Condition",
      "Status",
      "Manpower",
      "Duration Hours",
      "Result",
      "Remark",
    ];
    const rows = baseFiltered.map((item) => [
      formatDate(item.date),
      item.pic,
      item.plantArea,
      item.subArea,
      item.equipment,
      item.activityType,
      item.collectType,
      item.readingValue,
      item.unit,
      item.description,
      conditionLabels[item.condition],
      statusLabels[item.status],
      item.manpower,
      item.durationHours,
      item.result,
      item.remark,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    downloadTextFile(`pic-collect-report-${mode}-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-6 collect-report-page">
      <section className="rounded-3xl border bg-white p-5 shadow-sm print-hide dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              <FileText className="h-4 w-4" /> PIC Collect Report
            </div>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white">Collect Data / PIC Report</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-300">
              Input harian oleh PIC/Teknisi. Report bisa dilihat harian, mingguan, dan bulanan.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={printReport} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Printer className="mr-2 inline h-4 w-4" />Print
            </button>
            <button onClick={exportCsv} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Download className="mr-2 inline h-4 w-4" />Export
            </button>
            <button onClick={submitDraft} className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
              <Send className="mr-2 inline h-4 w-4" />Submit
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-2 rounded-2xl bg-slate-50 p-2 dark:bg-slate-800 sm:grid-cols-3">
          {([
            ["daily", "Harian"],
            ["weekly", "Mingguan"],
            ["monthly", "Bulanan"],
          ] as Array<[ReportMode, string]>).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`rounded-xl px-4 py-3 text-sm font-black transition ${mode === key ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <label className="collect-field-label">
            <span>Date</span>
            <input type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} className="collect-control" />
          </label>
          <label className="collect-field-label">
            <span>PIC</span>
            <input value={currentUserName} readOnly className="collect-control bg-slate-50 font-bold dark:bg-slate-800" />
          </label>
          <label className="collect-field-label">
            <span>Plant Area</span>
            <select
              value={draft.plantArea}
              onChange={(event) => {
                const plantArea = event.target.value;
                updateDraft({ plantArea, subArea: firstSubArea(plantArea) });
              }}
              className="collect-control"
            >
              {plantAreas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>
          <label className="collect-field-label">
            <span>Sub Area</span>
            <select value={normalizeSubArea(draft.plantArea, draft.subArea)} onChange={(event) => updateDraft({ subArea: event.target.value })} className="collect-control">
              {(subAreaOptions[draft.plantArea] ?? ["OTHER"]).map((subArea) => <option key={subArea} value={subArea}>{subArea}</option>)}
            </select>
          </label>
        </div>

        {message ? (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${message.includes("wajib") ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {message}
          </div>
        ) : null}
      </section>

      <section className="print-hide rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-700" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Input Collect Data</h2>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="collect-field-label">
            <span>Equipment</span>
            <input value={draft.equipment} onChange={(event) => updateDraft({ equipment: event.target.value })} placeholder="Nama equipment / tag / instrument" className="collect-control" />
          </label>
          <label className="collect-field-label">
            <span>Activity Type</span>
            <select value={draft.activityType} onChange={(event) => updateDraft({ activityType: event.target.value })} className="collect-control">
              {activityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_160px]">
            <label className="collect-field-label">
              <span>Apa yang dicollect?</span>
              <select value={draft.collectType} onChange={(event) => updateDraft({ collectType: event.target.value })} className="collect-control">
                {collectTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="collect-field-label">
              <span>Reading / Value</span>
              <input value={draft.readingValue} onChange={(event) => updateDraft({ readingValue: event.target.value })} placeholder="Contoh: 25.3 / OK / 4.02" className="collect-control" />
            </label>
            <label className="collect-field-label">
              <span>Unit</span>
              <input value={draft.unit} onChange={(event) => updateDraft({ unit: event.target.value })} placeholder="°C, bar, %, mA" className="collect-control" />
            </label>
          </div>
          <div className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-xs font-semibold text-blue-800 dark:bg-slate-900/50 dark:text-blue-100">
            {collectTypeHelp(draft.collectType)}
          </div>
        </div>

        <label className="collect-field-label mt-4">
          <span>Description / Detail</span>
          <textarea
            value={draft.description}
            onChange={(event) => updateDraft({ description: event.target.value })}
            placeholder="Jelaskan aktivitas / data yang dikumpulkan / temuan..."
            className="min-h-24 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="collect-field-label">
            <span>Condition</span>
            <select value={draft.condition} onChange={(event) => updateDraft({ condition: event.target.value as Condition })} className={`collect-control font-black ${conditionClass[draft.condition]}`}>
              {conditionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="collect-field-label">
            <span>Man Power</span>
            <input type="number" min="0" value={draft.manpower} onChange={(event) => updateDraft({ manpower: event.target.value })} className="collect-control" />
          </label>
          <label className="collect-field-label">
            <span>Duration Hours</span>
            <input type="number" min="0" step="0.5" value={draft.durationHours} onChange={(event) => updateDraft({ durationHours: event.target.value })} placeholder="Contoh: 2" className="collect-control" />
          </label>
          <label className="collect-field-label">
            <span>Status</span>
            <input value={statusLabels[draft.status]} readOnly className="collect-control bg-slate-50 font-bold dark:bg-slate-800" />
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="collect-field-label">
            <span>Result</span>
            <textarea
              value={draft.result}
              onChange={(event) => updateDraft({ result: event.target.value })}
              placeholder="Hasil pengecekan / data angka / kesimpulan..."
              className="min-h-20 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="collect-field-label">
            <span>Remark {draft.condition !== "GOOD" ? "(wajib)" : "(opsional)"}</span>
            <textarea
              value={draft.remark}
              onChange={(event) => updateDraft({ remark: event.target.value })}
              placeholder={draft.condition !== "GOOD" ? "Isi alasan warning/problem dan rencana follow-up..." : "Catatan tambahan jika perlu..."}
              className="min-h-20 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={resetDraft} className="rounded-2xl border px-5 py-3 text-sm font-black dark:border-slate-600 dark:text-white">Reset</button>
          <button onClick={saveDraft} className="rounded-2xl border px-5 py-3 text-sm font-black dark:border-slate-600 dark:text-white">
            <Save className="mr-2 inline h-4 w-4" />Save Draft
          </button>
          <button onClick={submitDraft} className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
            <Send className="mr-2 inline h-4 w-4" />Submit
          </button>
        </div>
      </section>

      <section className="print-hide rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <label className="collect-field-label">
            <span>Search Report</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari PIC, area, equipment, description, result, remark..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </div>
          </label>

          {mode === "daily" ? (
            <label className="collect-field-label"><span>Daily Date</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="collect-control" /></label>
          ) : mode === "weekly" ? (
            <label className="collect-field-label"><span>Week Start</span><input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="collect-control" /></label>
          ) : (
            <label className="collect-field-label"><span>Month</span><input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="collect-control" /></label>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-6">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Good" value={summary.good} />
          <SummaryCard label="Warning" value={summary.warning} />
          <SummaryCard label="Problem" value={summary.problem} />
          <SummaryCard label="Submitted" value={summary.submitted} />
          <SummaryCard label="Reviewed" value={summary.reviewed} />
        </div>
      </section>

      <section className="print-hide rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b p-4 dark:border-slate-700">
          <h2 className="font-black text-slate-900 dark:text-white">
            {mode === "daily" ? "Daily Report" : mode === "weekly" ? "Weekly Report" : "Monthly Report"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">{baseFiltered.length} data ditemukan.</p>
        </div>

        {baseFiltered.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500 dark:text-slate-300">Belum ada collect data untuk filter ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">PIC</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Equipment</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Collect</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {baseFiltered.map((item) => (
                  <tr key={item.id} className="border-b align-top dark:border-slate-700">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{item.pic}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{item.plantArea}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">{item.subArea}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{item.equipment}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{item.activityType}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{item.collectType}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">{[item.readingValue, item.unit].filter(Boolean).join(" ") || "-"}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`rounded-full border px-3 py-1 text-xs font-black ${conditionClass[item.condition]}`}>{conditionLabels[item.condition]}</span></td>
                    <td className="px-4 py-3">
                      <select value={item.status} onChange={(event) => updateItemStatus(item.id, event.target.value as CollectStatus)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        <option value="DRAFT">Draft</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="REVIEWED">Reviewed</option>
                        <option value="RETURNED">Returned</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 max-w-[280px] whitespace-pre-wrap text-slate-600 dark:text-slate-200">{item.result || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewedItem(item)} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950">
                          <Eye className="mr-1 inline h-3 w-3" />View
                        </button>
                        <button onClick={() => loadItem(item)} className="rounded-xl border px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800">Load</button>
                        <button onClick={() => deleteItem(item.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b p-4 print-hide dark:border-slate-700">
          <h2 className="font-black text-slate-900 dark:text-white">Preview Print / Export</h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">Preview ini otomatis dipakai saat Print.</p>
        </div>

        <div className="collect-report-scroll">
          <div className="collect-report-print-area">
            <div className="collect-report-paper">
              <header className="collect-report-header">
                <div>
                  <h2>{printTitle}</h2>
                  <p>Data collection summary for Instrument Calibration System</p>
                </div>
                <table className="collect-report-approval">
                  <thead>
                    <tr><th>PREPARED</th><th>FOREMAN</th><th>SECT CHIEF</th></tr>
                  </thead>
                  <tbody><tr><td>{currentUserName}</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>
                </table>
              </header>

              <section className="collect-report-meta">
                <div><b>PERIOD</b><span>{mode === "daily" ? formatDate(selectedDate) : mode === "weekly" ? `${formatDate(weekStart)} - ${formatDate(weekEnd)}` : formatMonth(selectedMonth)}</span></div>
                <div><b>TYPE</b><span>{mode.toUpperCase()}</span></div>
                <div><b>TOTAL DATA</b><span>{summary.total}</span></div>
              </section>

              <section className="collect-report-summary">
                <div><b>GOOD</b><span>{summary.good}</span></div>
                <div><b>WARNING</b><span>{summary.warning}</span></div>
                <div><b>PROBLEM</b><span>{summary.problem}</span></div>
                <div><b>SUBMITTED</b><span>{summary.submitted}</span></div>
                <div><b>REVIEWED</b><span>{summary.reviewed}</span></div>
              </section>

              {mode !== "daily" ? (
                <section className="collect-report-group">
                  <h3>SUMMARY BY DATE</h3>
                  <table>
                    <thead><tr><th>Date</th><th>Total</th><th>Good</th><th>Warning</th><th>Problem</th></tr></thead>
                    <tbody>
                      {Object.entries(groupedByDate).map(([date, list]) => {
                        const itemSummary = summarize(list);
                        return <tr key={date}><td>{formatDate(date)}</td><td>{itemSummary.total}</td><td>{itemSummary.good}</td><td>{itemSummary.warning}</td><td>{itemSummary.problem}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </section>
              ) : null}

              {mode === "monthly" ? (
                <section className="collect-report-group">
                  <h3>SUMMARY BY AREA</h3>
                  <table>
                    <thead><tr><th>Plant Area</th><th>Total</th><th>Good</th><th>Warning</th><th>Problem</th></tr></thead>
                    <tbody>
                      {Object.entries(groupedByArea).map(([area, list]) => {
                        const itemSummary = summarize(list);
                        return <tr key={area}><td>{area}</td><td>{itemSummary.total}</td><td>{itemSummary.good}</td><td>{itemSummary.warning}</td><td>{itemSummary.problem}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </section>
              ) : null}

              <table className="collect-report-table">
                <thead>
                  <tr>
                    <th>NO</th>
                    <th>DATE</th>
                    <th>PIC</th>
                    <th>PLANT AREA</th>
                    <th>SUB AREA</th>
                    <th>EQUIPMENT</th>
                    <th>ACTIVITY</th>
                    <th>COLLECT TYPE</th>
                    <th>VALUE</th>
                    <th>DESCRIPTION</th>
                    <th>COND</th>
                    <th>RESULT / REMARK</th>
                  </tr>
                </thead>
                <tbody>
                  {baseFiltered.length === 0 ? (
                    <tr><td colSpan={12}>Tidak ada data.</td></tr>
                  ) : baseFiltered.map((item, index) => (
                    <tr key={`print-${item.id}`}>
                      <td>{index + 1}</td>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.pic}</td>
                      <td>{item.plantArea}</td>
                      <td>{item.subArea}</td>
                      <td>{item.equipment}</td>
                      <td>{item.activityType}</td>
                      <td>{item.collectType}</td>
                      <td>{[item.readingValue, item.unit].filter(Boolean).join(" ") || "-"}</td>
                      <td>{item.description || "-"}</td>
                      <td>{conditionLabels[item.condition]}</td>
                      <td>{item.result || item.remark || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <footer className="collect-report-footer">
                <span>Collect Report</span>
                <span>PT. DONGJIN INDONESIA</span>
                <span>{new Date().toLocaleString()}</span>
              </footer>
            </div>
          </div>
        </div>
      </section>

      {viewedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">Detail Collect Data</h3>
                <p className="text-sm text-slate-500 dark:text-slate-300">{formatDate(viewedItem.date)} / {viewedItem.equipment}</p>
              </div>
              <button onClick={() => setViewedItem(null)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <Detail label="PIC" value={viewedItem.pic} />
              <Detail label="Plant Area" value={viewedItem.plantArea} />
              <Detail label="Sub Area" value={viewedItem.subArea} />
              <Detail label="Equipment" value={viewedItem.equipment} />
              <Detail label="Activity" value={viewedItem.activityType} />
              <Detail label="Collect Type" value={viewedItem.collectType} />
              <Detail label="Reading / Value" value={[viewedItem.readingValue, viewedItem.unit].filter(Boolean).join(" ")} />
              <Detail label="Description" value={viewedItem.description} />
              <Detail label="Condition" value={conditionLabels[viewedItem.condition]} />
              <Detail label="Status" value={statusLabels[viewedItem.status]} />
              <Detail label="Result" value={viewedItem.result} />
              <Detail label="Remark" value={viewedItem.remark} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="text-xs font-black uppercase text-slate-500 dark:text-slate-300">{label}</div>
      <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
      <div className="whitespace-pre-wrap font-semibold text-slate-900 dark:text-white">{value || "-"}</div>
    </div>
  );
}
