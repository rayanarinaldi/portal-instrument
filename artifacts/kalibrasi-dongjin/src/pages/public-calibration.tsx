export const API_BASE =
  (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  MapPin,
  CalendarDays,
  User,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Clock3,
} from "lucide-react";

type PublicCalibration = {
  id: number;
  formType: string;
  tagNo?: string | null;
  date?: string | null;
  calibratedBy?: string | null;
  status?: string;
  location?: string;
  data?: Record<string, unknown>;
};

const AAPI_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000/api")

const FORM_LABELS: Record<string, string> = {
  control_valve: "Control Valve",
  timbangan: "Timbangan",
  rtd: "RTD",
  ph: "pH",
  transmitter: "Transmitter",
};

function daysDiff(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);

  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

function getStatusBadge(status?: string) {
  if (status === "Selesai Kalibrasi") {
    return "bg-green-100 text-green-800";
  }
  if (status === "On Progress") {
    return "bg-yellow-100 text-yellow-800";
  }
  if (status === "Tidak bisa di Kalibrasi") {
    return "bg-red-100 text-red-800";
  }
  return "bg-slate-100 text-slate-700";
}

export default function PublicCalibration(props: { params?: { id?: string } }) {
  const id = props.params?.id || "";
  const [data, setData] = useState<PublicCalibration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/public/calibrations/${id}`);
        if (!res.ok) throw new Error("Data tidak ditemukan");

        const json = (await res.json()) as PublicCalibration;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  const formLabel = useMemo(() => {
    if (!data) return "-";
    return FORM_LABELS[data.formType] || data.formType;
  }, [data]);

  const dueDate = (data?.data?.calDueDate as string) || "";
  const dueInfo = useMemo(() => {
    if (!dueDate) return { label: "-", color: "bg-slate-100 text-slate-700", icon: "safe" as const };

    const diff = daysDiff(dueDate);
    if (diff < 0) {
      return { label: "Overdue", color: "bg-red-100 text-red-700", icon: "overdue" as const };
    }
    if (diff <= 30) {
      return { label: "Due Soon", color: "bg-yellow-100 text-yellow-700", icon: "soon" as const };
    }
    return { label: "Aman", color: "bg-green-100 text-green-700", icon: "safe" as const };
  }, [dueDate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-center text-sm text-muted-foreground">Memuat data kalibrasi...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-center text-red-600">{error || "Data tidak ditemukan"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-3xl border bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            Calibration Verification
          </div>

          <div className="text-3xl font-bold tracking-tight">{data.tagNo || "-"}</div>
          <div className="mt-2 text-sm text-blue-100">{formLabel}</div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadge(data.status)}`}>
              {data.status || "-"}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-medium ${dueInfo.color}`}>
              {dueInfo.icon === "overdue" && <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />}
              {dueInfo.icon === "soon" && <Clock3 className="mr-1 inline h-3.5 w-3.5" />}
              {dueInfo.icon === "safe" && <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />}
              {dueInfo.label}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="mb-4 text-sm font-semibold text-slate-700">Informasi Utama</div>

          <div className="space-y-3">
            <InfoRow icon={<Wrench className="h-4 w-4" />} label="Tag No" value={data.tagNo || "-"} />
            <InfoRow icon={<CheckCircle2 className="h-4 w-4" />} label="Type" value={formLabel} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location" value={data.location || "-"} />
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Tanggal Kalibrasi"
              value={data.date ? format(new Date(data.date), "dd MMM yyyy") : "-"}
            />
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Next Due Date"
              value={dueDate ? format(new Date(dueDate), "dd MMM yyyy") : "-"}
            />
            <InfoRow icon={<User className="h-4 w-4" />} label="Calibrated By" value={data.calibratedBy || "-"} />
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-700">Status Reminder</div>

          <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${dueInfo.color}`}>
            {dueInfo.icon === "overdue" && "Perhatian: alat ini sudah melewati jadwal kalibrasi."}
            {dueInfo.icon === "soon" && "Reminder: alat ini akan segera jatuh tempo."}
            {dueInfo.icon === "safe" && "Status aman: alat ini masih dalam masa kalibrasi."}
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 text-center text-xs text-slate-500 shadow-sm">
          PT. DONGJIN INDONESIA · QR Calibration Verification
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="mt-0.5 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-0.5 break-words text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}