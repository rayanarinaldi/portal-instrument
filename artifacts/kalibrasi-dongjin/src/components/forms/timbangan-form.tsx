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

const standardRows = [
  { span: "0", inputKg: 0 },
  { span: "20", inputKg: 20 },
  { span: "40", inputKg: 40 },
  { span: "60", inputKg: 60 },
  { span: "80", inputKg: 80 },
  { span: "100", inputKg: 100 },
];

const STATUS_OPTIONS = [
  "Belum Dikerjakan",
  "On Progress",
  "Selesai Kalibrasi",
  "Tidak bisa di Kalibrasi",
];

type RowData = {
  beforePct: string;
  beforeKg: string;
  beforeSelisih: string;
  beforeError: string;
  afterPct: string;
  afterKg: string;
  afterSelisih: string;
  afterError: string;
};

type FormValues = {
  date: string;
  calibratedBy: string;
  tagNo: string;
  location: string;
  mfrMode: string;
  type: string;
  serialNo: string;
  service: string;
  calRange: string;
  approvalInstrument: string;
  approvalProduction: string;
  approvalAsstMgr: string;
  approvalTeknisi: string;
  rows: RowData[];
  note: string;
  status: string;
};

export default function TimbanganForm({ onSubmit, isPending, defaultValues }: Props) {
  const d = defaultValues as Record<string, unknown> | undefined;
  const { user } = useAuth();

  const form = useForm<FormValues>({
    defaultValues: {
      date: (d?.date as string) || "",
      calibratedBy: (d?.calibratedBy as string) || user?.name || "",
      tagNo: (d?.tagNo as string) || "",
      location: (d?.location as string) || "",
      mfrMode: (d?.mfrMode as string) || "",
      type: (d?.type as string) || "",
      serialNo: (d?.serialNo as string) || "",
      service: (d?.service as string) || "",
      calRange: (d?.calRange as string) || "",
      approvalInstrument: (d?.approvalInstrument as string) || "",
      approvalProduction: (d?.approvalProduction as string) || "",
      approvalAsstMgr: (d?.approvalAsstMgr as string) || "",
      approvalTeknisi: (d?.approvalTeknisi as string) || user?.name || "",
      rows:
        (d?.rows as RowData[]) ||
        standardRows.map((r) => ({
          beforePct: String(r.span),
          beforeKg: "",
          beforeSelisih: "",
          beforeError: "",
          afterPct: String(r.span),
          afterKg: "",
          afterSelisih: "",
          afterError: "",
        })),
      note: (d?.note as string) || "",
      status: (d?.status as string) || "",
    },
  });

  const watchedRows = form.watch("rows");

  const handleKgChange = (i: number, field: "beforeKg" | "afterKg", val: string) => {
    form.setValue(`rows.${i}.${field}`, val);

    const kg = parseFloat(val);
    const std = standardRows[i].inputKg;
    const prefix = field === "beforeKg" ? "before" : "after";

    if (!isNaN(kg)) {
      const selisih = kg - std;
      const error = std === 0 ? 0 : (selisih / std) * 100;

      form.setValue(`rows.${i}.${prefix}Selisih` as never, selisih.toFixed(2) as never);
      form.setValue(`rows.${i}.${prefix}Error` as never, error.toFixed(2) as never);
    } else {
      form.setValue(`rows.${i}.${prefix}Selisih` as never, "" as never);
      form.setValue(`rows.${i}.${prefix}Error` as never, "" as never);
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

          <Field label="Tag No">
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

          <Field label="MFR / Mode">
            <Input {...form.register("mfrMode")} />
          </Field>

          <Field label="Type">
            <Input {...form.register("type")} />
          </Field>

          <Field label="Serial No">
            <Input {...form.register("serialNo")} />
          </Field>

          <Field label="Service">
            <Input {...form.register("service")} />
          </Field>

          <Field label="Cal. Range">
            <Input {...form.register("calRange")} />
          </Field>
        </CardContent>
      </Card>

      {/* Calibration Data */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Calibration Data</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <Th colSpan={3}>Standard</Th>
                <Th colSpan={4}>Before Adjustment — Actual Reading</Th>
                <Th colSpan={4}>After Adjustment — Actual Reading</Th>
              </tr>
              <tr className="bg-muted/50">
                <Th>Span (%)</Th>
                <Th>Input (Kg)</Th>
                <Th>Selisih (%)</Th>
                <Th>%</Th>
                <Th>Kg</Th>
                <Th>Selisih</Th>
                <Th>% Error</Th>
                <Th>%</Th>
                <Th>Kg</Th>
                <Th>Selisih</Th>
                <Th>% Error</Th>
              </tr>
            </thead>

            <tbody>
              {standardRows.map((row, i) => (
                <tr key={i}>
                  <Td>{row.span}</Td>
                  <Td>{row.inputKg}</Td>
                  <Td>0.0</Td>

                  <Td className="bg-muted/20">{row.span}</Td>

                  <TdInput>
                    <Input
                      value={watchedRows?.[i]?.beforeKg ?? ""}
                      onChange={(e) => handleKgChange(i, "beforeKg", e.target.value)}
                      className="h-8 rounded-none border-0 text-center text-xs"
                    />
                  </TdInput>

                  <TdInput>
                    <Input
                      value={watchedRows?.[i]?.beforeSelisih ?? ""}
                      readOnly
                      className="h-8 rounded-none border-0 bg-muted/20 text-center text-xs"
                    />
                  </TdInput>

                  <TdInput>
                    <Input
                      value={watchedRows?.[i]?.beforeError ?? ""}
                      readOnly
                      className="h-8 rounded-none border-0 bg-muted/20 text-center text-xs"
                    />
                  </TdInput>

                  <Td className="bg-muted/20">{row.span}</Td>

                  <TdInput>
                    <Input
                      value={watchedRows?.[i]?.afterKg ?? ""}
                      onChange={(e) => handleKgChange(i, "afterKg", e.target.value)}
                      className="h-8 rounded-none border-0 text-center text-xs"
                    />
                  </TdInput>

                  <TdInput>
                    <Input
                      value={watchedRows?.[i]?.afterSelisih ?? ""}
                      readOnly
                      className="h-8 rounded-none border-0 bg-muted/20 text-center text-xs"
                    />
                  </TdInput>

                  <TdInput>
                    <Input
                      value={watchedRows?.[i]?.afterError ?? ""}
                      readOnly
                      className="h-8 rounded-none border-0 bg-muted/20 text-center text-xs"
                    />
                  </TdInput>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Note</Label>
              <Textarea {...form.register("note")} rows={3} />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
    <td className={`border border-border p-2 text-center text-muted-foreground ${className}`}>
      {children}
    </td>
  );
}

function TdInput({ children }: { children: React.ReactNode }) {
  return <td className="border border-border p-0">{children}</td>;
}