import { CheckCircle, Download, Eye, Printer, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dongjinLogo from "@/assets/logo-dongjin.png";
import { useAuth } from "@/contexts/auth-context";
import { hasRole, isViewOnly, permissions } from "@/lib/permissions";

type Item = {
  label: string;
  unit?: string;
};

type ShiftKey = "shift1" | "shift2" | "shift3";
type CellMap = Record<string, string>;

type ShiftMeta = {
  group: string;
  remarks: string;
  name: string;
};

type LogsheetHistoryRecord = {
  id: string;
  date: string;
  cells: CellMap;
  meta: Record<ShiftKey, ShiftMeta>;
  savedBy: string;
  savedAt: string;
};

const CONDITION_OPTIONS = [
  { value: "", label: "Pilih kondisi" },
  { value: "√", label: "√ - Good Condition" },
  { value: "△", label: "△ - Repair Needed" },
  { value: "X", label: "X - Not Good" },
];

const GROUP_OPTIONS = ["-", "A", "B", "C", "D", "Non Shift"];

const shiftRows: Array<{ key: ShiftKey; label: string; time: string }> = [
  { key: "shift1", label: "SHIFT I", time: "23.00 - 07.00" },
  { key: "shift2", label: "SHIFT II", time: "07.00 - 15.00" },
  { key: "shift3", label: "SHIFT III", time: "15.00 - 23.00" },
];

const blockOne: Item[] = [
  { label: "DISTILLATION", unit: "HH-1" },
  { label: "HYDROLYSIS", unit: "HH-1" },
  { label: "RAW MATERIAL", unit: "HH-1" },
  { label: "RECOVERY PROCESS", unit: "HH-1" },
  { label: "SEPARATION", unit: "HH-1" },
  { label: "SYNTHESIS", unit: "HH-1" },
  { label: "DISTILLATION", unit: "HH-2" },
  { label: "HYDROLYSIS", unit: "HH-2" },
  { label: "RAW MATERIAL", unit: "HH-2" },
  { label: "RECOVERY PROCESS", unit: "HH-2" },
  { label: "SEPARATION", unit: "HH-2" },
  { label: "SYNTHESIS", unit: "HH-2" },
  { label: "HH-80%" },
  { label: "BATCH PROCESS", unit: "HDCA" },
];

const blockTwo: Item[] = [
  { label: "CONTINUOUS PROCESS-1", unit: "HDCA" },
  { label: "CONTINUOUS PROCESS-2", unit: "HDCA" },
  { label: "CONTINUOUS PROCESS-3", unit: "HDCA" },
  { label: "HYPO-1", unit: "HDCA" },
  { label: "HYPO-2", unit: "HDCA" },
  { label: "NH3 RCVRY PROCESS", unit: "HDCA" },
  { label: "PANNEVISE", unit: "HDCA" },
  { label: "STORAGE TANK DSLVR", unit: "HDCA" },
  { label: "WTR COOLING PROCESS", unit: "HDCA" },
  { label: "AGING & HCL #1", unit: "E-PROCESS" },
  { label: "AGING & HCL #2", unit: "E-PROCESS" },
  { label: "AGING PLANT", unit: "E-PROCESS" },
  { label: "REACTION #1", unit: "E-PROCESS" },
  { label: "REACTION #2", unit: "E-PROCESS" },
];

const blockThree: Item[] = [
  { label: "BATCH PROCESS", unit: "ADCA" },
  { label: "PANNEVISE", unit: "ADCA" },
  { label: "DRYING", unit: "ADCA" },
  { label: "QLD-1", unit: "ADCA" },
  { label: "QLD-2", unit: "ADCA" },
  { label: "QLD-3", unit: "ADCA" },
  { label: "PE-SP MIXER A/B/C", unit: "ADCA" },
  { label: "OBSH" },
  { label: "BOILER" },
  { label: "HOSOKAWA" },
  { label: "WWT" },
];

const blocks = [
  { key: "block1", title: "HH-1 / HH-2 / HDCA", items: blockOne },
  { key: "block2", title: "HDCA / E-PROCESS", items: blockTwo },
  { key: "block3", title: "ADCA / Utility", items: blockThree },
] as const;

const initialMeta: Record<ShiftKey, ShiftMeta> = {
  shift1: { group: "-", remarks: "", name: "" },
  shift2: { group: "-", remarks: "", name: "" },
  shift3: { group: "-", remarks: "", name: "" },
};

function makeKey(block: string, shift: ShiftKey, index: number) {
  return `${block}.${shift}.${index}`;
}

function formatDateForInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDateForPrint(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function conditionLabel(value: string) {
  if (value === "√") return "GOOD CONDITION";
  if (value === "△") return "REPAIR NEEDED";
  if (value === "X") return "NOT GOOD";
  return "";
}

function countFilledByShift(cells: CellMap, shift: ShiftKey) {
  return blocks.reduce((sum, block) => {
    return sum + block.items.filter((_, index) => cells[makeKey(block.key, shift, index)]).length;
  }, 0);
}

function shiftIsFilled(cells: CellMap, meta: Record<ShiftKey, ShiftMeta>, shift: ShiftKey) {
  return Boolean(meta[shift]?.name || meta[shift]?.remarks || meta[shift]?.group !== "-" || countFilledByShift(cells, shift) > 0);
}

function mergeDailyCells(oldCells: CellMap, newCells: CellMap, shift: ShiftKey) {
  const next = { ...oldCells };
  blocks.forEach((block) => {
    block.items.forEach((_, index) => {
      const key = makeKey(block.key, shift, index);
      next[key] = newCells[key] ?? "";
    });
  });
  return next;
}

function mergeDailyMeta(oldMeta: Record<ShiftKey, ShiftMeta>, newMeta: Record<ShiftKey, ShiftMeta>, shift: ShiftKey) {
  return {
    ...oldMeta,
    [shift]: {
      ...newMeta[shift],
    },
  };
}

function userDisplayName(user: { name?: string | null; username?: string | null } | null | undefined) {
  return user?.name || user?.username || "User Login";
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function LogsheetShiftPage() {
  const { user } = useAuth();
  const canView = hasRole(user?.role, permissions.logsheetShift);
  const readOnly = isViewOnly(user?.role);
  const currentUserName = userDisplayName(user);
  const storageKey = `dongjin-logsheet-shift-${user?.username ?? user?.name ?? "user"}`;
  const historyKey = "dongjin-logsheet-shift-history";

  const [date, setDate] = useState(() => formatDateForInput(new Date()));
  const [activeShift, setActiveShift] = useState<ShiftKey>("shift1");
  const [cells, setCells] = useState<CellMap>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).cells ?? {} : {};
    } catch {
      return {};
    }
  });
  const [meta, setMeta] = useState<Record<ShiftKey, ShiftMeta>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...initialMeta, ...(JSON.parse(saved).meta ?? {}) } : initialMeta;
    } catch {
      return initialMeta;
    }
  });

  const [history, setHistory] = useState<LogsheetHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      const parsed = saved ? JSON.parse(saved) : [];
      const byDate = new Map<string, LogsheetHistoryRecord>();

      parsed.forEach((record: any) => {
        if (!record?.date) return;
        const existing = byDate.get(record.date);
        const recordCells = record.cells ?? {};
        const recordMeta = { ...initialMeta, ...(record.meta ?? {}) };

        if (!existing) {
          byDate.set(record.date, {
            id: `daily-${record.date}`,
            date: record.date,
            cells: recordCells,
            meta: recordMeta,
            savedBy: record.savedBy ?? "",
            savedAt: record.savedAt ?? new Date().toISOString(),
          });
          return;
        }

        const shift = record.shift as ShiftKey | undefined;
        byDate.set(record.date, {
          ...existing,
          cells: shift ? mergeDailyCells(existing.cells, recordCells, shift) : { ...existing.cells, ...recordCells },
          meta: shift ? mergeDailyMeta(existing.meta, recordMeta, shift) : { ...existing.meta, ...recordMeta },
          savedBy: record.savedBy ?? existing.savedBy,
          savedAt: (record.savedAt ?? "") > existing.savedAt ? record.savedAt : existing.savedAt,
        });
      });

      return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date) || b.savedAt.localeCompare(a.savedAt));
    } catch {
      return [];
    }
  });

  const [viewedRecord, setViewedRecord] = useState<LogsheetHistoryRecord | null>(null);

  useEffect(() => {
    setMeta((current) => {
      if (current[activeShift]?.name) return current;
      return { ...current, [activeShift]: { ...current[activeShift], name: currentUserName } };
    });
  }, [activeShift, currentUserName]);

  const activeShiftInfo = shiftRows.find((shift) => shift.key === activeShift) ?? shiftRows[0];

  const progress = useMemo(() => {
    const total = blocks.reduce((sum, block) => sum + block.items.length, 0);
    const filled = blocks.reduce((sum, block) => {
      return sum + block.items.filter((_, index) => cells[makeKey(block.key, activeShift, index)]).length;
    }, 0);
    return { total, filled };
  }, [activeShift, cells]);

  const previewDate = viewedRecord?.date ?? date;
  const previewCells = viewedRecord?.cells ?? cells;
  const previewMeta = viewedRecord?.meta ?? meta;

  if (!canView) {
    return <div className="rounded-3xl border bg-white p-8 shadow-sm dark:bg-slate-900 dark:text-white">Anda tidak memiliki akses ke Logsheet Shift.</div>;
  }

  const updateCell = (key: string, value: string) => {
    setCells((current) => ({ ...current, [key]: value }));
  };

  const setAllGoodForActiveShift = () => {
    setCells((current) => {
      const next = { ...current };
      blocks.forEach((block) => {
        block.items.forEach((_, index) => {
          next[makeKey(block.key, activeShift, index)] = "√";
        });
      });
      return next;
    });

    setMeta((current) => ({
      ...current,
      [activeShift]: {
        ...current[activeShift],
        name: current[activeShift].name || currentUserName,
      },
    }));
  };

  const updateMeta = (shift: ShiftKey, field: keyof ShiftMeta, value: string) => {
    setMeta((current) => ({ ...current, [shift]: { ...current[shift], [field]: value } }));
  };

  const saveDraft = () => {
    const savedAt = new Date().toISOString();
    const normalizedMeta = {
      ...meta,
      [activeShift]: {
        ...meta[activeShift],
        name: meta[activeShift].name || currentUserName,
      },
    };

    const existingDailyRecord = history.find((record) => record.date === date);

    const dailyCells = existingDailyRecord
      ? mergeDailyCells(existingDailyRecord.cells, cells, activeShift)
      : cells;

    const dailyMeta = existingDailyRecord
      ? mergeDailyMeta(existingDailyRecord.meta, normalizedMeta, activeShift)
      : normalizedMeta;

    const draftPayload = {
      date,
      activeShift,
      cells: dailyCells,
      meta: dailyMeta,
      savedBy: currentUserName,
      savedAt,
    };

    const historyRecord: LogsheetHistoryRecord = {
      id: existingDailyRecord?.id ?? `daily-${date}-${Date.now()}`,
      date,
      cells: dailyCells,
      meta: dailyMeta,
      savedBy: currentUserName,
      savedAt,
    };

    const nextHistory = [
      historyRecord,
      ...history.filter((record) => record.date !== date),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.savedAt.localeCompare(a.savedAt)).slice(0, 50);

    setCells(dailyCells);
    setMeta(dailyMeta);
    setViewedRecord(null);
    setHistory(nextHistory);
    localStorage.setItem(storageKey, JSON.stringify(draftPayload));
    localStorage.setItem(historyKey, JSON.stringify(nextHistory));

    alert(`Logsheet tanggal ${formatDateForPrint(date)} tersimpan sebagai 1 laporan harian. ${activeShiftInfo.label} sudah masuk ke rekap hari ini.`);
  };

  const viewHistory = (record: LogsheetHistoryRecord) => {
    setViewedRecord(record);
    window.setTimeout(() => {
      document.getElementById("logsheet-report-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const loadHistory = (record: LogsheetHistoryRecord) => {
    setViewedRecord(null);
    setDate(record.date);
    setCells(record.cells);
    setMeta({ ...initialMeta, ...record.meta });

    const firstFilledShift = shiftRows.find((shift) => shiftIsFilled(record.cells, record.meta, shift.key));
    setActiveShift(firstFilledShift?.key ?? "shift1");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteHistory = (id: string) => {
    const nextHistory = history.filter((record) => record.id !== id);
    if (viewedRecord?.id === id) setViewedRecord(null);
    setHistory(nextHistory);
    localStorage.setItem(historyKey, JSON.stringify(nextHistory));
  };

  const printLogsheet = () => {
    document.body.classList.add("logsheet-print-mode");
    window.print();
    window.setTimeout(() => document.body.classList.remove("logsheet-print-mode"), 500);
  };

  const exportExcel = () => {
    const html = document.querySelector(".logsheet-print-area")?.innerHTML ?? "";
    const workbook = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 4px; font-family: Arial; font-size: 10px; }
          .logsheet-doc-header { display: table; width: 100%; margin-bottom: 8px; }
          .logsheet-doc-header > * { display: table-cell; vertical-align: middle; }
          .logsheet-logo-img { width: 88px; height: auto; }
          .logsheet-select, .logsheet-web-only, select, textarea, input { display: none !important; }
          .logsheet-print-value, .logsheet-print-group, .logsheet-print-remarks { display: inline !important; }
        </style>
      </head>
      <body>${html}</body></html>`;
    downloadTextFile(`logsheet-instrument-shift-${previewDate}.xls`, workbook, "application/vnd.ms-excel;charset=utf-8");
  };

  const renderHeaderCell = (item: Item, key: string) => (
    <th key={key} className="logsheet-head-cell">
      <span>{item.label}</span>
      {item.unit ? <small>({item.unit})</small> : null}
    </th>
  );

  const renderPrintCondition = (key: string) => <span className="logsheet-print-only">{previewCells[key] || "-"}</span>;

  const renderPrintRows = (blockName: "block1" | "block2", items: Item[]) =>
    shiftRows.map((shift) => (
      <tr key={`${blockName}-${shift.key}`}>
        <td className="logsheet-shift-cell">
          <b>{shift.label}</b>
          <span>({shift.time})</span>
        </td>
        {items.map((item, index) => {
          const key = makeKey(blockName, shift.key, index);
          return (
            <td key={`${key}-${item.label}`} className="logsheet-print-cell">
              {renderPrintCondition(key)}
            </td>
          );
        })}
      </tr>
    ));

  return (
    <div className="space-y-6 logsheet-page">
      <section className="rounded-3xl border bg-white p-5 shadow-sm print-hide dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white">Logsheet Instrument Shift</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Tampilan web dibuat sederhana untuk input. Template lengkap dipakai saat Print dan Export Excel.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={printLogsheet} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Printer className="mr-2 inline h-4 w-4" />Print
            </button>
            <button onClick={exportExcel} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Download className="mr-2 inline h-4 w-4" />Export Excel
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <label className="logsheet-field-label">
            <span>Tanggal</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="logsheet-form-control" disabled={readOnly} />
          </label>
          <label className="logsheet-field-label">
            <span>Shift yang diisi</span>
            <select
              value={activeShift}
              onChange={(event) => setActiveShift(event.target.value as ShiftKey)}
              className="logsheet-form-control"
              disabled={readOnly}
            >
              {shiftRows.map((shift) => (
                <option key={shift.key} value={shift.key}>{`${shift.label} (${shift.time})`}</option>
              ))}
            </select>
          </label>
          <label className="logsheet-field-label">
            <span>Nama / Checked By</span>
            <input value={currentUserName} readOnly className="logsheet-form-control bg-slate-50 font-semibold dark:bg-slate-800" />
          </label>
          <label className="logsheet-field-label">
            <span>Grup</span>
            <select
              value={meta[activeShift].group}
              onChange={(event) => updateMeta(activeShift, "group", event.target.value)}
              className="logsheet-form-control"
              disabled={readOnly}
            >
              {GROUP_OPTIONS.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200 md:flex-row md:items-center md:justify-between">
          <div>
            Sedang mengisi <b>{activeShiftInfo.label}</b> ({activeShiftInfo.time}) oleh <b>{currentUserName}</b>. Progress: <b>{progress.filled}/{progress.total}</b> item.
          </div>
          {!readOnly ? (
            <button
              type="button"
              onClick={setAllGoodForActiveShift}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900"
            >
              <CheckCircle className="mr-2 inline h-4 w-4" />
              All in Good Condition
            </button>
          ) : null}
        </div>
      </section>

      <section className="print-hide space-y-5">
        {blocks.map((block) => (
          <div key={block.key} className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{block.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-300">Pilih kondisi untuk {activeShiftInfo.label} saja.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCells((current) => {
                        const next = { ...current };
                        block.items.forEach((_, index) => {
                          next[makeKey(block.key, activeShift, index)] = "√";
                        });
                        return next;
                      });
                    }}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                  >
                    All Good area ini
                  </button>
                ) : null}
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                  {block.items.filter((_, index) => cells[makeKey(block.key, activeShift, index)]).length}/{block.items.length}
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {block.items.map((item, index) => {
                const key = makeKey(block.key, activeShift, index);
                return (
                  <label key={`${block.key}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <span className="block text-sm font-black text-slate-900 dark:text-white">{item.label}</span>
                    {item.unit ? <span className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-300">({item.unit})</span> : <span className="mb-2 block text-xs">&nbsp;</span>}
                    <select
                      value={cells[key] ?? ""}
                      onChange={(event) => updateCell(key, event.target.value)}
                      disabled={readOnly}
                      className="logsheet-form-control w-full"
                    >
                      {CONDITION_OPTIONS.map((option) => <option key={option.value || "empty"} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <label className="logsheet-field-label">
            <span>Remarks / Temuan {activeShiftInfo.label}</span>
            <textarea
              value={meta[activeShift].remarks}
              onChange={(event) => updateMeta(activeShift, "remarks", event.target.value)}
              disabled={readOnly}
              placeholder="Tulis temuan atau catatan shift..."
              className="min-h-28 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          {!readOnly ? (
            <div className="mt-4 flex flex-col gap-2 border-t pt-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                Save akan menggabungkan {activeShiftInfo.label} ke laporan harian tanggal {formatDateForPrint(date)}.
              </p>
              <button
                type="button"
                onClick={saveDraft}
                className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800"
              >
                <Save className="mr-2 inline h-4 w-4" />
                Save ke History Harian
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="print-hide rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">History Logsheet Harian</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">1 tanggal = 1 laporan gabungan Shift I, Shift II, dan Shift III. Klik Load untuk membuka rekap harian.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {history.length} history
          </span>
        </div>

        {history.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
            Belum ada history. Klik Save setelah mengisi logsheet.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Shift Terisi</th>
                  <th className="py-2 pr-3">Grup</th>
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Last Saved</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((record) => (
                  <tr key={record.id} className="border-b dark:border-slate-700">
                    <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{formatDateForPrint(record.date)}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">
                      {shiftRows.filter((shift) => shiftIsFilled(record.cells, record.meta, shift.key)).map((shift) => shift.label.replace("SHIFT ", "S")).join(", ") || "-"}
                    </td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">
                      {shiftRows.map((shift) => `${shift.label.replace("SHIFT ", "S")}: ${record.meta[shift.key]?.group ?? "-"}`).join(" / ")}
                    </td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">
                      {shiftRows.map((shift) => `${shift.label.replace("SHIFT ", "S")}: ${record.meta[shift.key]?.name || "-"}`).join(" / ")}
                    </td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">{new Date(record.savedAt).toLocaleString()}</td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => viewHistory(record)}
                          className="rounded-xl border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950"
                        >
                          <Eye className="mr-1 inline h-3 w-3" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => loadHistory(record)}
                          className="rounded-xl border px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Load
                        </button>
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => deleteHistory(record.id)}
                            className="rounded-xl border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewedRecord ? (
        <div className="print-hide rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <b>Mode View Laporan:</b> sedang menampilkan laporan harian tanggal {formatDateForPrint(viewedRecord.date)}.
              <span className="block text-xs opacity-80">Print dan Export Excel akan memakai laporan yang sedang di-view ini.</span>
            </div>
            <button
              type="button"
              onClick={() => setViewedRecord(null)}
              className="rounded-2xl border border-blue-300 px-4 py-2 text-xs font-black hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900"
            >
              Tutup View
            </button>
          </div>
        </div>
      ) : null}

      <section id="logsheet-report-preview" className="rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b p-4 print-hide dark:border-slate-700">
          <h2 className="font-black text-slate-900 dark:text-white">{viewedRecord ? "View Laporan Harian" : "Preview Template Print / Export"}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {viewedRecord
              ? "Ini adalah laporan harian yang sudah tersimpan dari History."
              : "Bagian ini otomatis dipakai saat Print dan Export Excel."}
          </p>
        </div>
        <div className="logsheet-scroll">
          <div className="logsheet-print-area">
            <div className="logsheet-paper">
              <header className="logsheet-doc-header">
                <div className="logsheet-logo-box"><img src={dongjinLogo} alt="Dongjin" className="logsheet-logo-img" /></div>
                <h2>LOGSHEET INSTRUMENT SHIFT</h2>
                <table className="logsheet-approval">
                  <thead>
                    <tr><th colSpan={3}>APPROVAL</th></tr>
                    <tr><th>FOREMAN</th><th>SECT CHIEF</th><th>ASST MANAGER</th></tr>
                  </thead>
                  <tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>
                </table>
              </header>

              <div className="logsheet-date-line"><b>DATE :</b> <span>{formatDateForPrint(previewDate)}</span></div>

              <table className="logsheet-template-table">
                <thead>
                  <tr>
                    <th className="logsheet-item-cell">ITEMS</th>
                    {blockOne.map((item, index) => renderHeaderCell(item, `b1-head-${index}`))}
                  </tr>
                </thead>
                <tbody>{renderPrintRows("block1", blockOne)}</tbody>

                <thead>
                  <tr>
                    <th className="logsheet-item-cell">ITEMS</th>
                    {blockTwo.map((item, index) => renderHeaderCell(item, `b2-head-${index}`))}
                  </tr>
                </thead>
                <tbody>{renderPrintRows("block2", blockTwo)}</tbody>

                <thead>
                  <tr>
                    <th className="logsheet-item-cell">ITEMS</th>
                    {blockThree.map((item, index) => renderHeaderCell(item, `b3-head-${index}`))}
                    <th colSpan={3} className="logsheet-head-cell">CONDITION</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftRows.map((shift, rowIndex) => (
                    <tr key={`block3-${shift.key}`}>
                      <td className="logsheet-shift-cell">
                        <b>{shift.label}</b>
                        <span>({shift.time})</span>
                      </td>
                      {blockThree.map((item, index) => {
                        const key = makeKey("block3", shift.key, index);
                        return <td key={`${key}-${item.label}`} className="logsheet-print-cell">{renderPrintCondition(key)}</td>;
                      })}
                      {rowIndex === 0 ? <td colSpan={3} className="logsheet-condition-cell"><b>√</b><span>: GOOD CONDITION</span></td> : null}
                      {rowIndex === 1 ? <td colSpan={3} className="logsheet-condition-cell"><b>△</b><span>: REPAIR NEEDED</span></td> : null}
                      {rowIndex === 2 ? <td colSpan={3} className="logsheet-condition-cell"><b>X</b><span>: NOT GOOD</span></td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="logsheet-remarks-table">
                <tbody>
                  <tr>
                    {shiftRows.map((shift) => (
                      <td key={`${shift.key}-title`}>
                        <b>{shift.label} ( {shift.time} )</b>
                        <label>NAMA :</label>
                        <span className="logsheet-auto-name">{previewMeta[shift.key].name || "-"}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {shiftRows.map((shift) => (
                      <td key={`${shift.key}-group`}>
                        <label>GRUP :</label>
                        <span className="logsheet-print-group">{previewMeta[shift.key].group}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {shiftRows.map((shift) => (
                      <td key={`${shift.key}-remarks`} className="logsheet-remarks-cell">
                        <b>REMARKS :</b>
                        <span className="logsheet-print-remarks">{previewMeta[shift.key].remarks || "-"}</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <div className="logsheet-note">*NOTE: JIKA KOLOM REMARK TIDAK MENCUKUPI, DIPERBOLEHKAN MENAMBAHKAN KERTAS DIBELAKANG DOKUMEN TERLAMPIR</div>
              <footer className="logsheet-doc-footer">
                <span>Rev. 03 (2025.12.08)</span>
                <span>PT. DONGJIN INDONESIA</span>
                <span>DJF-J-M3-002</span>
              </footer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
