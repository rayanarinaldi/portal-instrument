import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useListCalibrations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Printer, Search } from "lucide-react";

const formTypeDetails = {
  all: { label: "Semua Tipe" },
  control_valve: { label: "Control Valve" },
  timbangan: { label: "Timbangan" },
  rtd: { label: "RTD" },
  ph: { label: "pH" },
  transmitter: { label: "Transmitter" },
};

const statusOptions = [
  "all",
  "Belum Dikerjakan",
  "On Progress",
  "Selesai Kalibrasi",
  "Tidak bisa di Kalibrasi",
];

const statusColors: Record<string, string> = {
  "Selesai Kalibrasi": "bg-green-50 text-green-700 border-green-200",
  "On Progress": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Belum Dikerjakan": "bg-slate-50 text-slate-700 border-slate-200",
  "Tidak bisa di Kalibrasi": "bg-red-50 text-red-700 border-red-200",
};

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: records, isLoading } = useListCalibrations();
  const safeRecords = Array.isArray(records) ? records : [];

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return safeRecords.filter((record) => {
      const data = record.data as Record<string, unknown>;
      const status = (data?.status as string) || "";

      const matchKeyword =
        !keyword ||
        (record.tagNo || "").toLowerCase().includes(keyword) ||
        (record.calibratedBy || "").toLowerCase().includes(keyword) ||
        (record.formType || "").toLowerCase().includes(keyword);

      const matchType =
        typeFilter === "all" || record.formType === typeFilter;

      const matchStatus =
        statusFilter === "all" || status === statusFilter;

      return matchKeyword && matchType && matchStatus;
    });
  }, [safeRecords, search, typeFilter, statusFilter]);

  const totalCount = filteredRecords.length;
  const doneCount = filteredRecords.filter(
    (r) => ((r.data as Record<string, unknown>)?.status as string) === "Selesai Kalibrasi",
  ).length;
  const progressCount = filteredRecords.filter(
    (r) => ((r.data as Record<string, unknown>)?.status as string) === "On Progress",
  ).length;
  const problemCount = filteredRecords.filter(
    (r) => ((r.data as Record<string, unknown>)?.status as string) === "Tidak bisa di Kalibrasi",
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm print:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Laporan Kalibrasi</span>
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Report Page</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ringkasan dan daftar data kalibrasi berdasarkan filter.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => window.print()}
            className="print-hide"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Data" value={totalCount} />
        <StatCard title="Selesai" value={doneCount} />
        <StatCard title="On Progress" value={progressCount} />
        <StatCard title="Problem" value={problemCount} />
      </div>

      <Card className="rounded-2xl shadow-sm print-hide">
        <CardHeader>
          <CardTitle>Filter Report</CardTitle>
          <CardDescription>Gunakan filter untuk melihat laporan sesuai kebutuhan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari tag, user, tipe..."
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(formTypeDetails).map(([value, item]) => (
                  <SelectItem key={value} value={value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "Semua Status" : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm print:shadow-none">
        <CardHeader>
          <CardTitle>Data Report</CardTitle>
          <CardDescription>
            Total hasil filter: {filteredRecords.length} data
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Tidak ada data report.
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border p-2 text-left">Tag No</th>
                  <th className="border p-2 text-left">Type</th>
                  <th className="border p-2 text-left">Calibrated By</th>
                  <th className="border p-2 text-left">Date</th>
                  <th className="border p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const data = record.data as Record<string, unknown>;
                  const status = (data?.status as string) || "-";

                  return (
                    <tr key={record.id} className="hover:bg-muted/20">
                      <td className="border p-2 font-medium">{record.tagNo || "-"}</td>
                      <td className="border p-2">
                        {formTypeDetails[record.formType as keyof typeof formTypeDetails]?.label ||
                          record.formType}
                      </td>
                      <td className="border p-2">{record.calibratedBy || "-"}</td>
                      <td className="border p-2">
                        {record.date ? format(new Date(record.date), "dd MMM yyyy") : "-"}
                      </td>
                      <td className="border p-2">
                        <Badge
                          variant="outline"
                          className={statusColors[status] || "bg-slate-50 text-slate-700 border-slate-200"}
                        >
                          {status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="rounded-2xl shadow-sm print:shadow-none">
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}