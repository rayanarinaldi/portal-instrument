import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Factory,
  Filter,
  Gauge,
  Printer,
  RefreshCw,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/auth-context";
import { hasRole, isViewOnly, permissions } from "@/lib/permissions";
import { ISSUE_UPDATED_EVENT, loadPreventiveIssues, savePreventiveIssues, type IssueCondition, type IssueStatus, type IssueSource, type PreventiveIssue } from "@/lib/realtime-issues";

const conditionClass: Record<IssueCondition, string> = {
  C: "border-yellow-300 bg-yellow-100 text-yellow-900",
  D: "border-orange-300 bg-orange-100 text-orange-900",
  E: "border-red-300 bg-red-100 text-red-800",
};

const statusClass: Record<IssueStatus, string> = {
  OPEN: "border-red-200 bg-red-50 text-red-700",
  PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  CLOSED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const chartColors = ["#ef4444", "#3b82f6", "#10b981", "#f97316", "#eab308", "#64748b"];

function toCountMap<T extends string>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
}

function mapToChartData(map: Record<string, number>, labelKey = "name", valueKey = "total") {
  return Object.entries(map)
    .map(([name, total]) => ({ [labelKey]: name, [valueKey]: total }))
    .sort((a: any, b: any) => b[valueKey] - a[valueKey]);
}

function exportCsv(filename: string, rows: PreventiveIssue[]) {
  const header = ["Date", "Area", "Sub Area", "Equipment", "Tag No", "Source", "Condition", "Remark", "Checked By", "Status"];
  const body = rows.map((issue) => [
    issue.date,
    issue.plantArea,
    issue.subArea,
    issue.equipmentService,
    issue.tagNo,
    issue.source,
    issue.condition,
    issue.remark,
    issue.checkedBy,
    issue.status,
  ]);
  const csv = [header, ...body]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function StatCard({ title, value, subtitle, icon: Icon, tone }: { title: string; value: number | string; subtitle: string; icon: any; tone: string }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
          <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function MonitoringDashboardPage() {
  const { user } = useAuth();
  const canView = hasRole(user?.role, permissions.monitoring);
  const readOnly = isViewOnly(user?.role) || !hasRole(user?.role, permissions.preventiveManage);

  const [issues, setIssues] = useState<PreventiveIssue[]>(loadPreventiveIssues);
  const [areaFilter, setAreaFilter] = useState("All Area");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [conditionFilter, setConditionFilter] = useState("All Condition");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  function refreshIssues() {
    setIssues(loadPreventiveIssues());
    setLastUpdated(new Date());
  }

  useEffect(() => {
    const handleUpdate = () => refreshIssues();
    window.addEventListener(ISSUE_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(ISSUE_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(refreshIssues, 5000);
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  const areas = useMemo(() => Array.from(new Set(issues.map((issue) => issue.plantArea))).sort(), [issues]);

  const filteredIssues = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return issues.filter((issue) => {
      const matchArea = areaFilter === "All Area" || issue.plantArea === areaFilter;
      const matchStatus = statusFilter === "All Status" || issue.status === statusFilter;
      const matchCondition = conditionFilter === "All Condition" || issue.condition === conditionFilter;
      const matchSearch =
        !keyword ||
        issue.tagNo.toLowerCase().includes(keyword) ||
        issue.equipmentService.toLowerCase().includes(keyword) ||
        issue.remark.toLowerCase().includes(keyword);
      return matchArea && matchStatus && matchCondition && matchSearch;
    });
  }, [areaFilter, conditionFilter, issues, search, statusFilter]);

  const openCount = issues.filter((issue) => issue.status === "OPEN").length;
  const progressCount = issues.filter((issue) => issue.status === "PROGRESS").length;
  const closedCount = issues.filter((issue) => issue.status === "CLOSED").length;
  const criticalCount = issues.filter((issue) => issue.condition === "E").length;

  const statusChartData = [
    { name: "OPEN", value: openCount },
    { name: "PROGRESS", value: progressCount },
    { name: "CLOSED", value: closedCount },
  ].filter((item) => item.value > 0);

  const trendData = useMemo(() => {
    const byDate = toCountMap(issues.map((issue) => issue.date));
    return Object.entries(byDate)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [issues]);

  const areaData = useMemo(() => mapToChartData(toCountMap(issues.map((issue) => issue.plantArea))).slice(0, 8), [issues]);

  const topEquipment = useMemo(() => {
    const map = issues.reduce<Record<string, { name: string; tagNo: string; total: number }>>((acc, issue) => {
      const key = issue.tagNo;
      acc[key] = acc[key] || { name: issue.equipmentService, tagNo: issue.tagNo, total: 0 };
      acc[key].total += 1;
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [issues]);

  function updateStatus(id: string, status: IssueStatus) {
    setIssues((prev) => {
      const next = prev.map((issue) => (issue.id === id ? { ...issue, status } : issue));
      savePreventiveIssues(next);
      setLastUpdated(new Date());
      return next;
    });
  }

  if (!canView) {
    return <div className="rounded-3xl border bg-white p-8 shadow-sm">Anda tidak memiliki akses ke Dashboard Monitoring.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
              <Gauge className="h-4 w-4" /> Monitoring Center
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Dashboard Monitoring & Issue</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Ringkasan issue preventive, area paling bermasalah, trend harian, dan status penyelesaian. Data demo diambil dari checklist preventive lokal sampai API/DB final disambungkan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-2xl border bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
              <span className={`h-2 w-2 rounded-full ${autoRefresh ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />
              {autoRefresh ? "LIVE" : "PAUSED"}
              <span className="font-semibold opacity-70">{lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
            <button onClick={() => setAutoRefresh((prev) => !prev)} className="rounded-2xl border px-4 py-2 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              {autoRefresh ? "Pause Realtime" : "Resume Realtime"}
            </button>
            <button onClick={refreshIssues} className="rounded-2xl border px-4 py-2 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <RefreshCw className="mr-2 inline h-4 w-4" /> Refresh
            </button>
            <button onClick={() => window.print()} className="rounded-2xl border px-4 py-2 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Printer className="mr-2 inline h-4 w-4" /> Print
            </button>
            <button onClick={() => exportCsv("issue-monitoring.csv", filteredIssues)} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
              <Download className="mr-2 inline h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Issue" value={issues.length} subtitle="Semua issue preventive" icon={BarChart3} tone="bg-slate-100 text-slate-700" />
        <StatCard title="Open" value={openCount} subtitle="Butuh tindak lanjut" icon={AlertOctagon} tone="bg-red-100 text-red-700" />
        <StatCard title="Progress" value={progressCount} subtitle="Sedang dikerjakan" icon={Wrench} tone="bg-blue-100 text-blue-700" />
        <StatCard title="Critical E" value={criticalCount} subtitle="Damaged / prioritas tinggi" icon={AlertTriangle} tone="bg-orange-100 text-orange-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">Trend Issue Harian</h2>
              <p className="text-sm text-slate-500">Jumlah issue berdasarkan tanggal checklist.</p>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-400" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Status Penyelesaian</h2>
          <p className="mb-4 text-sm text-slate-500">Komposisi OPEN / PROGRESS / CLOSED.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {statusChartData.map((_, index) => (
                    <Cell key={index} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-2 text-red-700">OPEN<br />{openCount}</div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-2 text-blue-700">PROGRESS<br />{progressCount}</div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">CLOSED<br />{closedCount}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Factory className="h-5 w-5 text-slate-500" />
            <div>
              <h2 className="text-lg font-black">Issue per Area</h2>
              <p className="text-sm text-slate-500">Area dengan issue paling banyak.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="total" fill="#1d4ed8" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Top Equipment Bermasalah</h2>
          <p className="mb-4 text-sm text-slate-500">Equipment dengan issue paling sering muncul.</p>
          <div className="space-y-3">
            {topEquipment.map((item, index) => (
              <div key={item.tagNo} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black text-slate-400">#{index + 1}</div>
                    <div className="font-black text-slate-900">{item.tagNo}</div>
                    <div className="text-sm text-slate-500">{item.name}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white">{item.total}x</div>
                </div>
              </div>
            ))}
            {topEquipment.length === 0 && <div className="rounded-2xl border p-8 text-center text-sm font-semibold text-slate-500">Belum ada issue.</div>}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-white shadow-sm">
        <div className="border-b p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-black">Issue Monitoring</h2>
              <p className="text-sm text-slate-500">Filter, tracking status, dan export issue preventive.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="h-10 rounded-2xl border bg-white px-3 text-sm font-semibold">
                <option>All Area</option>
                {areas.map((area) => <option key={area}>{area}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-2xl border bg-white px-3 text-sm font-semibold">
                <option>All Status</option>
                <option>OPEN</option>
                <option>PROGRESS</option>
                <option>CLOSED</option>
              </select>
              <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className="h-10 rounded-2xl border bg-white px-3 text-sm font-semibold">
                <option>All Condition</option>
                <option>C</option>
                <option>D</option>
                <option>E</option>
              </select>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari tag / equipment / remark" className="h-10 w-full rounded-2xl border px-4 text-sm font-semibold sm:w-64" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Sub Area</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Tag No</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Remark</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredIssues.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">Tidak ada issue sesuai filter.</td></tr>
              )}
              {filteredIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-semibold">{issue.date}</td>
                  <td className="px-4 py-4">{issue.plantArea}</td>
                  <td className="px-4 py-4">{issue.subArea}</td>
                  <td className="px-4 py-4 font-semibold">{issue.equipmentService}</td>
                  <td className="px-4 py-4 font-mono text-xs font-black">{issue.tagNo}</td>
                  <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-black ${conditionClass[issue.condition]}`}>{issue.condition} ({issue.source})</span></td>
                  <td className="px-4 py-4">{issue.remark}</td>
                  <td className="px-4 py-4">
                    {readOnly ? (
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass[issue.status]}`}>{issue.status}</span>
                    ) : (
                      <select value={issue.status} onChange={(e) => updateStatus(issue.id, e.target.value as IssueStatus)} className="h-9 rounded-xl border px-2 text-xs font-bold">
                        <option>OPEN</option>
                        <option>PROGRESS</option>
                        <option>CLOSED</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t p-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>Menampilkan {filteredIssues.length} dari {issues.length} issue.</div>
          <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> PIC & Asst. Manager view-only; Admin IT & Section Chief bisa update status.</div>
        </div>
      </div>
    </div>
  );
}
