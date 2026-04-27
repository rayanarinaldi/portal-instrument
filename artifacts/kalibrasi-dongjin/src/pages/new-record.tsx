import { useState } from "react";
import { useLocation } from "wouter";
import {
  useCreateCalibration,
  getListCalibrationsQueryKey,
  getGetCalibrationSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ClipboardList, Gauge, Scale, Thermometer, Beaker, Radio } from "lucide-react";
import ControlValveForm from "@/components/forms/control-valve-form";
import TimbanganForm from "@/components/forms/timbangan-form";
import RtdForm from "@/components/forms/rtd-form";
import PhForm from "@/components/forms/ph-form";
import TransmitterForm from "@/components/forms/transmitter-form";

type FormType = "control_valve" | "timbangan" | "rtd" | "ph" | "transmitter";

const formOptions: {
  value: FormType;
  label: string;
  description: string;
  icon: typeof Gauge;
  color: string;
}[] = [
  {
    value: "control_valve",
    label: "Control Valve",
    description: "Input data kalibrasi untuk control valve.",
    icon: Gauge,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    value: "timbangan",
    label: "Timbangan",
    description: "Input data kalibrasi untuk timbangan.",
    icon: Scale,
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    value: "rtd",
    label: "RTD",
    description: "Input data kalibrasi untuk RTD.",
    icon: Thermometer,
    color: "bg-red-100 text-red-700 border-red-200",
  },
  {
    value: "ph",
    label: "pH",
    description: "Input data kalibrasi untuk instrument pH.",
    icon: Beaker,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  {
    value: "transmitter",
    label: "Transmitter",
    description: "Input data kalibrasi untuk transmitter.",
    icon: Radio,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
];

export default function NewRecord() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formType, setFormType] = useState<FormType | "">("");

  const createMutation = useCreateCalibration({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Berhasil",
          description: "Data kalibrasi berhasil disimpan.",
        });
        queryClient.invalidateQueries({ queryKey: getListCalibrationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCalibrationSummaryQueryKey() });
        setLocation(`/records/${data.id}`);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Gagal menyimpan data.",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (
    data: Record<string, unknown>,
    tagNo: string,
    date: string,
    calibratedBy: string,
  ) => {
    createMutation.mutate({
      data: {
        formType: formType as FormType,
        tagNo,
        date,
        calibratedBy,
        data,
      },
    });
  };

  const selectedForm = formOptions.find((item) => item.value === formType);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLocation("/records")}
          data-testid="button-back"
          className="mt-1 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            <span className="text-sm font-medium">Input Data Kalibrasi</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">New Record</h1>
          <p className="text-sm text-muted-foreground">
            Tambahkan data kalibrasi instrument PT. Dongjin Indonesia.
          </p>
        </div>
      </div>

      {!formType ? (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle>Pilih Jenis Instrumen</CardTitle>
            <CardDescription>
              Pilih jenis instrumen terlebih dahulu sebelum mengisi formulir kalibrasi.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {formOptions.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFormType(item.value)}
                    data-testid={`button-select-${item.value}`}
                    className="group rounded-2xl border bg-background p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className={`rounded-xl border px-3 py-3 ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Pilih
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-base font-semibold">{item.label}</div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Selected Form Banner */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                {selectedForm && (
                  <div className={`rounded-xl border px-3 py-3 ${selectedForm.color}`}>
                    <selectedForm.icon className="h-5 w-5" />
                  </div>
                )}

                <div>
                  <div className="text-sm text-muted-foreground">Formulir dipilih</div>
                  <div className="text-lg font-semibold">
                    {selectedForm?.label ?? formType}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Isi data kalibrasi dengan lengkap sebelum menyimpan.
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormType("")}
                data-testid="button-change-type"
                className="rounded-xl"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Ganti Jenis
              </Button>
            </div>
          </div>

          {/* Form Body */}
          <div className="rounded-2xl">
            {formType === "control_valve" && (
              <ControlValveForm
                onSubmit={handleSubmit}
                isPending={createMutation.isPending}
              />
            )}

            {formType === "timbangan" && (
              <TimbanganForm
                onSubmit={handleSubmit}
                isPending={createMutation.isPending}
              />
            )}

            {formType === "rtd" && (
              <RtdForm
                onSubmit={handleSubmit}
                isPending={createMutation.isPending}
              />
            )}

            {formType === "ph" && (
              <PhForm
                onSubmit={handleSubmit}
                isPending={createMutation.isPending}
              />
            )}

            {formType === "transmitter" && (
              <TransmitterForm
                onSubmit={handleSubmit}
                isPending={createMutation.isPending}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}