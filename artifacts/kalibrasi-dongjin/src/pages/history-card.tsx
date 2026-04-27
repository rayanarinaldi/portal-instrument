import { useEffect, useMemo, useState } from "react";
import { useListCalibrations } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Search, FileDown, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { QRCodeCanvas } from "qrcode.react";

const STATUS_COLORS: Record<string, string> = {
  "Selesai Kalibrasi": "text-green-700",
  "On Progress": "text-blue-700",
  "Belum Dikerjakan": "text-gray-600",
  "Tidak bisa di Kalibrasi": "text-red-700",
};

const ROWS_PER_PAGE = 12;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function daysDiff(dateStr?: string) {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);

  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dueClass(dueDate?: string) {
  const diff = daysDiff(dueDate);

  if (diff === null) return "";
  if (diff < 0) return "history-overdue";
  if (diff <= 30) return "history-due-soon";

  return "";
}

function chunkArray<T>(arr: T[], size: number) {
  const result: T[][] = [];

  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }

  return result.length ? result : [[]];
}

export default function HistoryCard() {
  const [tagNo, setTagNo] = useState("");
  const [location, setLocation] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: records, isLoading } = useListCalibrations();
  const safeRecords = Array.isArray(records) ? records : [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qTag = params.get("tagNo");

    if (qTag) {
      setTagNo(qTag);
      setSubmitted(true);
    }
  }, []);

  useEffect(() => {
    const cleanTag = normalizeText(tagNo);
    if (!cleanTag || safeRecords.length === 0) return;

    const exactMatches = safeRecords.filter(
      (r) => normalizeText(r.tagNo ?? "") === cleanTag
    );

    const partialMatches = safeRecords.filter((r) =>
      normalizeText(r.tagNo ?? "").includes(cleanTag)
    );

    const candidates = (exactMatches.length > 0 ? exactMatches : partialMatches).sort(
      (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
    );

    const latest = candidates[0];

    const latestLocation =
      ((latest?.data as Record<string, unknown>)?.location as string | undefined) || "";

    if (latestLocation) {
      setLocation(latestLocation);
    }
  }, [tagNo, safeRecords]);

  const filtered = useMemo(() => {
    return safeRecords
      .filter((r) => {
        const loc = (r.data as Record<string, unknown>)?.location as string | undefined;

        const matchTag = tagNo
          ? normalizeText(r.tagNo ?? "").includes(normalizeText(tagNo))
          : true;

        const matchLoc = location
          ? normalizeText(loc ?? "").includes(normalizeText(location))
          : true;

        return matchTag && matchLoc;
      })
      .sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
  }, [safeRecords, tagNo, location]);

  const pages = useMemo(() => chunkArray(filtered, ROWS_PER_PAGE), [filtered]);

  const historyUrl = tagNo.trim()
    ? `${window.location.origin}/public/history/${encodeURIComponent(tagNo.trim())}`
    : `${window.location.origin}/history-card`;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handlePrint = () => {
    document.body.classList.add("print-history-mode");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-history-mode");
    }, 300);
  };

  const handleExportPdf = () => {
    document.body.classList.add("print-history-mode");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-history-mode");
    }, 300);
  };

  const handleReset = () => {
    setTagNo("");
    setLocation("");
    setSubmitted(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm print-hide lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Instrument Calibration
          </div>
          <h1 className="text-2xl font-bold tracking-tight">History Card</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cari history alat berdasarkan Tag No. Lokasi akan otomatis mengikuti history terbaru.
          </p>
        </div>

        {submitted && filtered.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportPdf}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>

            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Cetak
            </Button>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSearch}
        className="rounded-2xl border bg-card p-5 shadow-sm print-hide"
      >
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <div className="space-y-1">
            <Label className="text-sm">Tag No.</Label>
            <Input
              value={tagNo}
              onChange={(e) => setTagNo(e.target.value)}
              placeholder="Cari Tag No..."
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Auto dari Tag No..."
              className="h-11 rounded-xl"
            />
          </div>

          <Button type="submit" className="h-11 rounded-xl px-5">
            <Search className="mr-2 h-4 w-4" />
            Cari
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl px-5"
            onClick={handleReset}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </form>

      {!submitted && (
        <div className="rounded-2xl border bg-card py-12 text-center text-sm text-muted-foreground print-hide">
          Masukkan Tag No atau Location, lalu klik Cari untuk menampilkan history card.
        </div>
      )}

      {submitted && !isLoading && (
        <div className="history-print-area bg-white text-black">
          {pages.map((pageRecords, pageIndex) => (
            <HistoryPaper
              key={pageIndex}
              pageRecords={pageRecords}
              pageIndex={pageIndex}
              totalPages={pages.length}
              tagNo={tagNo}
              location={location}
              historyUrl={historyUrl}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
          Memuat data...
        </div>
      )}
    </div>
  );
}

function HistoryPaper({
  pageRecords,
  pageIndex,
  totalPages,
  tagNo,
  location,
  historyUrl,
}: {
  pageRecords: any[];
  pageIndex: number;
  totalPages: number;
  tagNo: string;
  location: string;
  historyUrl: string;
}) {
  return (
    <div className="history-card-paper">
      <div className="history-header">
        <div className="history-logo-box">
          <div className="text-base font-bold">DONGJIN</div>
          <div className="mt-1 text-[10px] leading-tight">
            PT. DONGJIN
            <br />
            INDONESIA
          </div>
        </div>

        <div className="history-title-box">
          INSTRUMENT CALIBRATION HISTORY CARD
        </div>

        <div className="history-qr-box">
          <QRCodeCanvas value={historyUrl} size={56} />
          <div className="mt-1 text-[8px]">SCAN HISTORY</div>
        </div>
      </div>

      <div className="history-info-row">
        <div>
          <span className="history-info-label">TAG NO</span>
          <span className="history-info-value">: {tagNo || "-"}</span>
        </div>

        <div>
          <span className="history-info-label">LOCATION</span>
          <span className="history-info-value">: {location || "-"}</span>
        </div>
      </div>

      <table className="history-table">
        <thead>
          <tr>
            <th className="w-[45px]">NO</th>
            <th className="w-[120px]">DATE</th>
            <th>DESCRIPTION</th>
            <th className="w-[150px]">WORKER</th>
            <th className="w-[155px]">STATUS / CONDITION</th>
          </tr>
        </thead>

        <tbody>
          {pageRecords.length === 0 ? (
            <tr>
              <td colSpan={5} className="h-20 text-center text-sm text-gray-500">
                Tidak ada data ditemukan.
              </td>
            </tr>
          ) : (
            pageRecords.map((record, idx) => {
              const data = record.data as Record<string, unknown>;
              const note = (data.note ?? data.remarks ?? "-") as string;
              const status = (data.status ?? "-") as string;
              const calDueDate = data.calDueDate as string | undefined;

              const dateStr = record.date
                ? (() => {
                    try {
                      return format(new Date(record.date), "dd MMM yyyy");
                    } catch {
                      return record.date;
                    }
                  })()
                : "-";

              const rowNo = pageIndex * ROWS_PER_PAGE + idx + 1;

              return (
                <tr key={record.id} className={dueClass(calDueDate)}>
                  <td className="text-center">{rowNo}</td>
                  <td className="text-center">{dateStr}</td>
                  <td>{note || "-"}</td>
                  <td className="text-center">{record.calibratedBy || "-"}</td>
                  <td className={`text-center font-medium ${STATUS_COLORS[status] ?? ""}`}>
                    {status || "-"}
                  </td>
                </tr>
              );
            })
          )}

          {Array.from({ length: Math.max(ROWS_PER_PAGE - pageRecords.length, 0) }).map(
            (_, i) => (
              <tr key={`empty-${i}`}>
                <td>&nbsp;</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            )
          )}
        </tbody>
      </table>

      <div className="history-page-number">
        Page {pageIndex + 1} / {totalPages}
      </div>

      <div className="history-footer">
        <div>REV. 00 (2024.03.12)</div>
        <div>PT. DONGJIN INDONESIA</div>
        <div>DJF-J-M3-005</div>
      </div>
    </div>
  );
}