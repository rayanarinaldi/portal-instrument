import { Download, Plus, Printer, Save } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { hasRole, isViewOnly, permissions } from "@/lib/permissions";
import { exportCsv, printPage } from "@/utils/clientActions";

export default function DailyReportSectionChiefPage() {
  const { user } = useAuth();
  const canView = hasRole(user?.role, permissions.dailyReportSectionChief);
  const readOnly = isViewOnly(user?.role);
  if (!canView) return <div className="rounded-3xl border bg-white p-8 shadow-sm">Anda tidak memiliki akses ke Daily Report Section Chief.</div>;
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h1 className="text-3xl font-black">Daily Report of Maintenance & Utility</h1><p className="text-sm text-slate-500">Layout dibuat mengikuti gambar format ISO Section Chief.</p></div><div className="flex flex-wrap gap-2"><button onClick={printPage} className="rounded-2xl border px-4 py-2 text-sm font-bold"><Printer className="mr-2 inline h-4 w-4" />Print</button><button onClick={() => exportCsv(`daily-report-section-chief-${new Date().toISOString().slice(0,10)}.csv`, [{ Module: "daily-report-section-chief", ExportedAt: new Date().toISOString(), User: user?.name ?? "" }])} className="rounded-2xl border px-4 py-2 text-sm font-bold"><Download className="mr-2 inline h-4 w-4" />Export</button>{!readOnly && <button onClick={() => alert("Data tersimpan sementara di browser. Untuk simpan permanen, hubungkan API/database.")} className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-bold text-white"><Save className="mr-2 inline h-4 w-4" />Save</button>}</div></div>
        <div className="mt-6 grid gap-4 md:grid-cols-4"><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-500">Period</span><input disabled={readOnly} defaultValue="04 Maret 2026" className="h-11 w-full rounded-2xl border px-3" /></label><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-500">Department</span><input disabled={readOnly} defaultValue="Maintenance Instrument" className="h-11 w-full rounded-2xl border px-3" /></label><label className="space-y-1"><span className="text-xs font-bold uppercase text-slate-500">Prepared</span><input readOnly value={user?.name ?? "Section Chief"} className="h-11 w-full rounded-2xl border bg-slate-50 px-3 font-semibold" /></label><div className="rounded-2xl border bg-slate-50 p-3 text-xs"><b>Approval:</b><br />Prepared → Ass. Mgr → Manager</div></div>
      </div>
      <ReportTable title="Today Activity" readOnly={readOnly} columns={["Description", "Man Power", "Con", "Remark"]} rows={["Corrective maintenance transmitter", "Preventive checklist HYDRAZINE", "Calibration verification"]} />
      <ReportTable title="Planning For Tomorrow" readOnly={readOnly} columns={["Description", "Man Power", "Remark"]} rows={["Inspection control valve", "Loop check area HDCA"]} />
      <div className="rounded-3xl border bg-white p-5 shadow-sm"><label className="space-y-2"><span className="text-sm font-black">Note</span><textarea disabled={readOnly} className="min-h-28 w-full rounded-2xl border px-3 py-2" defaultValue="Follow up all open issues from preventive checklist." /></label><div className="mt-3 text-xs font-semibold text-slate-400">REV.04 (2024.02.01)</div></div>
    </div>
  );
}

function ReportTable({ title, columns, rows, readOnly }: { title: string; columns: string[]; rows: string[]; readOnly: boolean }) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4"><h2 className="font-black">{title}</h2>{!readOnly && <button className="rounded-2xl border border-dashed border-blue-300 px-3 py-1.5 text-xs font-bold text-blue-700"><Plus className="mr-1 inline h-3.5 w-3.5" />Tambah</button>}</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">No</th>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => (<tr key={row}><td className="px-4 py-4 font-bold">{index + 1}</td><td className="px-4 py-4"><input disabled={readOnly} defaultValue={row} className="h-10 w-full rounded-xl border px-3" /></td><td className="px-4 py-4"><input disabled={readOnly} defaultValue={index + 2} className="h-10 w-24 rounded-xl border px-3" /></td>{columns.includes("Con") && <td className="px-4 py-4"><input disabled={readOnly} defaultValue="OK" className="h-10 w-24 rounded-xl border px-3" /></td>}<td className="px-4 py-4"><input disabled={readOnly} defaultValue="-" className="h-10 w-full rounded-xl border px-3" /></td></tr>))}</tbody></table></div></div>
  );
}
