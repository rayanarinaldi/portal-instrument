import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useListCalibrations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  ClipboardList,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Activity,
  Scale,
  Thermometer,
  Beaker,
  Radio,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const formTypeDetails = {
  all: { label: "Semua Tipe" },
  control_valve: {
    label: "Control Valve",
    icon: Activity,
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  timbangan: {
    label: "Timbangan",
    icon: Scale,
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  rtd: {
    label: "RTD",
    icon: Thermometer,
    color: "bg-red-100 text-red-800 border-red-200",
  },
  ph: {
    label: "pH",
    icon: Beaker,
    color: "bg-green-100 text-green-800 border-green-200",
  },
  transmitter: {
    label: "Transmitter",
    icon: Radio,
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
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

const ITEMS_PER_PAGE = 10;

const MONTH_OPTIONS = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

function normalizeDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getYearOptions(records: unknown[]) {
  const years = new Set<number>();

  records.forEach((record: any) => {
    if (!record?.date) return;
    const d = new Date(record.date);
    if (!Number.isNaN(d.getTime())) years.add(d.getFullYear());
  });

  const currentYear = new Date().getFullYear();
  years.add(currentYear);

  return Array.from(years).sort((a, b) => b - a);
}

export default function ReportsPage() {
  const currentDate = new Date();

  const [reportMode, setReportMode] = useState<"monthly" | "yearly">("monthly");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [monthFilter, setMonthFilter] = useState(String(currentDate.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(currentDate.getFullYear()));

  const { data: records, isLoading } = useListCalibrations();
  useEffect(() => {
  handleApplyPeriod();
}, []);
  const safeRecords = Array.isArray(records) ? records : [];

  const yearOptions = useMemo(() => getYearOptions(safeRecords), [safeRecords]);

  const selectedMonthLabel =
    MONTH_OPTIONS.find((m) => m.value === monthFilter)?.label || "-";

  const periodLabel =
    reportMode === "monthly"
      ? `${selectedMonthLabel} ${yearFilter}`
      : `Tahun ${yearFilter}`;

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const filtered = safeRecords.filter((record) => {
      const data = record.data as Record<string, unknown>;
      const status = (data?.status as string) || "";
      const recordDate = normalizeDate(record.date || null);

      const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

      const matchKeyword =
        !keyword ||
        (record.tagNo || "").toLowerCase().includes(keyword) ||
        (record.calibratedBy || "").toLowerCase().includes(keyword) ||
        (record.formType || "").toLowerCase().includes(keyword) ||
        (((data?.location as string) || "").toLowerCase().includes(keyword));

      const matchType = typeFilter === "all" || record.formType === typeFilter;
      const matchStatus = statusFilter === "all" || status === statusFilter;
      const matchDateFrom = !fromDate || (recordDate !== null && recordDate >= fromDate);
      const matchDateTo = !toDate || (recordDate !== null && recordDate <= toDate);

      return matchKeyword && matchType && matchStatus && matchDateFrom && matchDateTo;
    });

    filtered.sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;

      if (sortBy === "oldest") return aTime - bTime;
      if (sortBy === "tag-asc") return (a.tagNo || "").localeCompare(b.tagNo || "");
      if (sortBy === "tag-desc") return (b.tagNo || "").localeCompare(a.tagNo || "");
      return bTime - aTime;
    });

    return filtered;
  }, [safeRecords, search, typeFilter, statusFilter, dateFrom, dateTo, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter, dateFrom, dateTo, sortBy, reportMode]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredRecords.slice(start, end);
  }, [filteredRecords, currentPage]);

  const startItem = filteredRecords.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length);

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const applyMonthlyFilter = () => {
    const month = Number(monthFilter);
    const year = Number(yearFilter);
    if (!month || !year) return;

    const firstDate = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0);

    const from = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, "0")}-${String(firstDate.getDate()).padStart(2, "0")}`;
    const to = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;

    setDateFrom(from);
    setDateTo(to);
  };

  const applyYearlyFilter = () => {
    const year = Number(yearFilter);
    if (!year) return;

    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    setDateFrom(from);
    setDateTo(to);
  };

  const handleApplyPeriod = () => {
    if (reportMode === "monthly") {
      applyMonthlyFilter();
    } else {
      applyYearlyFilter();
    }
  };

  const handleResetToCurrentPeriod = () => {
    const now = new Date();
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSortBy("newest");

    if (reportMode === "monthly") {
      setMonthFilter(String(now.getMonth() + 1));
      setYearFilter(String(now.getFullYear()));

      const firstDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const from = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, "0")}-${String(firstDate.getDate()).padStart(2, "0")}`;
      const to = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;

      setDateFrom(from);
      setDateTo(to);
    } else {
      setYearFilter(String(now.getFullYear()));
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(`${now.getFullYear()}-12-31`);
    }
  };

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert("Tidak ada data untuk diexport");
      return;
    }

    const excelData = filteredRecords.map((record) => {
      const data = record.data as Record<string, unknown>;

      return {
        Date: record.date ? format(new Date(record.date), "yyyy-MM-dd") : "",
        TagNo: record.tagNo || "",
        Type:
          formTypeDetails[record.formType as keyof typeof formTypeDetails]?.label ||
          record.formType ||
          "",
        Location: (data?.location as string) || "",
        CalibratedBy: record.calibratedBy || "",
        Status: (data?.status as string) || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const fileName =
      reportMode === "monthly"
        ? `Report_Kalibrasi_${selectedMonthLabel}_${yearFilter}.xlsx`
        : `Report_Kalibrasi_Tahunan_${yearFilter}.xlsx`;

    saveAs(blob, fileName);
  };

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

  const typeSummary = [
    {
      key: "control_valve",
      label: "Control Valve",
      icon: formTypeDetails.control_valve.icon,
      color: formTypeDetails.control_valve.color,
      total: filteredRecords.filter((r) => r.formType === "control_valve").length,
    },
    {
      key: "timbangan",
      label: "Timbangan",
      icon: formTypeDetails.timbangan.icon,
      color: formTypeDetails.timbangan.color,
      total: filteredRecords.filter((r) => r.formType === "timbangan").length,
    },
    {
      key: "rtd",
      label: "RTD",
      icon: formTypeDetails.rtd.icon,
      color: formTypeDetails.rtd.color,
      total: filteredRecords.filter((r) => r.formType === "rtd").length,
    },
    {
      key: "ph",
      label: "pH",
      icon: formTypeDetails.ph.icon,
      color: formTypeDetails.ph.color,
      total: filteredRecords.filter((r) => r.formType === "ph").length,
    },
    {
      key: "transmitter",
      label: "Transmitter",
      icon: formTypeDetails.transmitter.icon,
      color: formTypeDetails.transmitter.color,
      total: filteredRecords.filter((r) => r.formType === "transmitter").length,
    },
  ];

  return (
  <div className="space-y-6 print-area">
      <div className="rounded-2xl border bg-card p-6 shadow-sm print-hide">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Laporan Kalibrasi</span>
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {reportMode === "monthly" ? "Report Bulanan" : "Report Tahunan"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Laporan kalibrasi otomatis dengan summary, print, export Excel, dan filter detail.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
  variant="outline"
  onClick={() => {
    const content = document.querySelector(".report-print-content")?.innerHTML;

    if (!content) {
      alert("Tidak ada data untuk dicetak");
      return;
    }

    const printWindow = window.open("", "", "width=900,height=700");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Report Kalibrasi</title>
          <style>
            body {
              font-family: Arial;
              padding: 20px;
              color: black;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid black;
              padding: 6px;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  }}
>
  <Printer className="mr-2 h-4 w-4" />
  Print Report
</Button>

            <Button variant="outline" onClick={handleExportExcel}>
              Export Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden print:block text-center mb-4">
        <div className="text-lg font-bold">PT. DONGJIN INDONESIA</div>
        <div className="text-sm font-semibold mt-1">
          {reportMode === "monthly" ? "LAPORAN KALIBRASI BULANAN" : "LAPORAN KALIBRASI TAHUNAN"}
        </div>
        <div className="text-xs mt-1">Periode: {periodLabel}</div>
        <div className="flex justify-between text-xs mt-2">
          <span>REV 00</span>
          <span>{format(new Date(), "dd MMM yyyy")}</span>
          <span>DJF</span>
        </div>
      </div>
      <hr style={{ margin: "10px 0", border: "2px solid black" }} />

      <Card className="rounded-2xl shadow-sm print-hide">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Periode Otomatis</CardTitle>
          </div>
          <CardDescription>Pilih mode laporan, lalu tentukan bulan/tahun atau tahun saja.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Mode Report</label>
              <Select value={reportMode} onValueChange={(v: "monthly" | "yearly") => setReportMode(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="yearly">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportMode === "monthly" && (
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Bulan</label>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Tahun</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={handleApplyPeriod}>
                {reportMode === "monthly" ? "Terapkan Bulanan" : "Terapkan Tahunan"}
              </Button>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={handleResetToCurrentPeriod}>
                {reportMode === "monthly" ? "Bulan Ini" : "Tahun Ini"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm print-hide">
        <CardHeader>
          <CardTitle>Filter Detail Report</CardTitle>
          <CardDescription>Gunakan filter tambahan untuk mempersempit laporan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari tag, user, tipe, lokasi..."
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

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Dari Tanggal</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Sampai Tanggal</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Urutkan</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih urutan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Tanggal Terbaru</SelectItem>
                  <SelectItem value="oldest">Tanggal Terlama</SelectItem>
                  <SelectItem value="tag-asc">Tag A-Z</SelectItem>
                  <SelectItem value="tag-desc">Tag Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end lg:col-span-3">
              <Button variant="outline" className="w-full lg:w-auto" onClick={handleResetToCurrentPeriod}>
                Reset ke {reportMode === "monthly" ? "Bulan Ini" : "Tahun Ini"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Total Data" value={totalCount} icon={ClipboardList} iconClass="bg-blue-100 text-blue-700" />
        <SummaryCard title="Selesai" value={doneCount} icon={CheckCircle2} iconClass="bg-green-100 text-green-700" />
        <SummaryCard title="On Progress" value={progressCount} icon={Clock3} iconClass="bg-yellow-100 text-yellow-700" />
        <SummaryCard title="Problem" value={problemCount} icon={AlertTriangle} iconClass="bg-red-100 text-red-700" />
      </div>

      <Card className="rounded-2xl shadow-sm print:shadow-none">

  <div className="report-print-content">

    {/* HEADER */}
    <div className="text-center mb-4">
      <div className="text-lg font-bold">PT. DONGJIN INDONESIA</div>
      <div className="text-sm font-semibold">
        {reportMode === "monthly"
          ? "LAPORAN KALIBRASI BULANAN"
          : "LAPORAN KALIBRASI TAHUNAN"}
      </div>
      <div className="text-xs">Periode: {periodLabel}</div>
    </div>

    {/* 🔥 TABEL HARUS DI SINI */}
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th>Tag No</th>
          <th>Type</th>
          <th>Location</th>
          <th>Calibrated By</th>
          <th>Date</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {paginatedRecords.map((record) => {
          const data = record.data as Record<string, unknown>;

          return (
            <tr key={record.id}>
              <td>{record.tagNo}</td>
              <td>{record.formType}</td>
              <td>{(data?.location as string) || "-"}</td>
              <td>{record.calibratedBy}</td>
              <td>{record.date ? format(new Date(record.date), "dd MMM yyyy") : "-"}</td>
              <td>{(data?.status as string) || "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>

  </div>

</Card>

      <Card className="rounded-2xl shadow-sm print:shadow-none">
        <CardHeader>
          <CardTitle>{reportMode === "monthly" ? "Data Report Bulanan" : "Data Report Tahunan"}</CardTitle>
          <CardDescription>
            Periode {periodLabel} — Menampilkan {startItem} - {endItem} dari {filteredRecords.length} data
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : paginatedRecords.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Tidak ada data report.</div>
          ) : (
            <>
              <table className="w-full border-collapse text-sm print:text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border p-2 text-left">Tag No</th>
                    <th className="border p-2 text-left">Type</th>
                    <th className="border p-2 text-left">Location</th>
                    <th className="border p-2 text-left">Calibrated By</th>
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => {
                    const data = record.data as Record<string, unknown>;
                    const status = (data?.status as string) || "-";

                    return (
                      <tr key={record.id} className="hover:bg-muted/20">
                        <td className="border p-2 font-medium">{record.tagNo || "-"}</td>
                        <td className="border p-2">
                          {formTypeDetails[record.formType as keyof typeof formTypeDetails]?.label ||
                            record.formType}
                        </td>
                        <td className="border p-2">{(data?.location as string) || "-"}</td>
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

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print-hide">
                <div className="text-sm text-muted-foreground">
                  Halaman <span className="font-semibold text-foreground">{currentPage}</span> dari{" "}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Prev
                  </Button>

                  {visiblePages.map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="min-w-9"
                    >
                      {page}
                    </Button>
                  ))}

                  <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="hidden print:block mt-12">
        <div className="grid grid-cols-3 text-center text-sm">
          <div>
            <div>Disiapkan Oleh</div>
            <div className="mt-16">(____________)</div>
          </div>
          <div>
            <div>Diperiksa</div>
            <div className="mt-16">(____________)</div>
          </div>
          <div>
            <div>Disetujui</div>
            <div className="mt-16">(____________)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}) {
  return (
    <Card className="rounded-2xl shadow-sm print:shadow-none">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl p-3 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}