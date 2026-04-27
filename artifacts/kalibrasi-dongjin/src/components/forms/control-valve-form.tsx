import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import ComboboxCRUD from "@/components/combobox-crud";
import { useAuth } from "@/contexts/auth-context";

interface Props {
  onSubmit: (data: Record<string, unknown>, tagNo: string, date: string, calibratedBy: string) => void;
  isPending: boolean;
  defaultValues?: Record<string, unknown>;
}

const STATUS_OPTIONS = [
  "Belum Dikerjakan",
  "On Progress",
  "Selesai Kalibrasi",
  "Tidak bisa di Kalibrasi",
];

const forwardRows = [
  { pct: 0, ma: 4 },
  { pct: 25, ma: 8 },
  { pct: 50, ma: 12 },
  { pct: 75, ma: 16 },
  { pct: 100, ma: 20 },
];

const reverseRows = [
  { pct: 100, ma: 4 },
  { pct: 75, ma: 8 },
  { pct: 50, ma: 12 },
  { pct: 25, ma: 16 },
  { pct: 0, ma: 20 },
];

type Row = { dcs: string; cv: string; deviation: string };

type FormValues = {
  date: string;
  modelNo: string;
  calibratedBy: string;
  service: string;
  tagNo: string;
  serialNo: string;
  location: string;
  accuracy: string;

  masterMakeInstType: string;
  masterModelNo: string;
  masterSerialNo: string;
  masterAccuracy: string;
  certificateNo: string;

  approvalTeknisi: string;
  approvalInstrument: string;
  approvalProduction: string;
  approvalAsstMgr: string;

  beforeForward: Row[];
  beforeReverse: Row[];
  afterForward: Row[];
  afterReverse: Row[];

  remarks: string;
  status: string;
};

export default function ControlValveForm({ onSubmit, isPending, defaultValues }: Props) {
  const d = defaultValues || {};
  const { user } = useAuth();

  const emptyRows = () =>
    Array.from({ length: 5 }, () => ({
      dcs: "",
      cv: "",
      deviation: "",
    }));

  const form = useForm<FormValues>({
    defaultValues: {
      date: (d.date as string) || "",
      modelNo: (d.modelNo as string) || "",
      calibratedBy: (d.calibratedBy as string) || user?.name || "",
      service: (d.service as string) || "",
      tagNo: (d.tagNo as string) || "",
      serialNo: (d.serialNo as string) || "",
      location: (d.location as string) || "",
      accuracy: (d.accuracy as string) || "",

      masterMakeInstType: (d.masterMakeInstType as string) || "",
      masterModelNo: (d.masterModelNo as string) || "",
      masterSerialNo: (d.masterSerialNo as string) || "",
      masterAccuracy: (d.masterAccuracy as string) || "",
      certificateNo: (d.certificateNo as string) || "",

      approvalTeknisi: user?.name || "",
      approvalInstrument: "",
      approvalProduction: "",
      approvalAsstMgr: "",

      beforeForward: (d.beforeForward as Row[]) || emptyRows(),
      beforeReverse: (d.beforeReverse as Row[]) || emptyRows(),
      afterForward: (d.afterForward as Row[]) || emptyRows(),
      afterReverse: (d.afterReverse as Row[]) || emptyRows(),

      remarks: "",
      status: "",
    },
  });

  const calcDeviation = (prefix: keyof FormValues, i: number, field: "dcs" | "cv", val: string) => {
    form.setValue(`${prefix}.${i}.${field}` as any, val);

    const rows = form.getValues(prefix as any);
    const dcs = field === "dcs" ? parseFloat(val) : parseFloat(rows[i]?.dcs);
    const cv = field === "cv" ? parseFloat(val) : parseFloat(rows[i]?.cv);

    if (!isNaN(dcs) && !isNaN(cv)) {
      form.setValue(`${prefix}.${i}.deviation` as any, (cv - dcs).toFixed(2));
    } else {
      form.setValue(`${prefix}.${i}.deviation` as any, "");
    }
  };

  const submit = form.handleSubmit((v) => {
    const { tagNo, date, calibratedBy, ...rest } = v;
    onSubmit(rest, tagNo, date, calibratedBy);
  });

  const rows = {
    bf: form.watch("beforeForward"),
    br: form.watch("beforeReverse"),
    af: form.watch("afterForward"),
    ar: form.watch("afterReverse"),
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Instrument */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Instrument Data</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Date"><Input type="date" {...form.register("date")} /></Field>
          <Field label="Model No"><Input {...form.register("modelNo")} /></Field>
          <Field label="Calibrated By"><Input value={form.watch("calibratedBy")} readOnly /></Field>
          <Field label="Service"><Input {...form.register("service")} /></Field>
          <Field label="Tag No"><Input {...form.register("tagNo")} /></Field>
          <Field label="Serial No"><Input {...form.register("serialNo")} /></Field>
          <Field label="Location">
            <ComboboxCRUD value={form.watch("location")} onChange={(v) => form.setValue("location", v)} listKey="location-list" />
          </Field>
          <Field label="Accuracy"><Input {...form.register("accuracy")} /></Field>
        </CardContent>
      </Card>

      {/* Master */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Master Equipment</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Make / Type"><Input {...form.register("masterMakeInstType")} /></Field>
          <Field label="Model"><Input {...form.register("masterModelNo")} /></Field>
          <Field label="Serial"><Input {...form.register("masterSerialNo")} /></Field>
          <Field label="Accuracy"><Input {...form.register("masterAccuracy")} /></Field>
          <Field label="Certificate"><Input {...form.register("certificateNo")} /></Field>
        </CardContent>
      </Card>

      {/* Calibration */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Calibration Data</CardTitle></CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">

          <Section title="Before Calibration" rows={rows.bf} rowsDef={forwardRows} prefix="beforeForward" calc={calcDeviation} form={form} />
          <Section title="After Calibration" rows={rows.af} rowsDef={forwardRows} prefix="afterForward" calc={calcDeviation} form={form} />

          <div className="grid md:grid-cols-2 gap-4">
            <Textarea {...form.register("remarks")} placeholder="Remarks..." />
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      {/* Approval */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Approval</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          <Field label="Teknisi"><Input {...form.register("approvalTeknisi")} /></Field>
          <Field label="Instrument"><Input {...form.register("approvalInstrument")} /></Field>
          <Field label="Production"><Input {...form.register("approvalProduction")} /></Field>
          <Field label="Asst. Mgr"><Input {...form.register("approvalAsstMgr")} /></Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Menyimpan..." : "Simpan Data"}
        </Button>
      </div>
    </form>
  );
}

/* ===== COMPONENTS ===== */

function Field({ label, children }: any) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}

function Section({ title, rows, rowsDef, prefix, calc, form }: any) {
  return (
    <div>
      <div className="text-sm font-semibold mb-2">{title}</div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted">
            <th>%</th><th>mA</th><th>DCS</th><th>C/V</th><th>Deviation</th>
          </tr>
        </thead>
        <tbody>
          {rowsDef.map((r: any, i: number) => (
            <tr key={i}>
              <td>{r.pct}</td>
              <td>{r.ma}</td>
              <td><Input value={rows?.[i]?.dcs || ""} onChange={(e) => calc(prefix, i, "dcs", e.target.value)} /></td>
              <td><Input value={rows?.[i]?.cv || ""} onChange={(e) => calc(prefix, i, "cv", e.target.value)} /></td>
              <td><Input value={rows?.[i]?.deviation || ""} readOnly /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}