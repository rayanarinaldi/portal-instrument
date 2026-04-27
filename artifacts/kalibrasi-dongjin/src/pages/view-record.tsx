import { useParams, useLocation, Link } from "wouter";
import { useGetCalibration } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, Edit, Trash2, QrCode } from "lucide-react";
import {
  useDeleteCalibration,
  getListCalibrationsQueryKey,
  getGetCalibrationSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

const FORM_LABELS: Record<string, string> = {
  control_valve: "Control Valve",
  timbangan: "Timbangan",
  rtd: "RTD",
  ph: "pH",
  transmitter: "Transmitter",
};

const DOC_INFO: Record<string, { noDoc: string; noRevisi: string }> = {
  control_valve: { noDoc: "DJF-J-M3-007", noRevisi: "REV. 01 (2024.07.02)" },
  timbangan: { noDoc: "DJF-J-M3-003", noRevisi: "REV. 01 (2025.01.03)" },
  rtd: { noDoc: "DJF-J-M3-001", noRevisi: "REV. 00 (2025.01.03)" },
  ph: { noDoc: "DJF-J-M3-011", noRevisi: "REV. 00 (2025.01.03)" },
  transmitter: { noDoc: "DJF-J-M3-009", noRevisi: "REV. 00 (2024.03.27)" },
};

const STATUS_COLOR: Record<string, string> = {
  "Selesai Kalibrasi": "bg-green-100 text-green-800",
  "On Progress": "bg-yellow-100 text-yellow-800",
  "Belum Dikerjakan": "bg-gray-100 text-gray-700",
  "Tidak bisa di Kalibrasi": "bg-red-100 text-red-800",
};

export default function ViewRecord() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: record, isLoading, error } = useGetCalibration(id, {
    query: { enabled: !!id },
  });

  const deleteMutation = useDeleteCalibration({
    mutation: {
      onSuccess: () => {
        toast({ title: "Dihapus", description: "Data kalibrasi berhasil dihapus." });
        queryClient.invalidateQueries({ queryKey: getListCalibrationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCalibrationSummaryQueryKey() });
        setLocation("/records");
      },
      onError: () => {
        toast({ title: "Error", description: "Gagal menghapus data.", variant: "destructive" });
      },
    },
  });

  const handleRecordPrint = () => {
    document.body.classList.add("print-record-mode");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-record-mode");
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !record) {
    return <div className="p-8 text-center text-destructive">Gagal memuat data.</div>;
  }

  const role = user?.role || "";
  const recordUserId = record.userId;
  const canEdit = role !== "pic" && (role !== "teknisi" || recordUserId === user?.id);
  const canDelete =
    !["pic", "foreman"].includes(role) && (role !== "teknisi" || recordUserId === user?.id);

  const data = record.data as Record<string, unknown>;
  const formLabel = FORM_LABELS[record.formType] || record.formType;
  const docInfo = DOC_INFO[record.formType];
  const status = data?.status as string | undefined;
  const showSticker = status === "Selesai Kalibrasi";

  const handleDelete = () => {
    if (confirm("Hapus data kalibrasi ini?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="record-print-area print-page mx-auto max-w-5xl space-y-4 print:pb-16">
      <div className="flex items-center justify-between print-hide">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/records")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Data Kalibrasi — {formLabel}
            </h1>
            <p className="text-sm text-muted-foreground">
              {record.tagNo ? `Tag: ${record.tagNo}` : ""}
            </p>
          </div>

          {status && (
            <Badge className={STATUS_COLOR[status] || "bg-gray-100 text-gray-700"}>
              {status}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 print-hide">
          <Button variant="outline" onClick={handleRecordPrint} data-testid="button-print">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          <Button variant="outline" onClick={handleRecordPrint} data-testid="button-save-pdf">
            Save as PDF
          </Button>

          {showSticker && (
            <Button variant="outline" asChild>
              <Link href={`/records/${id}/sticker`}>
                <QrCode className="mr-2 h-4 w-4" />
                Stiker
              </Link>
            </Button>
          )}

          {canEdit && (
            <Button onClick={() => setLocation(`/records/${id}/edit`)} data-testid="button-edit">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}

          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-delete"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 hidden print:block">
        <div className="flex items-start justify-between border border-black">
          <div className="flex w-32 flex-col justify-center border-r border-black p-3 text-center">
            <div className="text-lg font-bold">DONGJIN</div>
            <div className="mt-1 text-xs">PT. DONGJIN INDONESIA</div>
          </div>

          <div className="flex-1 p-3 text-center">
            <div className="text-base font-bold uppercase">Data Kalibrasi Instrument</div>
            <div className="mt-1 text-sm font-bold uppercase">{formLabel}</div>
          </div>

          <div className="border-l border-black">
            <div className="border-b border-black p-1 text-center text-xs font-medium">
              Approval
            </div>
            <div className="grid grid-cols-4 text-xs">
              {[
                { label: "Teknisi", key: "approvalTeknisi" },
                { label: "Instrument", key: "approvalInstrument" },
                { label: "Production", key: "approvalProduction" },
                { label: "Asst. Mgr.", key: "approvalAsstMgr" },
              ].map(({ label, key }, i, arr) => (
                <div
                  key={key}
                  className={`${i < arr.length - 1 ? "border-r border-black" : ""} min-w-14 p-1 text-center`}
                >
                  <div className="mb-6 font-medium">{label}</div>
                  <div className="text-xs">{(data[key] as string) || "-"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="print:bg-white print:text-black">
        <RecordDetailView record={record} data={data} />
      </div>

      <div className="print-only print-footer">
        <div className="relative w-full">
          <div className="print-footer-left">{docInfo?.noRevisi ?? ""}</div>
          <div className="print-footer-center">PT. DONGJIN INDONESIA</div>
          <div className="print-footer-right">{docInfo?.noDoc ?? ""}</div>
        </div>
      </div>
    </div>
  );
}

function RecordDetailView({
  record,
  data,
}: {
  record: { formType: string; tagNo?: string | null; date?: string | null; calibratedBy?: string | null };
  data: Record<string, unknown>;
}) {
  const forwardRowsDef = [
    { pct: 0, ma: 4 },
    { pct: 25, ma: 8 },
    { pct: 50, ma: 12 },
    { pct: 75, ma: 16 },
    { pct: 100, ma: 20 },
  ];
  const reverseRowsDef = [
    { pct: 100, ma: 4 },
    { pct: 75, ma: 8 },
    { pct: 50, ma: 12 },
    { pct: 25, ma: 16 },
    { pct: 0, ma: 20 },
  ];
  const timbanganRowsDef = [
    { span: "0", input: "0" },
    { span: "20", input: "20" },
    { span: "40", input: "40" },
    { span: "60", input: "60" },
    { span: "80", input: "80" },
    { span: "100", input: "100" },
  ];
  const calibPoints = [
    { pct: 0, ma: 4 },
    { pct: 25, ma: 8 },
    { pct: 50, ma: 12 },
    { pct: 75, ma: 16 },
    { pct: 100, ma: 20 },
    { pct: 75, ma: 16 },
    { pct: 50, ma: 12 },
    { pct: 25, ma: 8 },
    { pct: 0, ma: 4 },
  ];

  const thCls = "border border-gray-400 p-1 text-center text-xs font-semibold bg-gray-100";
  const tdCls = "border border-gray-400 p-1 text-center text-xs";
  const labelCls = "border border-gray-400 p-1 text-xs font-medium bg-gray-50";
  const valueCls = "border border-gray-400 p-1 text-xs";

  const StatusRow = () =>
    data.status ? (
      <div className="mt-1 text-xs">
        <span className="font-medium">Status: </span>
        {data.status as string}
      </div>
    ) : null;

  if (record.formType === "control_valve") {
    const bf = (data.beforeForward as { dcs: string; cv: string; deviation: string }[]) || [];
    const br = (data.beforeReverse as { dcs: string; cv: string; deviation: string }[]) || [];
    const af = (data.afterForward as { dcs: string; cv: string; deviation: string }[]) || [];
    const ar = (data.afterReverse as { dcs: string; cv: string; deviation: string }[]) || [];

    return (
      <div className="space-y-3">
        <table className="w-full border-collapse text-xs print-tight">
          <tbody>
            <tr><td colSpan={4} className="border border-gray-400 bg-gray-200 p-1 text-center text-xs font-bold uppercase">Instrument Data</td></tr>
            <tr><td className={labelCls}>Date</td><td className={valueCls}>{record.date}</td><td className={labelCls}>Model No.</td><td className={valueCls}>{data.modelNo as string}</td></tr>
            <tr><td className={labelCls}>Calibrated By</td><td className={valueCls}>{record.calibratedBy}</td><td className={labelCls}>Service</td><td className={valueCls}>{data.service as string}</td></tr>
            <tr><td className={labelCls}>Tag No.</td><td className={valueCls}>{record.tagNo}</td><td className={labelCls}>Serial No.</td><td className={valueCls}>{data.serialNo as string}</td></tr>
            <tr><td className={labelCls}>Location</td><td className={valueCls}>{data.location as string}</td><td className={labelCls}>Accuracy</td><td className={valueCls}>{data.accuracy as string}</td></tr>
            <tr><td colSpan={4} className="border border-gray-400 bg-gray-200 p-1 text-center text-xs font-bold uppercase">Master Equipment Detail</td></tr>
            <tr><td className={labelCls}>Make/Inst Type</td><td className={valueCls} colSpan={3}>{data.masterMakeInstType as string}</td></tr>
            <tr><td className={labelCls}>Model No.</td><td className={valueCls}>{data.masterModelNo as string}</td><td className={labelCls}>Serial No.</td><td className={valueCls}>{data.masterSerialNo as string}</td></tr>
            <tr><td className={labelCls}>Accuracy</td><td className={valueCls}>{data.masterAccuracy as string}</td><td className={labelCls}>Certificate No.</td><td className={valueCls}>{data.certificateNo as string}</td></tr>
          </tbody>
        </table>

        <div className="border border-gray-400 bg-gray-200 py-1 text-center text-xs font-bold uppercase">Calibration Data</div>

        <div className="grid grid-cols-2 gap-2 overflow-x-auto">
          {[{ label: "Before Calibration", fRows: bf, rRows: br }, { label: "After Calibration", fRows: af, rRows: ar }].map(({ label, fRows, rRows }) => (
            <div key={label}>
              <div className="border border-gray-400 bg-gray-100 py-0.5 text-center text-xs font-medium">Control Valve {label}</div>
              <table className="w-full border-collapse text-xs print-tight">
                <thead>
                  <tr><th className={thCls}>Action</th><th className={thCls}>%</th><th className={thCls}>mA</th><th className={thCls}>DCS</th><th className={thCls}>C/V</th><th className={thCls}>Deviation</th></tr>
                </thead>
                <tbody>
                  {forwardRowsDef.map((row, i) => (
                    <tr key={i}>
                      {i === 0 && <td className={`${tdCls} font-medium`} rowSpan={5}>Forward</td>}
                      <td className={tdCls}>{row.pct}</td>
                      <td className={tdCls}>{row.ma}</td>
                      <td className={tdCls}>{fRows[i]?.dcs}</td>
                      <td className={tdCls}>{fRows[i]?.cv}</td>
                      <td className={tdCls}>{fRows[i]?.deviation}</td>
                    </tr>
                  ))}
                  {reverseRowsDef.map((row, i) => (
                    <tr key={i}>
                      {i === 0 && <td className={`${tdCls} font-medium`} rowSpan={5}>Reverse</td>}
                      <td className={tdCls}>{row.pct}</td>
                      <td className={tdCls}>{row.ma}</td>
                      <td className={tdCls}>{rRows[i]?.dcs}</td>
                      <td className={tdCls}>{rRows[i]?.cv}</td>
                      <td className={tdCls}>{rRows[i]?.deviation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {data.remarks && <div className="text-xs"><span className="font-medium">Remarks: </span>{data.remarks as string}</div>}
        <StatusRow />
      </div>
    );
  }

  if (record.formType === "timbangan") {
    const rows = (data.rows as {
      beforePct: string;
      beforeKg: string;
      beforeSelisih: string;
      beforeError: string;
      afterPct: string;
      afterKg: string;
      afterSelisih: string;
      afterError: string;
    }[]) || [];

    return (
      <div className="space-y-3">
        <table className="w-full border-collapse text-xs print-tight">
          <tbody>
            <tr><td colSpan={4} className="border border-gray-400 bg-gray-200 p-1 text-center text-xs font-bold uppercase">Instrument Data</td></tr>
            <tr><td className={labelCls}>Date</td><td className={valueCls}>{record.date}</td><td className={labelCls}>Calibrated By</td><td className={valueCls}>{record.calibratedBy}</td></tr>
            <tr><td className={labelCls}>Tag No.</td><td className={valueCls}>{record.tagNo}</td><td className={labelCls}>Location</td><td className={valueCls}>{data.location as string}</td></tr>
            <tr><td className={labelCls}>MFR/Mode</td><td className={valueCls}>{data.mfrMode as string}</td><td className={labelCls}>Type</td><td className={valueCls}>{data.type as string}</td></tr>
            <tr><td className={labelCls}>Serial No.</td><td className={valueCls}>{data.serialNo as string}</td><td className={labelCls}>Service</td><td className={valueCls}>{data.service as string}</td></tr>
            <tr><td className={labelCls}>Cal. Range</td><td className={valueCls}>{data.calRange as string}</td><td className={labelCls}></td><td className={valueCls}></td></tr>
          </tbody>
        </table>

        <div className="border border-gray-400 bg-gray-200 py-1 text-center text-xs font-bold uppercase">Calibration Data</div>

        <table className="w-full border-collapse text-xs print-tight">
          <thead>
            <tr><th className={thCls} colSpan={3}>Standard</th><th className={thCls} colSpan={4}>Before Adjustment</th><th className={thCls} colSpan={4}>After Adjustment</th></tr>
            <tr>
              <th className={thCls}>Span (%)</th><th className={thCls}>Input (Kg)</th><th className={thCls}>Selisih (%)</th>
              <th className={thCls}>%</th><th className={thCls}>Kg</th><th className={thCls}>Selisih</th><th className={thCls}>% Error</th>
              <th className={thCls}>%</th><th className={thCls}>Kg</th><th className={thCls}>Selisih</th><th className={thCls}>% Error</th>
            </tr>
          </thead>
          <tbody>
            {timbanganRowsDef.map((def, i) => (
              <tr key={i}>
                <td className={tdCls}>{def.span}</td>
                <td className={tdCls}>{def.input}</td>
                <td className={tdCls}>0.0</td>
                <td className={tdCls}>{rows[i]?.beforePct}</td>
                <td className={tdCls}>{rows[i]?.beforeKg}</td>
                <td className={tdCls}>{rows[i]?.beforeSelisih}</td>
                <td className={tdCls}>{rows[i]?.beforeError}</td>
                <td className={tdCls}>{rows[i]?.afterPct}</td>
                <td className={tdCls}>{rows[i]?.afterKg}</td>
                <td className={tdCls}>{rows[i]?.afterSelisih}</td>
                <td className={tdCls}>{rows[i]?.afterError}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.note && <div className="text-xs"><span className="font-medium">Note: </span>{data.note as string}</div>}
        <StatusRow />
      </div>
    );
  }

  if (record.formType === "rtd") {
    const rows = (data.rows as {
      tempInput: string;
      tolerance: string;
      standardResistance: string;
      tempReading: string;
      deviation: string;
      measuredResistance: string;
    }[]) || [];

    return (
      <div className="space-y-3">
        <table className="w-full border-collapse text-xs print-tight">
          <tbody>
            <tr><td colSpan={4} className="border border-gray-400 bg-gray-200 p-1 text-center text-xs font-bold uppercase">Instrument Data</td></tr>
            <tr><td className={labelCls}>Date</td><td className={valueCls}>{record.date}</td><td className={labelCls}>Calibrated By</td><td className={valueCls}>{record.calibratedBy}</td></tr>
            <tr><td className={labelCls}>Tag No.</td><td className={valueCls}>{record.tagNo}</td><td className={labelCls}>Location</td><td className={valueCls}>{data.location as string}</td></tr>
            <tr><td className={labelCls}>RTD Type</td><td className={valueCls}>{data.rtdType as string}</td><td className={labelCls}>Manufacture</td><td className={valueCls}>{data.manufacture as string}</td></tr>
            <tr><td className={labelCls}>Calibration Type</td><td className={valueCls}>{data.calibrationType as string}</td><td className={labelCls}></td><td className={valueCls}></td></tr>
            <tr><td colSpan={4} className="border border-gray-400 bg-gray-200 p-1 text-center text-xs font-bold uppercase">Equipment Detail</td></tr>
            <tr><td className={labelCls}>Make/Inst Type</td><td className={valueCls}>{data.makeInstType as string}</td><td className={labelCls}>Model No.</td><td className={valueCls}>{data.modelNo as string}</td></tr>
            <tr><td className={labelCls}>Serial No.</td><td className={valueCls}>{data.serialNo as string}</td><td className={labelCls}>Accuracy</td><td className={valueCls}>{data.accuracy as string}</td></tr>
          </tbody>
        </table>

        <div className="border border-gray-400 bg-gray-200 py-1 text-center text-xs font-bold uppercase">Calibration Data</div>

        <table className="w-full border-collapse text-xs print-tight">
          <thead>
            <tr><th className={thCls}>No</th><th className={thCls}>Temp Input (°C)</th><th className={thCls}>Tolerance (°C)</th><th className={thCls}>Standard Resistance</th><th className={thCls}>Temp Reading</th><th className={thCls}>Deviation</th><th className={thCls}>Measured Resistance</th></tr>
          </thead>
          <tbody>
            {Array.from({ length: 7 }, (_, i) => (
              <tr key={i}>
                <td className={tdCls}>{i + 1}</td>
                <td className={tdCls}>{rows[i]?.tempInput}</td>
                <td className={tdCls}>{rows[i]?.tolerance}</td>
                <td className={tdCls}>{rows[i]?.standardResistance}</td>
                <td className={tdCls}>{rows[i]?.tempReading}</td>
                <td className={tdCls}>{rows[i]?.deviation}</td>
                <td className={tdCls}>{rows[i]?.measuredResistance}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.remarks && <div className="text-xs"><span className="font-medium">Remarks: </span>{data.remarks as string}</div>}
        <StatusRow />
      </div>
    );
  }

  if (record.formType === "ph") {
    const beforeRows = (data.beforeRows as { gasStandard: string; local: string; monitor: string; error: string; remarks: string }[]) || [];
    const afterRows = (data.afterRows as { gasStandard: string; local: string; monitor: string; error: string; remarks: string }[]) || [];

    return (
      <div className="space-y-3">
        <table className="w-full border-collapse text-xs print-tight">
          <tbody>
            <tr><td colSpan={4} className="border border-gray-400 bg-gray-200 p-1 text-center text-xs font-bold uppercase">Instrument Data</td></tr>
            <tr><td className={labelCls}>Date</td><td className={valueCls}>{record.date}</td><td className={labelCls}>Calibrated By</td><td className={valueCls}>{record.calibratedBy}</td></tr>
            <tr><td className={labelCls}>Tag No.</td><td className={valueCls}>{record.tagNo}</td><td className={labelCls}>Location</td><td className={valueCls}>{data.location as string}</td></tr>
            <tr><td className={labelCls}>MFR/Model</td><td className={valueCls}>{data.mfrModel as string}</td><td className={labelCls}>Type</td><td className={valueCls}>{data.type as string}</td></tr>
            <tr><td className={labelCls}>Serial No.</td><td className={valueCls}>{data.serialNo as string}</td><td className={labelCls}>Service</td><td className={valueCls}>{data.service as string}</td></tr>
            <tr><td className={labelCls}>Cal. Range</td><td className={valueCls}>{data.calRange as string}</td><td className={labelCls}>Output Signal</td><td className={valueCls}>{data.outputSignal as string}</td></tr>
            <tr><td className={labelCls}>Weather</td><td className={valueCls}>{data.weather as string}</td><td className={labelCls}></td><td className={valueCls}></td></tr>
          </tbody>
        </table>

        <div className="border border-gray-400 bg-gray-200 py-1 text-center text-xs font-bold">BEFORE CALIBRATION</div>
        {data.beforeMeasurement && <div className="text-xs">Measurement: {data.beforeMeasurement as string}</div>}
        <table className="w-full border-collapse text-xs print-tight">
          <thead><tr><th className={thCls}>Gas Standard</th><th className={thCls}>Local</th><th className={thCls}>Monitor</th><th className={thCls}>% Error</th><th className={thCls}>Remarks</th></tr></thead>
          <tbody>{beforeRows.map((r, i) => <tr key={i}><td className={tdCls}>{r.gasStandard}</td><td className={tdCls}>{r.local}</td><td className={tdCls}>{r.monitor}</td><td className={tdCls}>{r.error}</td><td className={tdCls}>{r.remarks}</td></tr>)}</tbody>
        </table>

        <div className="border border-gray-400 bg-gray-200 py-1 text-center text-xs font-bold">AFTER CALIBRATION</div>
        <div className="flex gap-4 text-xs"><span>Zero: {data.calibrationZero as string}</span><span>Span: {data.calibrationSpan as string}</span></div>
        <table className="w-full border-collapse text-xs print-tight">
          <thead><tr><th className={thCls}>Gas Standard</th><th className={thCls}>Local</th><th className={thCls}>Monitor</th><th className={thCls}>% Error</th><th className={thCls}>Remarks</th></tr></thead>
          <tbody>{afterRows.map((r, i) => <tr key={i}><td className={tdCls}>{r.gasStandard}</td><td className={tdCls}>{r.local}</td><td className={tdCls}>{r.monitor}</td><td className={tdCls}>{r.error}</td><td className={tdCls}>{r.remarks}</td></tr>)}</tbody>
        </table>

        {data.afterMeasurement && <div className="text-xs">Measurement (After): {data.afterMeasurement as string}</div>}
        {data.remarks && <div className="text-xs"><span className="font-medium">Remarks: </span>{data.remarks as string}</div>}
        <StatusRow />
      </div>
    );
  }

  if (record.formType === "transmitter") {
    const beforeRows = (data.beforeRows as { pressure: string; local: string; error: string; remarks: string }[]) || [];
    const afterRows = (data.afterRows as { pressure: string; local: string; error: string; remarks: string }[]) || [];

    return (
      <div className="space-y-3">
        <table className="w-full border-collapse text-xs print-tight">
          <tbody>
            <tr><td colSpan={4} className="border border-gray-400 bg-gray-200 p-1 text-center text-xs font-bold uppercase">Instrument Data</td></tr>
            <tr><td className={labelCls}>Date</td><td className={valueCls}>{record.date}</td><td className={labelCls}>Calibrated By</td><td className={valueCls}>{record.calibratedBy}</td></tr>
            <tr><td className={labelCls}>Tag No.</td><td className={valueCls}>{record.tagNo}</td><td className={labelCls}>Location</td><td className={valueCls}>{data.location as string}</td></tr>
            <tr><td className={labelCls}>MFR/Model</td><td className={valueCls}>{data.mfrModel as string}</td><td className={labelCls}>Type</td><td className={valueCls}>{data.type as string}</td></tr>
            <tr><td className={labelCls}>Serial No.</td><td className={valueCls}>{data.serialNo as string}</td><td className={labelCls}>Service</td><td className={valueCls}>{data.service as string}</td></tr>
            <tr><td className={labelCls}>Cal. Range</td><td className={valueCls}>{data.calRange as string}</td><td className={labelCls}>Output Signal</td><td className={valueCls}>{data.outputSignal as string}</td></tr>
            <tr><td colSpan={4} className="border border-gray-400 bg-gray-200 p-1 text-center text-xs font-bold uppercase">Equipment Detail</td></tr>
            <tr><td className={labelCls}>Test Equipment Type</td><td className={valueCls}>{data.testEquipmentType as string}</td><td className={labelCls}>MFR/model</td><td className={valueCls}>{data.mfrModelEquip as string}</td></tr>
            <tr><td className={labelCls}>Cal. Due date</td><td className={valueCls} colSpan={3}>{data.calDueDate as string}</td></tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-3">
          {[{ label: "Before Calibration", rows: beforeRows }, { label: "After Calibration", rows: afterRows }].map(({ label, rows }) => (
            <div key={label}>
              <div className="border border-gray-400 bg-gray-200 py-0.5 text-center text-xs font-bold">{label}</div>
              <table className="w-full border-collapse text-xs print-tight">
                <thead><tr><th className={thCls}>%</th><th className={thCls}>Pressure</th><th className={thCls}>mA (STD)</th><th className={thCls}>Local</th><th className={thCls}>% Error</th><th className={thCls}>Remarks</th></tr></thead>
                <tbody>
                  {calibPoints.map((pt, i) => (
                    <tr key={i}>
                      <td className={tdCls}>{pt.pct}</td>
                      <td className={tdCls}>{rows[i]?.pressure}</td>
                      <td className={tdCls}>{pt.ma}</td>
                      <td className={tdCls}>{rows[i]?.local}</td>
                      <td className={tdCls}>{rows[i]?.error}</td>
                      <td className={tdCls}>{rows[i]?.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {data.remarks && <div className="text-xs"><span className="font-medium">Remarks: </span>{data.remarks as string}</div>}
        <StatusRow />
      </div>
    );
  }

  const entries = Object.entries(data).filter(([k]) => !["approval", "status"].some((p) => k.startsWith(p)));
  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2 text-sm">
          <span className="min-w-40 capitalize text-muted-foreground">
            {key.replace(/([A-Z])/g, " $1").trim()}:
          </span>
          <span className="font-medium">
            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
}