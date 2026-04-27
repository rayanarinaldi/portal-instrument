import { useParams, useLocation } from "wouter";
import { useGetCalibration, useUpdateCalibration, getListCalibrationsQueryKey, getGetCalibrationQueryKey, getGetCalibrationSummaryQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import ControlValveForm from "@/components/forms/control-valve-form";
import TimbanganForm from "@/components/forms/timbangan-form";
import RtdForm from "@/components/forms/rtd-form";
import PhForm from "@/components/forms/ph-form";
import TransmitterForm from "@/components/forms/transmitter-form";

export default function EditRecord() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: record, isLoading, error } = useGetCalibration(id, {
    query: {
      enabled: !!id,
      queryKey: getGetCalibrationQueryKey(id),
    },
  });

  const updateMutation = useUpdateCalibration({
    mutation: {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Data kalibrasi berhasil diperbarui." });
        queryClient.invalidateQueries({ queryKey: getListCalibrationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCalibrationQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetCalibrationSummaryQueryKey() });
        setLocation(`/records/${id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Gagal memperbarui data.", variant: "destructive" });
      },
    },
  });

  const handleSubmit = (data: Record<string, unknown>, tagNo: string, date: string, calibratedBy: string) => {
    updateMutation.mutate({
      id,
      data: {
        formType: record!.formType,
        tagNo,
        date,
        calibratedBy,
        data,
      },
    });
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (error || !record) {
    return <div className="p-8 text-center text-destructive">Gagal memuat data.</div>;
  }

  const formProps = {
    onSubmit: handleSubmit,
    isPending: updateMutation.isPending,
    defaultValues: { ...(record.data as Record<string, unknown>), tagNo: record.tagNo, date: record.date, calibratedBy: record.calibratedBy },
  };

  const formTypeLabel: Record<string, string> = {
    control_valve: "Control Valve",
    timbangan: "Timbangan",
    rtd: "RTD",
    ph: "pH",
    transmitter: "Transmitter",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(`/records/${id}`)} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Data Kalibrasi</h1>
          <p className="text-muted-foreground text-sm">
            {formTypeLabel[record.formType] || record.formType}
            {record.tagNo ? ` — ${record.tagNo}` : ""}
          </p>
        </div>
      </div>

      {record.formType === "control_valve" && <ControlValveForm {...formProps} />}
      {record.formType === "timbangan" && <TimbanganForm {...formProps} />}
      {record.formType === "rtd" && <RtdForm {...formProps} />}
      {record.formType === "ph" && <PhForm {...formProps} />}
      {record.formType === "transmitter" && <TransmitterForm {...formProps} />}
    </div>
  );
}
