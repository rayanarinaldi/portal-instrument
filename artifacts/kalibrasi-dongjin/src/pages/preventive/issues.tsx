import { Download, Eye, Printer, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { hasRole, isViewOnly, permissions } from "@/lib/permissions";

type IssueStatus = "OPEN" | "ON_PROGRESS" | "CLOSED";

type PreventiveIssue = {
  id: string;
  date?: string;
  plantArea?: string;
  subArea?: string;
  equipmentId?: string;
  equipmentService?: string;
  tagNo?: string;
  source?: string;
  condition?: string;
  remark?: string;
  checkedBy?: string;
  status?: IssueStatus | string;
  action?: string;
  closedBy?: string;
  closedAt?: string;
  createdAt?: string;
};

const ISSUE_STORAGE_KEY = "instrument-dji.preventive.issues";
const ISSUE_UPDATED_EVENT = "instrument-dji.issue-updated";

const statusLabels: Record<IssueStatus, string> = {
  OPEN: "Open",
  ON_PROGRESS: "On Progress",
  CLOSED: "Closed",
};

function formatDate(value?: string) {
  if (!value) return "-";
  if (value.includes("-")) {
    const [year, month, day] = value.slice(0, 10).split("-");
    if (year && month && day) return `${day}/${month}/${year}`;
  }
  return value;
}

function normalizeStatus(value?: string): IssueStatus {
  if (value === "CLOSED") return "CLOSED";
  if (value === "ON_PROGRESS") return "ON_PROGRESS";
  return "OPEN";
}

function readIssues(): PreventiveIssue[] {
  try {
    const raw = localStorage.getItem(ISSUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIssues(issues: PreventiveIssue[]) {
  localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issues));
  window.dispatchEvent(new CustomEvent(ISSUE_UPDATED_EVENT));
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

export default function PreventiveIssuesPage() {
  const { user } = useAuth();
  const canView = hasRole(user?.role, permissions.preventiveView);
  const canManage = hasRole(user?.role, permissions.preventiveManage);
  const readOnly = !canManage || isViewOnly(user?.role);

  const [issues, setIssues] = useState<PreventiveIssue[]>(() => readIssues());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | IssueStatus>("ALL");
  const [viewedIssue, setViewedIssue] = useState<PreventiveIssue | null>(null);

  const filteredIssues = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return issues.filter((issue) => {
      const status = normalizeStatus(issue.status);
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!query) return true;
      return [
        issue.date,
        issue.plantArea,
        issue.subArea,
        issue.equipmentService,
        issue.tagNo,
        issue.source,
        issue.condition,
        issue.remark,
        issue.checkedBy,
        issue.action,
        statusLabels[status],
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [issues, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return issues.reduce(
      (acc, issue) => {
        const status = normalizeStatus(issue.status);
        acc.total += 1;
        acc[status] += 1;
        return acc;
      },
      { total: 0, OPEN: 0, ON_PROGRESS: 0, CLOSED: 0 } as Record<IssueStatus | "total", number>,
    );
  }, [issues]);

  useEffect(() => {
    const refresh = () => setIssues(readIssues());
    window.addEventListener(ISSUE_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ISSUE_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!canView) {
    return <div className="rounded-3xl border bg-white p-8 shadow-sm dark:bg-slate-900 dark:text-white">Anda tidak memiliki akses ke Preventive Issues.</div>;
  }

  function updateIssue(id: string, patch: Partial<PreventiveIssue>) {
    const next = issues.map((issue) => (issue.id === id ? { ...issue, ...patch } : issue));
    setIssues(next);
    saveIssues(next);
  }

  function printIssues() {
    document.body.classList.add("preventive-issues-print-mode");
    window.print();
    window.setTimeout(() => document.body.classList.remove("preventive-issues-print-mode"), 500);
  }

  function exportCsv() {
    const headers = ["Date", "Plant Area", "Sub Area", "Equipment", "Tag No", "Source", "Condition", "Remark", "Checked By", "Status", "Action"];
    const rows = filteredIssues.map((issue) => [
      formatDate(issue.date),
      issue.plantArea ?? "",
      issue.subArea ?? "",
      issue.equipmentService ?? "",
      issue.tagNo ?? "",
      issue.source ?? "",
      issue.condition ?? "",
      issue.remark ?? "",
      issue.checkedBy ?? "",
      statusLabels[normalizeStatus(issue.status)],
      issue.action ?? "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    downloadTextFile(`preventive-issues-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-6 preventive-issues-page">
      <section className="rounded-3xl border bg-white p-5 shadow-sm print-hide dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 dark:bg-orange-950 dark:text-orange-200">
              Preventive Findings
            </div>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white">Preventive Issues</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-300">
              Daftar temuan otomatis dari checklist preventive dengan kondisi C, D, atau E.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={() => setIssues(readIssues())} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <RefreshCw className="mr-2 inline h-4 w-4" />Refresh
            </button>
            <button onClick={printIssues} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Printer className="mr-2 inline h-4 w-4" />Print
            </button>
            <button onClick={exportCsv} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Download className="mr-2 inline h-4 w-4" />Export
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="text-xs font-black uppercase text-slate-500 dark:text-slate-300">Total</div>
            <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <div className="text-xs font-black uppercase text-red-600 dark:text-red-300">Open</div>
            <div className="mt-1 text-3xl font-black text-red-700 dark:text-red-200">{stats.OPEN}</div>
          </div>
          <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
            <div className="text-xs font-black uppercase text-yellow-700 dark:text-yellow-200">On Progress</div>
            <div className="mt-1 text-3xl font-black text-yellow-800 dark:text-yellow-100">{stats.ON_PROGRESS}</div>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
            <div className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-200">Closed</div>
            <div className="mt-1 text-3xl font-black text-emerald-800 dark:text-emerald-100">{stats.CLOSED}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="grid gap-2 text-xs font-black uppercase text-slate-500 dark:text-slate-300">
            <span>Search Issue</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari plant area, sub area, equipment, tag no, remark..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </label>
          <label className="grid gap-2 text-xs font-black uppercase text-slate-500 dark:text-slate-300">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | IssueStatus)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="ON_PROGRESS">On Progress</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
        </div>
      </section>

      <section className="print-hide rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500 dark:text-slate-300">Belum ada issue preventive yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Sub Area</th>
                  <th className="px-4 py-3">Equipment</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3">Remark</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue) => {
                  const status = normalizeStatus(issue.status);
                  return (
                    <tr key={issue.id} className="border-b align-top dark:border-slate-700">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{formatDate(issue.date)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{issue.plantArea ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{issue.subArea ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900 dark:text-white">{issue.equipmentService ?? "-"}</div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-300">TAG: {issue.tagNo ?? "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 dark:bg-orange-950 dark:text-orange-200">{issue.condition ?? "-"}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[260px] whitespace-pre-wrap text-slate-600 dark:text-slate-200">{issue.remark ?? "-"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={status}
                          disabled={readOnly}
                          onChange={(event) => updateIssue(issue.id, {
                            status: event.target.value,
                            closedBy: event.target.value === "CLOSED" ? userDisplayName(user) : issue.closedBy,
                            closedAt: event.target.value === "CLOSED" ? new Date().toISOString() : issue.closedAt,
                          })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="OPEN">Open</option>
                          <option value="ON_PROGRESS">On Progress</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setViewedIssue(issue)}
                          className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950"
                        >
                          <Eye className="mr-1 inline h-3 w-3" />View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="preventive-issues-print-area rounded-3xl border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="preventive-issues-paper">
          <header className="preventive-issues-header">
            <div>
              <h2>PREVENTIVE ISSUE REPORT</h2>
              <p>Generated from Preventive Checklist C / D / E findings</p>
            </div>
            <table className="preventive-issues-approval">
              <thead>
                <tr><th>CHECKED</th><th>SECTION CHIEF</th><th>MANAGER</th></tr>
              </thead>
              <tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>
            </table>
          </header>

          <div className="preventive-issues-meta">
            <div><b>PRINT DATE</b><span>{formatDate(new Date().toISOString().slice(0, 10))}</span></div>
            <div><b>TOTAL ISSUE</b><span>{filteredIssues.length}</span></div>
            <div><b>FILTER STATUS</b><span>{statusFilter === "ALL" ? "All Status" : statusLabels[statusFilter]}</span></div>
          </div>

          <table className="preventive-issues-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>DATE</th>
                <th>PLANT AREA</th>
                <th>SUB AREA</th>
                <th>EQUIPMENT</th>
                <th>TAG NO</th>
                <th>SOURCE</th>
                <th>COND</th>
                <th>REMARK</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr><td colSpan={10}>Tidak ada issue preventive.</td></tr>
              ) : filteredIssues.map((issue, index) => (
                <tr key={`print-${issue.id}`}>
                  <td>{index + 1}</td>
                  <td>{formatDate(issue.date)}</td>
                  <td>{issue.plantArea ?? "-"}</td>
                  <td>{issue.subArea ?? "-"}</td>
                  <td>{issue.equipmentService ?? "-"}</td>
                  <td>{issue.tagNo ?? "-"}</td>
                  <td>{issue.source ?? "-"}</td>
                  <td>{issue.condition ?? "-"}</td>
                  <td>{issue.remark ?? "-"}</td>
                  <td>{statusLabels[normalizeStatus(issue.status)]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <footer className="preventive-issues-footer">
            <span>PT. DONGJIN INDONESIA</span>
            <span>Preventive Issue Report</span>
            <span>{new Date().toLocaleString()}</span>
          </footer>
        </div>
      </section>

      {viewedIssue ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">Detail Preventive Issue</h3>
                <p className="text-sm text-slate-500 dark:text-slate-300">{viewedIssue.equipmentService} / {viewedIssue.tagNo}</p>
              </div>
              <button onClick={() => setViewedIssue(null)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <Detail label="Date" value={formatDate(viewedIssue.date)} />
              <Detail label="Plant Area" value={viewedIssue.plantArea} />
              <Detail label="Sub Area" value={viewedIssue.subArea} />
              <Detail label="Equipment" value={viewedIssue.equipmentService} />
              <Detail label="Tag No" value={viewedIssue.tagNo} />
              <Detail label="Source" value={viewedIssue.source} />
              <Detail label="Condition" value={viewedIssue.condition} />
              <Detail label="Remark" value={viewedIssue.remark} />
              <Detail label="Checked By" value={viewedIssue.checkedBy} />
              <Detail label="Status" value={statusLabels[normalizeStatus(viewedIssue.status)]} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function userDisplayName(user: { name?: string | null; username?: string | null } | null | undefined) {
  return user?.name || user?.username || "Current User";
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
      <div className="text-xs font-black uppercase text-slate-400">{label}</div>
      <div className="font-semibold text-slate-900 dark:text-white whitespace-pre-wrap">{value || "-"}</div>
    </div>
  );
}
