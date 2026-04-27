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

type CalibRow = {
  gasStandard: string;
  local: string;
  monitor: string;
  error: string;
  remarks: string;
};

type FormValues = {
  date: string;
  calibratedBy: string;
  tagNo: string;
  location: string;
  mfrModel: string;
  type: string;
  serialNo: string;
  service: string;
  calRange: string;
  outputSignal: string;
  weather: string;
  approvalTeknisi: string;
  approvalInstrument: string;
  approvalProduction: string;
  approvalAsstMgr: string;
  beforeMeasurement: string;
  beforeRows: CalibRow[];
  calibrationZero: string;
  calibrationSpan: string;
  afterRows: CalibRow[];
  afterMeasurement: string;
  remarks: string;
  status: string;
};

const emptyRow = (): CalibRow => ({
  gasStandard: "",
  local: "",
  monitor: "",
  error: "",
  remarks: "",
});

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Th({
  children,
  colSpan,
}: {
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <th className="border border-border p-2 text-center font-semibold" colSpan={colSpan}>
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`border border-border p-2 text-center text-xs ${className}`}>
      {children}
    </td>
  );
}

function TdInput({ children }: { children: React.ReactNode }) {
  return <td className="border border-border p-0">{children}</td>;
}

function PhCalibTable({
  prefix,
  watchedRows,
  onCalibCellChange,
  register,
}: {
  prefix: "beforeRows" | "afterRows";
  watchedRows: CalibRow[] | undefined;
  onCalibCellChange: (
    prefix: "beforeRows" | "afterRows",
    i: number,
    field: "gasStandard" | "local",
    val: string
  ) => void;
  register: (name: string) => object;
}) {
  return (
    <table className="w-full min-w-[850px] text-xs border-collapse">
      <thead>
        <tr className="bg-muted">
          <Th>Gas Standard</Th>
          <Th colSpan={3}>Output Indication</Th>
          <Th>Remarks</Th>
        </tr>
        <tr className="bg-muted/50">
          <Th></Th>
          <Th>Local</Th>
          <Th>Monitor</Th>
          <Th>% Error</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 5 }, (_, i) => (
          <tr key={i}>
            <TdInput>
              <Input
                value={watchedRows?.[i]?.gasStandard ?? ""}
                onChange={(e) => onCalibCellChange(prefix, i, "gasStandard", e.target.value)}
                className="h-8 rounded-none border-0 text-xs"
              />
            </TdInput>

            <TdInput>
              <Input
                value={watchedRows?.[i]?.local ?? ""}
                onChange={(e) => onCalibCellChange(prefix, i, "local", e.target.value)}
                className="h-8 rounded-none border-0 text-center text-xs"
              />
            </TdInput>

            <TdInput>
              <Input
                {...(register(`${prefix}.${i}.monitor`) as object)}
                className="h-8 rounded-none border-0 text-center text-xs"
              />
            </TdInput>

            <TdInput>
              <Input
                value={watchedRows?.[i]?.error ?? ""}
                readOnly
                className="h-8 rounded-none border-0 bg-muted/20 text-center text-xs"
              />
            </TdInput>

            <TdInput>
              <Input
                {...(register(`${prefix}.${i}.remarks`) as object)}
                className="h-8 rounded-none border-0 text-xs"
              />
            </TdInput>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PhForm({ onSubmit, isPending, defaultValues }: Props) {
  const d = defaultValues as Record<string, unknown> | undefined;
  const { user } = useAuth();

  const form = useForm<FormValues>({
    defaultValues: {
      date: (d?.date as string) || "",
      calibratedBy: (d?.calibratedBy as string) || user?.name || "",
      tagNo: (d?.tagNo as string) || "",
      location: (d?.location as string) || "",
      mfrModel: (d?.mfrModel as string) || "",
      type: (d?.type as string) || "",
      serialNo: (d?.serialNo as string) || "",
      service: (d?.service as string) || "",
      calRange: (d?.calRange as string) || "",
      outputSignal: (d?.outputSignal as string) || "",
      weather: (d?.weather as string) || "",
      approvalTeknisi: (d?.approvalTeknisi as string) || user?.name || "",
      approvalInstrument: (d?.approvalInstrument as string) || "",
      approvalProduction: (d?.approvalProduction as string) || "",
      approvalAsstMgr: (d?.approvalAsstMgr as string) || "",
      beforeMeasurement: (d?.beforeMeasurement as string) || "",
      beforeRows: (d?.beforeRows as CalibRow[]) || Array.from({ length: 5 }, emptyRow),
      calibrationZero: (d?.calibrationZero as string) || "",
      calibrationSpan: (d?.calibrationSpan as string) || "",
      afterRows: (d?.afterRows as CalibRow[]) || Array.from({ length: 5 }, emptyRow),
      afterMeasurement: (d?.afterMeasurement as string) || "",
      remarks: (d?.remarks as string) || "",
      status: (d?.status as string) || "",
    },
  });

  const watchedBefore = form.watch("beforeRows");
  const watchedAfter = form.watch("afterRows");

  const handleCalibCellChange = (
    prefix: "beforeRows" | "afterRows",
    i: number,
    field: "gasStandard" | "local",
    val: string
  ) => {
    form.setValue(`${prefix}.${i}.${field}`, val);

    const rows = form.getValues(prefix);
    const gs = field === "gasStandard" ? parseFloat(val) : parseFloat(rows[i]?.gasStandard || "");
    const loc = field === "local" ? parseFloat(val) : parseFloat(rows[i]?.local || "");

    if (!isNaN(gs) && !isNaN(loc) && gs !== 0) {
      form.setValue(`${prefix}.${i}.error`, (((loc - gs) / gs) * 100).toFixed(2) as never);
    } else {
      form.setValue(`${prefix}.${i}.error`, "" as never);
    }
  };

  const handleSubmit = form.handleSubmit((values) => {
    const { tagNo, date, calibratedBy, ...rest } = values;
    onSubmit(rest, tagNo, date, calibratedBy);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Instrument Data */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Instrument Data</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Date">
            <Input {...form.register("date")} type="date" />
          </Field>

          <Field label="Calibrated By">
            <Input value={form.watch("calibratedBy")} readOnly />
          </Field>

          <Field label="Tag No.">
            <Input {...form.register("tagNo")} />
          </Field>

          <Field label="Location">
            <ComboboxCRUD
              value={form.watch("location")}
              onChange={(v) => form.setValue("location", v)}
              listKey="location-list"
              placeholder="Lokasi..."
            />
          </Field>

          <Field label="MFR / Model">
            <Input {...form.register("mfrModel")} />
          </Field>

          <Field label="Type">
            <Input {...form.register("type")} />
          </Field>

          <Field label="Serial No.">
            <Input {...form.register("serialNo")} />
          </Field>

          <Field label="Service">
            <Input {...form.register("service")} />
          </Field>

          <Field label="Cal. Range">
            <Input {...form.register("calRange")} />
          </Field>

          <Field label="Output Signal">
            <Input {...form.register("outputSignal")} />
          </Field>

          <Field label="Weather">
            <Input {...form.register("weather")} />
          </Field>
        </CardContent>
      </Card>

      {/* Before Calibration */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Calibration Data — Before Calibration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <Field label="Measurement">
            <Input {...form.register("beforeMeasurement")} />
          </Field>

          <PhCalibTable
            prefix="beforeRows"
            watchedRows={watchedBefore}
            onCalibCellChange={handleCalibCellChange}
            register={(name) => form.register(name as keyof FormValues)}
          />
        </CardContent>
      </Card>

      {/* After Calibration */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Calibration Data — After Calibration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Calibration Value — Zero">
              <Input {...form.register("calibrationZero")} />
            </Field>

            <Field label="Calibration Value — Span">
              <Input {...form.register("calibrationSpan")} />
            </Field>
          </div>

          <PhCalibTable
            prefix="afterRows"
            watchedRows={watchedAfter}
            onCalibCellChange={handleCalibCellChange}
            register={(name) => form.register(name as keyof FormValues)}
          />

          <Field label="Measurement">
            <Input {...form.register("afterMeasurement")} />
          </Field>
        </CardContent>
      </Card>

      {/* Remarks & Status */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Remarks & Status</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Remarks</Label>
            <Textarea {...form.register("remarks")} rows={3} />
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Approval */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Approval</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-4">
          <Field label="Teknisi">
            <Input {...form.register("approvalTeknisi")} />
          </Field>

          <Field label="Instrument">
            <Input {...form.register("approvalInstrument")} />
          </Field>

          <Field label="Production">
            <Input {...form.register("approvalProduction")} />
          </Field>

          <Field label="Asst. Mgr.">
            <Input {...form.register("approvalAsstMgr")} />
          </Field>
        </CardContent>
      </Card>

      {/* Action */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="h-11 px-6">
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Menyimpan..." : "Simpan Data"}
        </Button>
      </div>
    </form>
  );
}