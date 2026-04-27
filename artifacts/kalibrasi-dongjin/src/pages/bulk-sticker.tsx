import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useListCalibrations } from "@workspace/api-client-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

const formTypeLabelMap: Record<string, string> = {
  control_valve: "Control Valve",
  timbangan: "Timbangan",
  rtd: "RTD",
  ph: "pH",
  transmitter: "Transmitter",
};

export default function BulkStickerPage() {
  const params = new URLSearchParams(window.location.search);

  const ids = (params.get("ids") || "")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter(Boolean);

  const mode = params.get("mode") || "brother"; // brother | tj
  const autoPrint = params.get("autoPrint") === "1";

  const { data: records, isLoading } = useListCalibrations();
  const safeRecords = Array.isArray(records) ? records : [];

  const selectedRecords = useMemo(() => {
    return safeRecords.filter((r) => ids.includes(r.id));
  }, [safeRecords, ids]);

  const PUBLIC_BASE_URL = window.location.origin;

  const handlePrint = () => {
    document.body.classList.add("print-sticker-mode");

    if (mode === "brother") {
      document.body.classList.add("brother-roll-mode");
    } else {
      document.body.classList.add("tj-sheet-mode");
    }

    window.print();

    setTimeout(() => {
      document.body.classList.remove("print-sticker-mode");
      document.body.classList.remove("brother-roll-mode");
      document.body.classList.remove("tj-sheet-mode");
    }, 300);
  };

  useEffect(() => {
    if (!autoPrint) return;
    if (selectedRecords.length === 0) return;

    const t = setTimeout(handlePrint, 700);
    return () => clearTimeout(t);
  }, [autoPrint, selectedRecords.length]);

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (selectedRecords.length === 0)
    return <div className="p-6">Data tidak ditemukan</div>;

  return (
    <div className="bulk-sticker-page p-6">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/records">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>

        <div className="flex gap-2">
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print ({mode === "brother" ? "Brother Roll" : "Tom & Jerry"})
          </Button>
        </div>
      </div>

      {/* CONTAINER */}
      <div
        className={
          mode === "brother"
            ? "brother-roll-sheet"
            : "tj-sheet"
        }
      >
        {selectedRecords.map((record) => {
          const data = (record.data as Record<string, any>) || {};
          const qrUrl = `${PUBLIC_BASE_URL}/public/calibration/${record.id}`;
          const formTypeLabel =
            formTypeLabelMap[record.formType] || record.formType;

          return (
            <div
              key={record.id}
              className={
                mode === "brother"
                  ? "brother-roll-item"
                  : "tj-item"
              }
            >
              <div className="sticker-print rounded-[10mm] border border-black bg-white p-[3mm] text-center text-black">
                <div className="text-[10px] font-semibold">
                  CALIBRATION DATA
                </div>

                <div className="mt-[2mm] text-[16px] font-bold">
                  {record.tagNo || "-"}
                </div>

                <div className="text-[10px]">{formTypeLabel}</div>

                <div className="mt-[2mm] flex justify-center">
                  <QRCodeCanvas value={qrUrl} size={100} />
                </div>

                <div className="text-[9px] mt-[2mm]">
                  CAL:{" "}
                  {record.date
                    ? format(new Date(record.date), "dd-MM-yy")
                    : "-"}
                </div>

                <div className="text-[9px] font-bold">
                  DUE:{" "}
                  {data?.calDueDate
                    ? format(new Date(data.calDueDate), "dd-MM-yy")
                    : "-"}
                </div>

                <div className="text-[8px] mt-[1mm]">
                  PT. DONGJIN INDONESIA
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}