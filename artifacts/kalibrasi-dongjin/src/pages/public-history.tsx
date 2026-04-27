import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  User,
  Wrench,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type CalibrationRecord = {
  id: number;
  formType: string;
  tagNo?: string | null;
  date?: string | null;
  calibratedBy?: string | null;
  data?: Record<string, unknown>;
};

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const FORM_LABELS: Record<string, string> = {
  control_valve: "Control Valve",
  timbangan: "Timbangan",
  rtd: "RTD",
  ph: "pH",
  transmitter: "Transmitter",
};

const STATUS_BADGES: Record<string, string> = {
  "Selesai Kalibrasi": "bg-green-100 text-green-800",
  "On Progress": "bg-yellow-100 text-yellow-800",
  "Belum Dikerjakan": "bg-slate-100 text-slate-700",
  "Tidak bisa di Kalibrasi": "bg-red-100 text-red-800",
};

function daysDiff(dateStr?: string) {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dueInfo(dueDate?: string) {
  const diff = daysDiff(dueDate);

  if (diff === null) {
    return {
      label: "Due date belum tersedia",
      className: "bg-slate-100 text-slate-700",
      icon: "safe" as const,
    };
  }

  if (diff < 0) {
    return {
      label: `Overdue ${Math.abs(diff)} hari`,
      className: "bg-red-100 text-red-700",
      icon: "overdue" as const,
    };
  }

  if (diff <= 30) {
    return {
      label: `Due soon ${diff} hari`,
      className: "bg-yellow-100 text-yellow-700",
      icon: "soon" as const,
    };
  }

  return {
    label: `Aman ${diff} hari`,
    className: "bg-green-100 text-green-700",
    icon: "safe" as const,
  };
}

export default function PublicHistoryPage(props: { params?: { tagNo?: string } }) {
  const tagNo = decodeURIComponent(props.params?.tagNo || "");
  const [records, setRecords] = useState<CalibrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/public/history/${encodeURIComponent(tagNo)}`);

        if (!res.ok) {
          throw new Error("History tidak ditemukan");
        }

        const json = await res.json();
        setRecords(Array.isArray(json) ? json : json.records || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat history");
      } finally {
        setLoading(false);
      }
    };

    if (tagNo) load();
  }, [tagNo]);

  const sortedRecords = useMemo(() => {
    return [...records].sort(
      (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
    );
  }, [records]);

  const latest = sortedRecords[0];
  const latestData = (latest?.data || {}) as Record<string, unknown>;
  const location = (latestData.location as string) || "-";
  const status = (latestData.status as string) || "-";
  const dueDate = (latestData.calDueDate as string) || "";
  const due = dueInfo(dueDate);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm">
          Memuat history kalibrasi...
        </div>
      </div>
    );
  }

  if (error || !latest) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-8 text-center shadow-sm">
          <div className="text-lg font-bold text-red-600">{error || "History tidak ditemukan"}</div>
          <div className="mt-2 text-sm text-slate-500">Tag No: {tagNo || "-"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-history-page min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="print:hidden flex justify-end">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        <div className="rounded-3xl border bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            Public Calibration History
          </div>

          <div className="mt-2 text-3xl font-bold tracking-tight">{tagNo || "-"}</div>
          <div className="mt-2 text-sm text-blue-100">
            {FORM_LABELS[latest.formType] || latest.formType}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGES[status] || "bg-slate-100 text-slate-700"}`}>
              {status}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-medium ${due.className}`}>
              {due.icon === "overdue" && <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />}
              {due.icon === "soon" && <Clock3 className="mr-1 inline h-3.5 w-3.5" />}
              {due.icon === "safe" && <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />}
              {due.label}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard icon={<Wrench className="h-4 w-4" />} label="Tag No" value={tagNo || "-"} />
          <InfoCard icon={<MapPin className="h-4 w-4" />} label="Location" value={location} />
          <InfoCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Last Calibration"
            value={latest.date ? format(new Date(latest.date), "dd MMM yyyy") : "-"}
          />
          <InfoCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Next Due Date"
            value={dueDate ? format(new Date(dueDate), "dd MMM yyyy") : "-"}
          />
          <InfoCard icon={<User className="h-4 w-4" />} label="Last Worker" value={latest.calibratedBy || "-"} />
          <InfoCard icon={<CheckCircle2 className="h-4 w-4" />} label="Total History" value={`${sortedRecords.length} record`} />
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="mb-4 text-lg font-bold">Riwayat Kalibrasi</div>

          <div className="space-y-3">
            {sortedRecords.map((record, idx) => {
              const data = (record.data || {}) as Record<string, unknown>;
              const recordStatus = (data.status as string) || "-";
              const note = (data.note ?? data.remarks ?? "-") as string;
              const recordDue = data.calDueDate as string | undefined;
              const recordDueInfo = dueInfo(recordDue);

              return (
                <div key={record.id} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-bold">
                        #{idx + 1} · {record.date ? format(new Date(record.date), "dd MMM yyyy") : "-"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Worker: {record.calibratedBy || "-"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGES[recordStatus] || "bg-slate-100 text-slate-700"}`}>
                        {recordStatus}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${recordDueInfo.className}`}>
                        {recordDueInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
                    {note || "-"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 text-center text-xs text-slate-500 shadow-sm">
          PT. DONGJIN INDONESIA · Public QR Calibration History
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">{icon}</div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}