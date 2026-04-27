// (FULL CODE SUDAH DIRAPIKAN — LANGSUNG COPY)

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

const MA_SPAN = 16;

type Row = { pressure: string; local: string; error: string; remarks: string };

function Field({ label, children }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CalibTable({ prefix, rows, onChange }: any) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-muted">
          <th className="border p-2">% </th>
          <th className="border p-2">Pressure</th>
          <th className="border p-2">mA STD</th>
          <th className="border p-2">Local</th>
          <th className="border p-2">% Error</th>
          <th className="border p-2">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {calibPoints.map((p, i) => (
          <tr key={i}>
            <td className="border text-center">{p.pct}</td>
            <td className="border p-0">
              <Input
                value={rows?.[i]?.pressure || ""}
                onChange={(e) => onChange(prefix, i, "pressure", e.target.value)}
                className="h-8 border-0 text-xs"
              />
            </td>
            <td className="border text-center">{p.ma}</td>
            <td className="border p-0">
              <Input
                value={rows?.[i]?.local || ""}
                onChange={(e) => onChange(prefix, i, "local", e.target.value)}
                className="h-8 border-0 text-center text-xs"
              />
            </td>
            <td className="border text-center">{rows?.[i]?.error}</td>
            <td className="border p-0">
              <Input
                value={rows?.[i]?.remarks || ""}
                onChange={(e) => onChange(prefix, i, "remarks", e.target.value)}
                className="h-8 border-0 text-xs"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TransmitterForm({ onSubmit, isPending, defaultValues }: Props) {
  const d = defaultValues || {};
  const { user } = useAuth();

  const form = useForm({
    defaultValues: {
      date: d.date || "",
      calibratedBy: d.calibratedBy || user?.name || "",
      tagNo: d.tagNo || "",
      location: d.location || "",
      mfrModel: d.mfrModel || "",
      type: d.type || "",
      serialNo: d.serialNo || "",
      service: d.service || "",
      calRange: d.calRange || "",
      outputSignal: d.outputSignal || "",
      beforeRows: d.beforeRows || calibPoints.map(() => ({ pressure: "", local: "", error: "", remarks: "" })),
      afterRows: d.afterRows || calibPoints.map(() => ({ pressure: "", local: "", error: "", remarks: "" })),
      remarks: "",
      status: "",
    },
  });

  const calc = (prefix: string, i: number, field: string, val: string) => {
    form.setValue(`${prefix}.${i}.${field}`, val);
    const rows: any = form.getValues(prefix);
    const local = parseFloat(rows[i]?.local);
    const std = calibPoints[i].ma;
    if (!isNaN(local)) {
      form.setValue(`${prefix}.${i}.error`, (((local - std) / MA_SPAN) * 100).toFixed(2));
    }
  };

  const submit = form.handleSubmit((v: any) => {
    const { tagNo, date, calibratedBy, ...rest } = v;
    onSubmit(rest, tagNo, date, calibratedBy);
  });

  const before = form.watch("beforeRows");
  const after = form.watch("afterRows");

  return (
    <form onSubmit={submit} className="space-y-6">

      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Instrument Data</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Date"><Input type="date" {...form.register("date")} /></Field>
          <Field label="Calibrated By"><Input value={form.watch("calibratedBy")} readOnly /></Field>
          <Field label="Tag No"><Input {...form.register("tagNo")} /></Field>
          <Field label="Location">
            <ComboboxCRUD
              value={form.watch("location")}
              onChange={(v) => form.setValue("location", v)}
              listKey="location-list"
            />
          </Field>
          <Field label="MFR / Model"><Input {...form.register("mfrModel")} /></Field>
          <Field label="Type"><Input {...form.register("type")} /></Field>
          <Field label="Serial No"><Input {...form.register("serialNo")} /></Field>
          <Field label="Service"><Input {...form.register("service")} /></Field>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Calibration Data</CardTitle></CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">

          <div>
            <div className="font-semibold mb-2">Before Calibration</div>
            <CalibTable prefix="beforeRows" rows={before} onChange={calc} />
          </div>

          <div>
            <div className="font-semibold mb-2">After Calibration</div>
            <CalibTable prefix="afterRows" rows={after} onChange={calc} />
          </div>

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

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 h-4 w-4" />
          {isPending ? "Menyimpan..." : "Simpan Data"}
        </Button>
      </div>

    </form>
  );
}