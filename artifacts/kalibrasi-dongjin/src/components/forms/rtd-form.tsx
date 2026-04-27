// === SAME IMPORT ===
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

// === CONSTANT ===
const STATUS_OPTIONS = ["Belum Dikerjakan", "On Progress", "Selesai Kalibrasi", "Tidak bisa di Kalibrasi"];

// === TYPES ===
type RowData = {
  tempInput: string;
  tolerance: string;
  standardResistance: string;
  tempReading: string;
  deviation: string;
  measuredResistance: string;
};

type FormValues = {
  date: string;
  calibratedBy: string;
  tagNo: string;
  location: string;
  rtdType: string;
  manufacture: string;
  calibrationType: string;
  makeInstType: string;
  modelNo: string;
  serialNo: string;
  accuracy: string;
  approvalTeknisi: string;
  approvalInstrument: string;
  approvalProduction: string;
  approvalAsstMgr: string;
  rows: RowData[];
  remarks: string;
  status: string;
};

interface Props {
  onSubmit: (data: Record<string, unknown>, tagNo: string, date: string, calibratedBy: string) => void;
  isPending: boolean;
  defaultValues?: Record<string, unknown>;
}

// === COMPONENT ===
export default function RtdForm({ onSubmit, isPending, defaultValues }: Props) {
  const d = defaultValues || {};
  const { user } = useAuth();

  const form = useForm<FormValues>({
    defaultValues: {
      date: (d.date as string) || "",
      calibratedBy: (d.calibratedBy as string) || user?.name || "",
      tagNo: (d.tagNo as string) || "",
      location: (d.location as string) || "",
      rtdType: (d.rtdType as string) || "",
      manufacture: (d.manufacture as string) || "",
      calibrationType: (d.calibrationType as string) || "",
      makeInstType: (d.makeInstType as string) || "",
      modelNo: (d.modelNo as string) || "",
      serialNo: (d.serialNo as string) || "",
      accuracy: (d.accuracy as string) || "",
      approvalTeknisi: user?.name || "",
      approvalInstrument: "",
      approvalProduction: "",
      approvalAsstMgr: "",
      rows: (d.rows as RowData[]) || Array.from({ length: 7 }, () => ({
        tempInput: "",
        tolerance: "",
        standardResistance: "",
        tempReading: "",
        deviation: "",
        measuredResistance: "",
      })),
      remarks: "",
      status: "",
    },
  });

  const rows = form.watch("rows");

  const calcDeviation = (i: number, field: "tempInput" | "tempReading", val: string) => {
    form.setValue(`rows.${i}.${field}`, val);
    const r = form.getValues("rows");

    const input = parseFloat(field === "tempInput" ? val : r[i].tempInput);
    const reading = parseFloat(field === "tempReading" ? val : r[i].tempReading);

    if (!isNaN(input) && !isNaN(reading)) {
      form.setValue(`rows.${i}.deviation`, (reading - input).toFixed(2));
    } else {
      form.setValue(`rows.${i}.deviation`, "");
    }
  };

  const submit = form.handleSubmit((v) => {
    const { tagNo, date, calibratedBy, ...rest } = v;
    onSubmit(rest, tagNo, date, calibratedBy);
  });

  return (
    <form onSubmit={submit} className="space-y-6">

      {/* ================= INSTRUMENT ================= */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Instrument Data</CardTitle>
        </CardHeader>

        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Date">
            <Input type="date" {...form.register("date")} />
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

          <Field label="RTD Type">
            <Input {...form.register("rtdType")} />
          </Field>

          <Field label="Manufacture">
            <Input {...form.register("manufacture")} />
          </Field>

          <Field label="Calibration Type">
            <Input {...form.register("calibrationType")} />
          </Field>
        </CardContent>
      </Card>

      {/* ================= EQUIPMENT ================= */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Equipment Detail</CardTitle>
        </CardHeader>

        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Make/Inst Type">
            <Input {...form.register("makeInstType")} />
          </Field>

          <Field label="Model No">
            <Input {...form.register("modelNo")} />
          </Field>

          <Field label="Serial No">
            <Input {...form.register("serialNo")} />
          </Field>

          <Field label="Accuracy">
            <Input {...form.register("accuracy")} />
          </Field>
        </CardContent>
      </Card>

      {/* ================= TABLE ================= */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Calibration Data</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <Th>No</Th>
                <Th>Temp Input</Th>
                <Th>Tolerance</Th>
                <Th>Std Resist</Th>
                <Th>Temp Reading</Th>
                <Th>Deviation</Th>
                <Th>Measured</Th>
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: 7 }, (_, i) => (
                <tr key={i}>
                  <Td>{i + 1}</Td>

                  <TdInput>
                    <Input
                      value={rows?.[i]?.tempInput || ""}
                      onChange={(e) => calcDeviation(i, "tempInput", e.target.value)}
                    />
                  </TdInput>

                  <TdInput>
                    <Input {...form.register(`rows.${i}.tolerance`)} />
                  </TdInput>

                  <TdInput>
                    <Input {...form.register(`rows.${i}.standardResistance`)} />
                  </TdInput>

                  <TdInput>
                    <Input
                      value={rows?.[i]?.tempReading || ""}
                      onChange={(e) => calcDeviation(i, "tempReading", e.target.value)}
                    />
                  </TdInput>

                  <TdInput>
                    <Input value={rows?.[i]?.deviation || ""} readOnly />
                  </TdInput>

                  <TdInput>
                    <Input {...form.register(`rows.${i}.measuredResistance`)} />
                  </TdInput>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Remarks</Label>
              <Textarea {...form.register("remarks")} />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= APPROVAL ================= */}
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

          <Field label="Asst. Mgr">
            <Input {...form.register("approvalAsstMgr")} />
          </Field>
        </CardContent>
      </Card>

      {/* ================= ACTION ================= */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="h-11 px-6">
          <Save className="w-4 h-4 mr-2" />
          {isPending ? "Menyimpan..." : "Simpan Data"}
        </Button>
      </div>
    </form>
  );
}

// === SMALL COMPONENTS ===

function Field({ label, children }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground text-sm">{label}</Label>
      {children}
    </div>
  );
}

function Th({ children }: any) {
  return <th className="border p-2 text-center font-semibold">{children}</th>;
}

function Td({ children }: any) {
  return <td className="border text-center">{children}</td>;
}

function TdInput({ children }: any) {
  return <td className="border p-0">{children}</td>;
}