import * as XLSX from "xlsx";
import { exportCalibrationPdf } from "@/utils/exportPdf";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  useListCalibrations,
  getListCalibrationsQueryKey,
  useDeleteCalibration,
  getGetCalibrationSummaryQueryKey,
} from "@workspace/api-client-react";
import { CalibrationRecordFormType } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Search,
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  ClipboardList,
  Filter,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileDown,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  X,
} from "lucide-react";

const formTypeDetails = {
  control_valve: {
    label: "Control Valve",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  timbangan: {
    label: "Timbangan",
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  rtd: {
    label: "RTD",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  ph: {
    label: "pH",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  transmitter: {
    label: "Transmitter",
    color: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

const statusColorMap: Record<string, string> = {
  "Selesai Kalibrasi": "bg-green-100 text-green-700 border-green-200",
  "On Progress": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Belum Dikerjakan": "bg-slate-100 text-slate-700 border-slate-200",
  "Tidak bisa di Kalibrasi": "bg-red-100 text-red-700 border-red-200",
};

const ITEMS_PER_PAGE = 10;

function daysDiff(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);

  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";

  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

function getDueInfo(dueDate?: string) {
  if (!dueDate) {
    return {
      rowClass: "hover:bg-blue-50/70",
      badge: null as null | {
        label: string;
        className: string;
        icon: "overdue" | "soon" | "safe";
      },
    };
  }

  function getDueText(dueDate?: string) {
    if (!dueDate) return "-";

    const diff = daysDiff(dueDate);

    if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
    if (diff === 0) return "Jatuh tempo hari ini";
    return `${diff} hari lagi`;
  }

  const diff = daysDiff(dueDate);

  if (diff < 0) {
    return {
      rowClass: "bg-red-50/70 hover:bg-red-50",
      badge: {
        label: "Overdue",
        className: "bg-red-100 text-red-700 border-red-200",
        icon: "overdue" as const,
      },
    };
  }

  if (diff <= 30) {
    return {
      rowClass: "bg-yellow-50/70 hover:bg-yellow-50",
      badge: {
        label: "Due Soon",
        className: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: "soon" as const,
      },
    };
  }

  return {
    rowClass: "hover:bg-blue-50/70",
    badge: {
      label: "Aman",
      className: "bg-green-100 text-green-700 border-green-200",
      icon: "safe" as const,
    },
  };
}

function getDueText(dueDate?: string) {
  if (!dueDate) return "-";

  const diff = daysDiff(dueDate);

  if (diff < 0) return `Lewat ${Math.abs(diff)} hari`;
  if (diff === 0) return "Jatuh tempo hari ini";

  return `${diff} hari lagi`;
}

function DueBadge({ dueDate }: { dueDate?: string }) {
  const info = getDueInfo(dueDate);

  if (!info.badge) return <span className="text-muted-foreground">-</span>;

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${info.badge.className}`}
    >
      {info.badge.icon === "overdue" && <AlertTriangle className="mr-1 h-3 w-3" />}
      {info.badge.icon === "soon" && <BellRing className="mr-1 h-3 w-3" />}
      {info.badge.icon === "safe" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {info.badge.label}
    </Badge>
  );
}

export default function Records() {
  const [search, setSearch] = useState("");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "soon" | "safe">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showPrinterPopup, setShowPrinterPopup] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const role = user?.role || "";

  const canCreate = ["admin_it", "section_chief", "pic", "foreman", "teknisi"].includes(role);

  const canEdit = (recordUserId?: number | null) => {
    if (role === "pic") return false;
    if (role === "teknisi") return recordUserId === user?.id;
    return ["admin_it", "section_chief", "foreman"].includes(role);
  };

  const canDelete = (recordUserId?: number | null) => {
    if (["pic", "foreman"].includes(role)) return false;
    if (role === "teknisi") return recordUserId === user?.id;
    return ["admin_it", "section_chief"].includes(role);
  };

  const queryParams =
    typeFilter !== "all"
      ? { formType: typeFilter as CalibrationRecordFormType }
      : undefined;

  const { data: records, isLoading } = useListCalibrations(queryParams, {
    query: { queryKey: getListCalibrationsQueryKey(queryParams) },
  });

  const deleteMutation = useDeleteCalibration({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Dihapus",
          description: "Data kalibrasi berhasil dihapus.",
        });
        queryClient.invalidateQueries({ queryKey: getListCalibrationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCalibrationSummaryQueryKey() });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Gagal menghapus data.",
          variant: "destructive",
        });
      },
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Hapus data kalibrasi ini?")) {
      deleteMutation.mutate({ id });
    }
  };

  const safeRecords = Array.isArray(records) ? records : [];

  const summary = useMemo(() => {
    let overdue = 0;
    let soon = 0;
    let safe = 0;

    safeRecords.forEach((r) => {
      const data = r.data as Record<string, unknown>;
      const dueDate = data?.calDueDate as string | undefined;

      if (!dueDate) return;

      const diff = daysDiff(dueDate);

      if (diff < 0) overdue++;
      else if (diff <= 30) soon++;
      else safe++;
    });

    return {
      total: safeRecords.length,
      overdue,
      soon,
      safe,
    };
  }, [safeRecords]);

  const typeSummary = useMemo(() => {
  const result: Record<string, number> = {};

  safeRecords.forEach((r) => {
    const label =
      formTypeDetails[r.formType as keyof typeof formTypeDetails]?.label ||
      r.formType;

    result[label] = (result[label] || 0) + 1;
  });

  return Object.entries(result).map(([label, count]) => ({
    label,
    count,
  }));
}, [safeRecords]);

const maxTypeCount = Math.max(1, ...typeSummary.map((i) => i.count));
   
//NANTI PAKAI LAGI/

  const stickerableRecords = safeRecords.filter(
    (r) => ((r.data as Record<string, unknown>)?.status as string) === "Selesai Kalibrasi",
  );

  const handleBulkPrintAll = () => {
    if (stickerableRecords.length === 0) {
      alert("Tidak ada data dengan status Selesai Kalibrasi untuk dicetak.");
      return;
    }

    const ids = stickerableRecords.map((r) => r.id).join(",");
    window.open(`/bulk-sticker?ids=${ids}&mode=brother&autoPrint=1`, "_blank");
  };

  const handleBulkPrintBrother = () => {
    if (selectedIds.length === 0) {
      alert("Pilih minimal satu record untuk dicetak.");
      return;
    }

    const ids = selectedIds.join(",");
    window.open(`/bulk-sticker?ids=${ids}&mode=brother&autoPrint=1`, "_blank");
    setShowPrinterPopup(false);
  };

  const handleBulkPrintTJ = () => {
    if (selectedIds.length === 0) {
      alert("Pilih minimal satu record untuk dicetak.");
      return;
    }

    const ids = selectedIds.join(",");
    window.open(`/bulk-sticker?ids=${ids}&mode=tj&autoPrint=1`, "_blank");
    setShowPrinterPopup(false);
  };

  const filteredRecords = useMemo(() => {
  const term = search.trim().toLowerCase();

  return safeRecords.filter((r) => {
    const data = r.data as Record<string, unknown>;
    const dueDate = data?.calDueDate as string | undefined;

    if (dueFilter !== "all") {
      if (!dueDate) return false;

      const diff = daysDiff(dueDate);

      if (dueFilter === "overdue" && diff >= 0) return false;
      if (dueFilter === "soon" && (diff < 0 || diff > 30)) return false;
      if (dueFilter === "safe" && diff <= 30) return false;
    }

    if (!term) return true;

    return (
      (r.tagNo || "").toLowerCase().includes(term) ||
      (r.calibratedBy || "").toLowerCase().includes(term) ||
      (r.formType || "").toLowerCase().includes(term) ||
      ((data?.location as string) || "").toLowerCase().includes(term) ||
      ((data?.status as string) || "").toLowerCase().includes(term) ||
      ((data?.calDueDate as string) || "").toLowerCase().includes(term)
    );
  });
}, [safeRecords, search, dueFilter]);

  useEffect(() => {
    setCurrentPage(1);
      }, [search, typeFilter, dueFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredRecords.slice(start, end);
  }, [filteredRecords, currentPage]);

  const startItem = filteredRecords.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const paginatedStickerableIds = paginatedRecords
    .filter((r) => ((r.data as Record<string, unknown>)?.status as string) === "Selesai Kalibrasi")
    .map((r) => r.id);

  const allPaginatedStickerableSelected =
    paginatedStickerableIds.length > 0 &&
    paginatedStickerableIds.every((id) => selectedIds.includes(id));

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleSelectPage = () => {
  if (allPaginatedStickerableSelected) {
    setSelectedIds((prev) =>
      prev.filter((id) => !paginatedStickerableIds.includes(id))
    );
    return;
  }

  setSelectedIds((prev) =>
    Array.from(new Set([...prev, ...paginatedStickerableIds]))
  );
};

const clearSelected = () => setSelectedIds([]);

const handleExportExcel = () => {
  const rows = filteredRecords.map((record) => {
    const data = record.data as Record<string, unknown>;
    const dueDate = data?.calDueDate as string | undefined;

    return {
      "Tag No": record.tagNo || "-",
      Type:
        formTypeDetails[
          record.formType as keyof typeof formTypeDetails
        ]?.label || record.formType,
      "Calibrated By": record.calibratedBy || "-",
      Date: formatDate(record.date),
      "Due Date": formatDate(dueDate),
      Reminder: getDueText(dueDate),
      Status: (data?.status as string) || "-",
      Location: (data?.location as string) || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Kalibrasi");

  XLSX.writeFile(
    workbook,
    `data-kalibrasi-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}; 

    return (
      <div className="space-y-6">
        {showPrinterPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">Pilih Jenis Label</h2>
                  <p className="text-sm text-muted-foreground">
                    Cetak {selectedIds.length} stiker terpilih
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrinterPopup(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="h-14 w-full justify-start rounded-xl"
                  onClick={handleBulkPrintBrother}
                >
                  <Printer className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Brother Roll</div>
                    <div className="text-xs text-muted-foreground">
                      DK-22205 / roll 62mm
                    </div>
                  </div>
                </Button>

                <Button
                  className="h-14 w-full justify-start rounded-xl"
                  onClick={handleBulkPrintTJ}
                >
                  <Printer className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Tom & Jerry Label No.103</div>
                    <div className="text-xs text-primary-foreground/80">
                      Sheet / grid label
                    </div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowPrinterPopup(false)}
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 p-6 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-blue-100">
              <ClipboardList className="h-4 w-4" />
              <span className="font-medium">Data Kalibrasi</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">All Records</h1>
            <p className="max-w-2xl text-sm text-blue-100">
              Kelola, filter, cetak stiker, dan export seluruh data kalibrasi instrument.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <Button asChild className="h-11 rounded-xl px-5 shadow-sm">
                <Link href="/new" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  New Record
                </Link>
              </Button>
            )}

            <Button variant="outline" className="h-11 rounded-xl px-5 shadow-sm" onClick={handleBulkPrintAll}>
              <Printer className="mr-2 h-4 w-4" />
              Bulk Print Semua
            </Button>

            <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl px-5 shadow-sm"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-xl px-5 shadow-sm"
              onClick={() => exportCalibrationPdf(filteredRecords)}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>

            <Button
              variant="ghost"
              className="h-11 rounded-xl px-5 shadow-sm"
              onClick={() => setDueFilter("all")}
  >
            Reset Filter
            </Button>
          </div>

            <Button
              className="h-11 rounded-xl px-5 shadow-sm"
              onClick={() => {
                if (selectedIds.length === 0) {
                  alert("Pilih minimal satu record untuk dicetak.");
                  return;
                }
                setShowPrinterPopup(true);
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Terpilih ({selectedIds.length})
            </Button>

            {selectedIds.length > 0 && (
              <Button variant="outline" className="h-11 rounded-xl border-white/30 bg-white/10 px-5 text-white hover:bg-white/20" onClick={clearSelected}>
                Clear Selection
              </Button>
            )}
          </div>
          </div>
        </div>

<div className="grid grid-cols-2 gap-4 md:grid-cols-4">

  <button
    type="button"
    onClick={() => setDueFilter("all")}
    className={`rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl ${dueFilter === "all" ? "ring-2 ring-blue-600" : ""}`}
  >
    <p className="text-sm text-muted-foreground">Total</p>
    <p className="text-2xl font-bold">{summary.total}</p>
  </button>

  <button
    type="button"
    onClick={() => setDueFilter("overdue")}
    className={`rounded-3xl border border-red-200 bg-gradient-to-br from-red-100 to-white p-5 text-left shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl ${dueFilter === "overdue" ? "ring-2 ring-red-500" : ""}`}
  >
    <p className="text-sm text-red-600">Overdue</p>
    <p className="text-2xl font-bold text-red-700">{summary.overdue}</p>
  </button>

  <button
    type="button"
    onClick={() => setDueFilter("soon")}
    className={`rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-100 to-white p-5 text-left shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl ${dueFilter === "soon" ? "ring-2 ring-yellow-500" : ""}`}
  >
    <p className="text-sm text-yellow-600">Due Soon</p>
    <p className="text-2xl font-bold text-yellow-700">{summary.soon}</p>
  </button>

  <button
    type="button"
    onClick={() => setDueFilter("safe")}
    className={`rounded-3xl border border-green-200 bg-gradient-to-br from-green-100 to-white p-5 text-left shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl ${dueFilter === "safe" ? "ring-2 ring-green-500" : ""}`}
  >
    <p className="text-sm text-green-600">Aman</p>
    <p className="text-2xl font-bold text-green-700">{summary.safe}</p>
  </button>
</div>

<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md">
  <div className="mb-4">
    <h2 className="text-lg font-bold">Grafik Equipment</h2>
    <p className="text-sm text-muted-foreground">
      Jumlah berdasarkan jenis alat
    </p>
  </div>

  <div className="space-y-4">
    {typeSummary.map((item) => (
      <div key={item.label} className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>{item.label}</span>
          <span>{item.count}</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${(item.count / maxTypeCount) * 100}%`,
            }}
          />
        </div>
      </div>
    ))}
  </div>
</div>

<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md">
  <div className="mb-4 flex items-center gap-2">
    <Filter className="h-4 w-4 text-muted-foreground" />
    <h2 className="text-sm font-semibold">Filter & Search</h2>
  </div>

  <div className="flex flex-col gap-4 lg:flex-row">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Cari Tag No, User, Type, Location, Status, Due Date..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-11 rounded-xl pl-9"
      />
    </div>

    <Select value={typeFilter} onValueChange={setTypeFilter}>
      <SelectTrigger className="h-11 w-full rounded-xl lg:w-[220px]">
        <SelectValue placeholder="Filter by Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Tipe</SelectItem>
        <SelectItem value="control_valve">Control Valve</SelectItem>
        <SelectItem value="timbangan">Timbangan</SelectItem>
        <SelectItem value="rtd">RTD</SelectItem>
        <SelectItem value="ph">pH</SelectItem>
        <SelectItem value="transmitter">Transmitter</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div className="mt-4 text-sm text-muted-foreground">
    Menampilkan <span className="font-semibold text-foreground">{startItem}</span>
    {" - "}
    <span className="font-semibold text-foreground">{endItem}</span>
    {" dari "}
    <span className="font-semibold text-foreground">{filteredRecords.length}</span> data
  </div>
</div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
                  <TableHead className="h-12 w-[50px] text-center">
                    <input
                      type="checkbox"
                      checked={allPaginatedStickerableSelected}
                      onChange={toggleSelectPage}
                      title="Pilih semua stiker di halaman ini"
                    />
                  </TableHead>
                  <TableHead className="h-12 min-w-[140px]">Tag No</TableHead>
                  <TableHead className="min-w-[150px]">Type</TableHead>
                  <TableHead className="min-w-[160px]">Calibrated By</TableHead>
                  <TableHead className="min-w-[120px]">Date</TableHead>
                  <TableHead className="min-w-[140px]">Due Date</TableHead>
                  <TableHead className="min-w-[140px]">Reminder</TableHead>
                  <TableHead className="min-w-[160px]">Status</TableHead>
                  <TableHead className="min-w-[340px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="ml-auto h-9 w-64" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ClipboardList className="h-8 w-8 opacity-50" />
                        <p className="font-medium">Tidak ada data kalibrasi</p>
                        <p className="text-sm">
                          Coba ubah kata kunci pencarian atau filter tipe.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => {
                    const details =
                      formTypeDetails[record.formType as keyof typeof formTypeDetails];
                    const recordData = record.data as Record<string, unknown>;
                    const status = recordData?.status as string | undefined;
                    const dueDate = recordData?.calDueDate as string | undefined;
                    const dueInfo = getDueInfo(dueDate);
                    const showEdit = canEdit(record.userId);
                    const showDelete = canDelete(record.userId);
                    const showSticker = status === "Selesai Kalibrasi";
                    const isChecked = selectedIds.includes(record.id);

                    return (
                      <TableRow key={record.id} className={dueInfo.rowClass}>
                        <TableCell className="text-center">
                          {showSticker ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(record.id)}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className="font-semibold">
                          {record.tagNo || "-"}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${details?.color ?? ""}`}
                          >
                            {details?.label || record.formType}
                          </Badge>
                        </TableCell>

                        <TableCell>{record.calibratedBy || "-"}</TableCell>

                        <TableCell>
                          {formatDate(record.date)}
                        </TableCell>

                        <TableCell>
                          {formatDate(dueDate)}
                        </TableCell>

                        <TableCell>{dueDate || "-"}</TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <DueBadge dueDate={dueDate} />
                            <span className="text-xs text-muted-foreground">
                              {getDueText(dueDate)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          {status ? (
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColorMap[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
                            >
                              {status}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="rounded-lg" asChild>
                              <Link href={`/records/${record.id}`}>
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View
                              </Link>
                            </Button>

                            {showSticker && (
                              <>
                                <Button variant="outline" size="sm" className="rounded-lg" asChild>
                                  <Link href={`/records/${record.id}/sticker`}>
                                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                                    Stiker
                                  </Link>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() =>
                                    window.open(`/records/${record.id}/sticker?autoPrint=1`, "_blank")
                                  }
                                >
                                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                                  Auto Print
                                </Button>
                              </>
                            )}

                            {showEdit && (
                              <Button variant="outline" size="sm" className="rounded-lg" asChild>
                                <Link href={`/records/${record.id}/edit`}>
                                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                                  Edit
                                </Link>
                              </Button>
                            )}

                            {showDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDelete(record.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && filteredRecords.length > 0 && (
            <div className="flex flex-col gap-4 border-t bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Halaman <span className="font-semibold text-foreground">{currentPage}</span> dari{" "}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }