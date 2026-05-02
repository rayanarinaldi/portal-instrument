import { Download, Eye, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { hasRole, isViewOnly, permissions } from "@/lib/permissions";

type Condition = "A" | "B" | "C" | "D";

type DailyRow = {
  id: string;
  description: string;
  condition: Condition;
  remark: string;
};

type DailyReport = {
  id: string;
  date: string;
  preparedBy: string;
  rows: DailyRow[];
  savedAt: string;
};

const STORAGE_KEY = "instrument-dji.daily-report-foreman.draft";
const HISTORY_KEY = "instrument-dji.daily-report-foreman.history";

const CONDITION_OPTIONS: Array<{ value: Condition; label: string; help: string }> = [
  { value: "A", label: "A", help: "Semua equipment dalam condition sangat bagus" },
  { value: "B", label: "B", help: "Equipment perlu perbaikan namun ada spare part / ada spare mesin" },
  { value: "C", label: "C", help: "Equipment perlu perbaikan namun spare part / spare mesin tidak ada" },
  { value: "D", label: "D", help: "Equipment sangat tidak bagus / off" },
];

const conditionClass: Record<Condition, string> = {
  A: "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  B: "border-yellow-500 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
  C: "border-orange-500 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100",
  D: "border-red-600 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function formatDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function userDisplayName(user: { name?: string | null; username?: string | null } | null | undefined) {
  return user?.name || user?.username || "Current User";
}

function defaultReport(preparedBy: string): DailyReport {
  return {
    id: makeId("daily-foreman"),
    date: todayJakarta(),
    preparedBy,
    rows: [
      { id: makeId("row"), description: "", condition: "A", remark: "" },
    ],
    savedAt: "",
  };
}

function loadDraft(preparedBy: string): DailyReport {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DailyReport;
      return { ...parsed, preparedBy };
    }
  } catch {
    // ignore
  }
  return defaultReport(preparedBy);
}

function loadHistory(): DailyReport[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export default function DailyReportForemanPage() {
  const { user } = useAuth();
  const canView = hasRole(user?.role, permissions.dailyReportView ?? permissions.preventiveView ?? []);
  const canManage = hasRole(user?.role, permissions.dailyReportManage ?? permissions.preventiveManage ?? []);
  const readOnly = !canManage || isViewOnly(user?.role);
  const currentUserName = userDisplayName(user);

  const [report, setReport] = useState<DailyReport>(() => loadDraft(currentUserName));
  const [history, setHistory] = useState<DailyReport[]>(() => loadHistory());
  const [viewedReport, setViewedReport] = useState<DailyReport | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewReport = viewedReport ?? report;

  const stats = useMemo(() => {
    return report.rows.reduce(
      (acc, row) => {
        acc[row.condition] += 1;
        acc.total += 1;
        return acc;
      },
      { total: 0, A: 0, B: 0, C: 0, D: 0 } as Record<Condition | "total", number>,
    );
  }, [report.rows]);

  if (!canView) {
    return <div className="rounded-3xl border bg-white p-8 shadow-sm dark:bg-slate-900 dark:text-white">Anda tidak memiliki akses ke Daily Report Foreman.</div>;
  }

  function updateReport(patch: Partial<DailyReport>) {
    setViewedReport(null);
    setReport((current) => ({ ...current, ...patch }));
  }

  function updateRow(id: string, patch: Partial<DailyRow>) {
    setViewedReport(null);
    setReport((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  function addRow() {
    setViewedReport(null);
    setReport((current) => ({
      ...current,
      rows: [...current.rows, { id: makeId("row"), description: "", condition: "A", remark: "" }],
    }));
  }

  function removeRow(id: string) {
    setViewedReport(null);
    setReport((current) => ({
      ...current,
      rows: current.rows.length > 1 ? current.rows.filter((row) => row.id !== id) : current.rows,
    }));
  }

  function saveReport() {
    const normalized: DailyReport = {
      ...report,
      preparedBy: currentUserName,
      savedAt: new Date().toISOString(),
    };

    const nextHistory = [normalized, ...history.filter((item) => item.id !== normalized.id)].slice(0, 50);
    setReport(normalized);
    setViewedReport(normalized);
    setHistory(nextHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setMessage("Daily Report Foreman tersimpan ke History.");
  }

  function printReport() {
    document.body.classList.add("daily-foreman-print-mode");
    window.print();
    window.setTimeout(() => document.body.classList.remove("daily-foreman-print-mode"), 500);
  }

  function exportCsv() {
    const headers = ["Date", "Prepared By", "No", "Description", "Condition", "Remark"];
    const rows = previewReport.rows.map((row, index) => [
      formatDate(previewReport.date),
      previewReport.preparedBy,
      index + 1,
      row.description,
      row.condition,
      row.remark,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    downloadTextFile(`daily-report-foreman-${previewReport.date}.csv`, csv, "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-6 daily-foreman-page">
      <section className="rounded-3xl border bg-white p-5 shadow-sm print-hide dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              Instrument Daily Report
            </div>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white">Daily Report Foreman</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-300">
              Web form dibuat simple untuk input. Format print mengikuti template Instrument Daily Report.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={printReport} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Printer className="mr-2 inline h-4 w-4" />Print
            </button>
            <button onClick={exportCsv} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Download className="mr-2 inline h-4 w-4" />Export
            </button>
            {!readOnly ? (
              <button onClick={saveReport} className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
                <Save className="mr-2 inline h-4 w-4" />Save
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <label className="daily-foreman-field-label">
            <span>Date</span>
            <input
              type="date"
              value={report.date}
              disabled={readOnly}
              onChange={(event) => updateReport({ date: event.target.value })}
              className="daily-foreman-control"
            />
          </label>
          <label className="daily-foreman-field-label">
            <span>Prepared By</span>
            <input value={currentUserName} readOnly className="daily-foreman-control bg-slate-50 font-bold dark:bg-slate-800" />
          </label>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            <div>Total item: <b>{stats.total}</b></div>
            <div>A: <b>{stats.A}</b> | B: <b>{stats.B}</b> | C: <b>{stats.C}</b> | D: <b>{stats.D}</b></div>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}
      </section>

      <section className="print-hide rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">General Condition Equipment</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">Pilih condition sesuai kondisi equipment.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONDITION_OPTIONS.map((option) => (
              <span key={option.value} className={`rounded-full border px-3 py-1 text-xs font-black ${conditionClass[option.value]}`}>
                {option.value} - {option.help}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="print-hide space-y-4">
        {report.rows.map((row, index) => (
          <div key={row.id} className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b pb-4 dark:border-slate-700">
              <div>
                <div className="text-xs font-black uppercase text-slate-400">No. {index + 1}</div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Activity / Problem Description</h2>
              </div>
              {!readOnly && report.rows.length > 1 ? (
                <button onClick={() => removeRow(row.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
                  <Trash2 className="mr-1 inline h-3 w-3" />Hapus
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
              <label className="daily-foreman-field-label">
                <span>Description</span>
                <textarea
                  value={row.description}
                  disabled={readOnly}
                  onChange={(event) => updateRow(row.id, { description: event.target.value })}
                  placeholder="Contoh: Corrective maintenance transmitter / preventive checklist HYDRAZINE / calibration verification..."
                  className="min-h-24 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="daily-foreman-field-label">
                <span>Condition</span>
                <select
                  value={row.condition}
                  disabled={readOnly}
                  onChange={(event) => updateRow(row.id, { condition: event.target.value as Condition })}
                  className={`h-12 rounded-2xl border px-3 text-sm font-black outline-none disabled:opacity-70 ${conditionClass[row.condition]}`}
                >
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.value}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="daily-foreman-field-label mt-4">
              <span>Remark</span>
              <textarea
                value={row.remark}
                disabled={readOnly}
                onChange={(event) => updateRow(row.id, { remark: event.target.value })}
                placeholder="Catatan tindakan / kendala / kebutuhan spare part..."
                className="min-h-20 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
          </div>
        ))}

        {!readOnly ? (
          <div className="sticky bottom-4 z-10 rounded-3xl border bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Tambah item bila ada lebih dari satu aktivitas/temuan.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={addRow} className="rounded-2xl border px-5 py-3 text-sm font-black dark:border-slate-600 dark:text-white">
                  <Plus className="mr-2 inline h-4 w-4" />Tambah Item
                </button>
                <button onClick={saveReport} className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">
                  <Save className="mr-2 inline h-4 w-4" />Save Report
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="print-hide rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">History Daily Report Foreman</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">Klik View untuk melihat laporan tersimpan. Klik Load untuk edit ulang.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{history.length} history</span>
        </div>

        {history.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">Belum ada history.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Prepared By</th>
                  <th className="py-2 pr-3">Items</th>
                  <th className="py-2 pr-3">Saved At</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-b dark:border-slate-700">
                    <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{formatDate(item.date)}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">{item.preparedBy}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">{item.rows.length}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">{item.savedAt ? new Date(item.savedAt).toLocaleString() : "-"}</td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewedReport(item)} className="rounded-xl border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950">
                          <Eye className="mr-1 inline h-3 w-3" />View
                        </button>
                        <button
                          onClick={() => {
                            setReport(item);
                            setViewedReport(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="rounded-xl border px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Load
                        </button>
                        {!readOnly ? (
                          <button
                            onClick={() => {
                              const next = history.filter((record) => record.id !== item.id);
                              setHistory(next);
                              if (viewedReport?.id === item.id) setViewedReport(null);
                              localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
                            }}
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

      {viewedReport ? (
        <div className="print-hide rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <b>Mode View Laporan:</b> sedang menampilkan Daily Report Foreman tanggal {formatDate(viewedReport.date)}.
              <span className="block text-xs opacity-80">Print dan Export akan memakai laporan yang sedang di-view ini.</span>
            </div>
            <button onClick={() => setViewedReport(null)} className="rounded-2xl border border-blue-300 px-4 py-2 text-xs font-black hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900">
              Tutup View
            </button>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b p-4 print-hide dark:border-slate-700">
          <h2 className="font-black text-slate-900 dark:text-white">{viewedReport ? "View Print Daily Report Foreman" : "Preview Print Daily Report Foreman"}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">Bagian ini otomatis dipakai saat Print.</p>
        </div>

        <div className="daily-foreman-scroll">
          <div className="daily-foreman-print-area">
            <div className="daily-foreman-paper">
              <header className="daily-foreman-header">
                <h2>INSTRUMENT DAILY REPORT</h2>
                <table className="daily-foreman-approval">
                  <thead>
                    <tr><th colSpan={3}>APPROVAL</th></tr>
                    <tr><th>FOREMAN</th><th>SECT CHIEF</th><th>ASST MANAGER</th></tr>
                  </thead>
                  <tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>
                </table>
              </header>

              <div className="daily-foreman-date-line">
                <b>DATE:</b>
                <span>{formatDate(previewReport.date)}</span>
              </div>

              <section className="daily-foreman-condition">
                <h3>GENERAL CONDITION EQUIPMENT</h3>
                <div>A : Semua Equipment dalam condition sangat bagus</div>
                <div>B : Equipment perlu perbaikan namun ada spare part/ada spare mesin</div>
                <div>C : Equipment perlu perbaikan namun spare part/ ada spare mesin tidak ada</div>
                <div>D : Equipment sangat tidak bagus / off</div>
              </section>

              <table className="daily-foreman-table">
                <thead>
                  <tr>
                    <th className="daily-foreman-no">NO</th>
                    <th>DISCRIPTION</th>
                    <th className="daily-foreman-cond">COND</th>
                    <th>REMARK</th>
                  </tr>
                </thead>
                <tbody>
                  {previewReport.rows.map((row, index) => (
                    <tr key={`print-${row.id}`}>
                      <td className="daily-foreman-no">{index + 1}</td>
                      <td>{row.description || "-"}</td>
                      <td className="daily-foreman-cond">{row.condition}</td>
                      <td>{row.remark || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="daily-foreman-note">
                <b>NOTE:</b>
              </div>

              <footer className="daily-foreman-footer">
                <span>REV. 01 (2025.12.08)</span>
                <span>PT. DONGJIN INDONESIA</span>
                <span>DJF-J-M3-004</span>
              </footer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
