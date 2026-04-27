import { useEffect, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { useGetCalibration } from "@workspace/api-client-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

export default function StickerPage() {
  const [, params] = useRoute("/records/:id/sticker");
  const id = Number(params?.id);

  const { data: record, isLoading } = useGetCalibration(id, {
    query: { enabled: !!id },
  });

  const PUBLIC_BASE_URL = window.location.origin;

  const qrUrl = useMemo(() => {
    if (!record) return "";
    return `${PUBLIC_BASE_URL}/public/calibration/${record.id}`;
  }, [record, PUBLIC_BASE_URL]);

  useEffect(() => {
    if (!record) return;

    const urlParams = new URLSearchParams(window.location.search);
    const autoPrint = urlParams.get("autoPrint");

    if (autoPrint === "1") {
      document.body.classList.add("print-sticker-mode");

      const timer = setTimeout(() => {
        window.print();

        setTimeout(() => {
          document.body.classList.remove("print-sticker-mode");
        }, 300);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [record]);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!record) {
    return <div className="p-6">Data tidak ditemukan</div>;
  }

  const data = (record.data as Record<string, any>) || {};
  const formTypeLabel =
    record.formType === "control_valve"
      ? "Control Valve"
      : record.formType === "timbangan"
      ? "Timbangan"
      : record.formType === "rtd"
      ? "RTD"
      : record.formType === "ph"
      ? "pH"
      : record.formType === "transmitter"
      ? "Transmitter"
      : record.formType;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/records/${record.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </Link>

        <Button
          onClick={() => {
            document.body.classList.add("print-sticker-mode");
            window.print();
            setTimeout(() => {
              document.body.classList.remove("print-sticker-mode");
            }, 300);
          }}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Stiker
        </Button>
      </div>

      <div className="flex justify-center">
        <div className="sticker-print rounded-[10mm] border border-black bg-white p-[3mm] text-center text-black">
          <div className="text-[10px] font-semibold">CALIBRATION DATA</div>

          <div className="mt-[2mm] text-[16px] font-bold leading-tight">
            {record.tagNo || "-"}
          </div>

          <div className="mt-[1mm] text-[10px]">{formTypeLabel}</div>

          <div className="mt-[2mm] flex justify-center">
            <QRCodeCanvas value={qrUrl} size={110} />
          </div>

          <div className="mt-[2mm] text-[9px]">
            CAL: {record.date ? format(new Date(record.date), "dd-MM-yy") : "-"}
          </div>

          <div className="mt-[1mm] text-[9px] font-semibold">
            DUE: {data?.calDueDate ? format(new Date(data.calDueDate), "dd-MM-yy") : "-"}
          </div>

          <div className="mt-[2mm] text-[8px]">PT. DONGJIN INDONESIA</div>
        </div>
      </div>
    </div>
  );
}