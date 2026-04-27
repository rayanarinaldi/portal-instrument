import { Link } from "wouter";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  useGetCalibrationSummary,
  useListCalibrations,
} from "@workspace/api-client-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Activity,
  Thermometer,
  Scale,
  Beaker,
  Radio,
  ClipboardList,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ArrowRight,
  BellRing,
  AlertOctagon,
  X,
  PlusCircle,
  Database,
  Factory,
  Gauge,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const formTypeDetails = {
  control_valve: {
    label: "Control Valve",
    icon: Activity,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  timbangan: {
    label: "Timbangan",
    icon: Scale,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  rtd: {
    label: "RTD",
    icon: Thermometer,
    color: "bg-red-100 text-red-700 border-red-200",
  },
  ph: {
    label: "pH",
    icon: Beaker,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  transmitter: {
    label: "Transmitter",
    icon: Radio,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

const statusColors: Record<string, string> = {
  "Selesai Kalibrasi": "bg-green-100 text-green-700 border-green-200",
  "On Progress": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Belum Dikerjakan": "bg-slate-100 text-slate-700 border-slate-200",
  "Tidak bisa di Kalibrasi": "bg-red-100 text-red-700 border-red-200",
};

const chartColors = ["#16a34a", "#eab308", "#64748b", "#ef4444"];

function daysDiff(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";

  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

function getDueText(dateStr?: string) {
  if (!dateStr) return "";

  const diff = daysDiff(dateStr);

  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
  if (diff === 0) return "Jatuh tempo hari ini";
  if (diff <= 30) return `${diff} hari lagi`;

  return `Aman ${diff} hari`;
}

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } =
    useGetCalibrationSummary();

  const { data: records, isLoading: isRecordsLoading } =
    useListCalibrations();

  const [dismissedWarning, setDismissedWarning] = useState(() => {
    return sessionStorage.getItem("dashboard-warning-dismissed") === "1";
  });

  const safeRecords = (Array.isArray(records) ? records : []) as any[];

  const completedCount = safeRecords.filter(
    (r) => (r.data as Record<string, unknown>)?.status === "Selesai Kalibrasi",
  ).length;

  const progressCount = safeRecords.filter(
    (r) => (r.data as Record<string, unknown>)?.status === "On Progress",
  ).length;

  const pendingCount = safeRecords.filter(
    (r) => (r.data as Record<string, unknown>)?.status === "Belum Dikerjakan",
  ).length;

  const problemCount = safeRecords.filter(
    (r) =>
      (r.data as Record<string, unknown>)?.status === "Tidak bisa di Kalibrasi",
  ).length;

  const overdueRecords = useMemo(
    () =>
      safeRecords.filter((r) => {
        const data = (r.data as Record<string, unknown>) || {};
        const dueDate = data?.calDueDate as string | undefined;
        return dueDate ? daysDiff(dueDate) < 0 : false;
      }),
    [safeRecords],
  );

  const dueSoonRecords = useMemo(
    () =>
      safeRecords.filter((r) => {
        const data = (r.data as Record<string, unknown>) || {};
        const dueDate = data?.calDueDate as string | undefined;

        if (!dueDate) return false;

        const diff = daysDiff(dueDate);
        return diff >= 0 && diff <= 30;
      }),
    [safeRecords],
  );

  const recentRecords = safeRecords.slice(0, 10);

  const showWarningPopup =
    !dismissedWarning && (overdueRecords.length > 0 || dueSoonRecords.length > 0);

  const handleDismissWarning = () => {
    setDismissedWarning(true);
    sessionStorage.setItem("dashboard-warning-dismissed", "1");
  };

  useEffect(() => {
    if (overdueRecords.length === 0 && dueSoonRecords.length === 0) {
      sessionStorage.removeItem("dashboard-warning-dismissed");
      setDismissedWarning(false);
    }
  }, [overdueRecords.length, dueSoonRecords.length]);

  const statusChartData = [
    { name: "Selesai", value: completedCount },
    { name: "Progress", value: progressCount },
    { name: "Belum", value: pendingCount },
    { name: "Problem", value: problemCount },
  ].filter((item) => item.value > 0);

  const typeCount = {
  control_valve: safeRecords.filter((r) => r.formType === "control_valve").length,
  timbangan: safeRecords.filter((r) => r.formType === "timbangan").length,
  rtd: safeRecords.filter((r) => r.formType === "rtd").length,
  ph: safeRecords.filter((r) => r.formType === "ph").length,
  transmitter: safeRecords.filter((r) => r.formType === "transmitter").length,
};

const typeChartData = [
  { name: "Control Valve", total: typeCount.control_valve },
  { name: "Timbangan", total: typeCount.timbangan },
  { name: "RTD", total: typeCount.rtd },
  { name: "pH", total: typeCount.ph },
  { name: "Transmitter", total: typeCount.transmitter },
];

  const summaryCards = [
    {
      label: "Total Record",
      value: safeRecords.length,
      icon: ClipboardList,
      iconBox: "bg-blue-100 text-blue-700",
      bar: "bg-blue-600",
    },
    {
      label: "Selesai",
      value: completedCount,
      icon: CheckCircle2,
      iconBox: "bg-green-100 text-green-700",
      bar: "bg-green-600",
    },
    {
      label: "On Progress",
      value: progressCount,
      icon: Clock3,
      iconBox: "bg-yellow-100 text-yellow-700",
      bar: "bg-yellow-500",
    },
    {
      label: "Problem",
      value: problemCount,
      icon: AlertTriangle,
      iconBox: "bg-red-100 text-red-700",
      bar: "bg-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {showWarningPopup && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="rounded-2xl bg-red-100 p-3 text-red-700">
                <AlertOctagon className="h-6 w-6" />
              </div>

              <div className="space-y-2">
                <div className="text-lg font-bold text-red-800">
                  Peringatan Kalibrasi
                </div>

                {overdueRecords.length > 0 && (
                  <div className="text-sm text-red-700">
                    <span className="font-semibold">{overdueRecords.length} alat</span>{" "}
                    sudah melewati jadwal kalibrasi.
                  </div>
                )}

                {dueSoonRecords.length > 0 && (
                  <div className="text-sm text-red-700">
                    <span className="font-semibold">{dueSoonRecords.length} alat</span>{" "}
                    akan jatuh tempo dalam 30 hari.
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href="/records">
                    <Button size="sm" className="rounded-xl">
                      Lihat Data
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={handleDismissWarning}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={handleDismissWarning}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-blue-100">
              <Factory className="h-4 w-4" />
              PT. Dongjin Indonesia
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Dashboard Kalibrasi
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100">
                Monitoring status kalibrasi, distribusi instrument, due date,
                dan aktivitas terbaru.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-blue-100">
              <span className="rounded-full bg-white/10 px-3 py-1">
                Update: {format(new Date(), "dd MMM yyyy HH:mm")}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                Total Data: {safeRecords.length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/records">
              <Button variant="secondary" className="rounded-2xl">
                <ClipboardList className="mr-2 h-4 w-4" />
                Lihat Semua Record
              </Button>
            </Link>

            <Link href="/new">
              <Button className="rounded-2xl bg-white text-slate-950 hover:bg-blue-50">
                <PlusCircle className="mr-2 h-4 w-4" />
                Buat Record Baru
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-3xl border-red-200 bg-gradient-to-br from-red-100 to-white shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-red-100 p-3 text-red-700">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-red-700/80">Overdue</div>
              <div className="text-3xl font-black text-red-700">
                {overdueRecords.length}
              </div>
              <div className="text-xs text-red-600">
                Sudah lewat jadwal kalibrasi
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-yellow-200 bg-gradient-to-br from-yellow-100 to-white shadow-md">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-yellow-700/80">
                Due Soon
              </div>
              <div className="text-3xl font-black text-yellow-700">
                {dueSoonRecords.length}
              </div>
              <div className="text-xs text-yellow-600">
                Jatuh tempo dalam 30 hari
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          const percent = safeRecords.length
            ? Math.round((item.value / safeRecords.length) * 100)
            : 0;

          return (
            <Card
              key={item.label}
              className="group rounded-3xl border border-slate-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <CardContent className="space-y-4 p-5 transition-all duration-300 group-hover:scale-[1.02]">
                <div className="flex items-center justify-between">
                  <div className={`rounded-2xl p-3 ${item.iconBox}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    {percent}%
                  </span>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-500">
                    {item.label}
                  </div>
                  <div className="text-3xl font-black">{item.value}</div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.bar}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-700" />
              Status Chart
            </CardTitle>
            <CardDescription>
              Distribusi status kalibrasi saat ini.
            </CardDescription>
          </CardHeader>

          <CardContent className="relative h-[320px]">
            {isRecordsLoading ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : statusChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Belum ada data untuk grafik.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-black">
                      {safeRecords.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-700" />
              Instrument Chart
            </CardTitle>
            <CardDescription>
              Total data berdasarkan jenis instrument.
            </CardDescription>
          </CardHeader>

          <CardContent className="h-[320px]">
            {isSummaryLoading ? (
              <Skeleton className="h-full w-full rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    radius={[12, 12, 0, 0]}
                    fill="#2563eb"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-md">
          <CardHeader className="pb-3">
            <CardTitle>Ringkasan per Jenis Instrument</CardTitle>
            <CardDescription>Total data berdasarkan tipe form.</CardDescription>
          </CardHeader>

          <CardContent>
            {isSummaryLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(formTypeDetails).map(([key, details]) => {
                  const count =
                    typeCount[key as keyof typeof typeCount] ?? 0;

                  const Icon = details.icon;

                  return (
                    <div
                      key={key}
                      className="rounded-2xl border bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className={`rounded-xl border p-2 ${details.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-2xl font-black">{count}</span>
                      </div>

                      <div className="text-sm font-bold">{details.label}</div>
                      <div className="text-xs text-muted-foreground">
                        Total record
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-200 bg-white shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Recent Calibrations</CardTitle>
                <CardDescription>10 data kalibrasi terbaru.</CardDescription>
              </div>

              <Link
                href="/records"
                className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isRecordsLoading ? (
              <div className="space-y-4 p-6">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            ) : recentRecords.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                Belum ada data kalibrasi.
              </div>
            ) : (
              <div className="divide-y">
                {recentRecords.map((record) => {
                  const details =
                    formTypeDetails[
                      record.formType as keyof typeof formTypeDetails
                    ];

                  const recordData = record.data as Record<string, unknown>;
                  const recordStatus = recordData?.status as string | undefined;
                  const dueDate = recordData?.calDueDate as string | undefined;

                  const dueBorder = dueDate
                    ? daysDiff(dueDate) < 0
                      ? "4px solid #ef4444"
                      : daysDiff(dueDate) <= 30
                        ? "4px solid #eab308"
                        : "4px solid transparent"
                    : "4px solid transparent";

                  return (
                    <Link
                      key={record.id}
                      href={`/records/${record.id}`}
                      className="block p-4 transition hover:bg-blue-50"
                      style={{ borderLeft: dueBorder }}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="font-black text-blue-800">
                            {record.tagNo || "No Tag"}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{record.calibratedBy || "N/A"}</span>
                            <span>•</span>
                            <span>{formatDate(record.date)}</span>

                            {dueDate && (
                              <>
                                <span>•</span>
                                <span>Due: {formatDate(dueDate)}</span>
                                <span>({getDueText(dueDate)})</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-1 ${
                              details?.color ?? ""
                            }`}
                          >
                            {details?.label || record.formType}
                          </Badge>

                          {recordStatus && (
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2.5 py-1 ${
                                statusColors[recordStatus] ??
                                "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {recordStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}