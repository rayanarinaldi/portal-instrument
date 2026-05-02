import { Download, Eye, FilePlus2, Plus, Printer, Save, Search, Send, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { hasRole, isViewOnly, permissions } from "@/lib/permissions";

type Condition = "A" | "B" | "C" | "D" | "E";
type TemplateType = "base" | "cctv" | "dcs_pc" | "gas_detector" | "ups";

type CheckColumn = {
  key: string;
  label: string;
  unit?: string;
  kind?: "condition" | "number" | "text";
};

type Equipment = {
  id: string;
  plantArea: string;
  subArea?: string;
  equipmentService: string;
  tagNo: string;
};

type PreventiveRow = {
  equipmentId: string;
  values: Record<string, string>;
  remark: string;
};

type PreventiveReport = {
  id: string;
  date: string;
  plantArea: string;
  templateType: TemplateType;
  checkedBy: string;
  rows: PreventiveRow[];
  equipment: Equipment[];
  savedAt: string;
  savedBy: string;
};

const STORAGE_KEY = "instrument-dji.preventive.simple.v1";
const HISTORY_KEY = "instrument-dji.preventive.history.v1";
const ISSUE_STORAGE_KEY = "instrument-dji.preventive.issues";
const ISSUE_UPDATED_EVENT = "instrument-dji.issue-updated";

const CONDITION_OPTIONS: Array<{ value: Condition; label: string }> = [
  { value: "A", label: "A - Very Good" },
  { value: "B", label: "B - Good" },
  { value: "C", label: "C - Fairly Good" },
  { value: "D", label: "D - Poor / Still Operation" },
  { value: "E", label: "E - Damaged / Needs Repair" },
];

const CONDITION_TEXT: Record<Condition, string> = {
  A: "VERY GOOD CONDITION",
  B: "GOOD CONDITION",
  C: "FAIRLY GOOD CONDITION",
  D: "POOR CONDITION (STILL OPERATION)",
  E: "DAMAGED CONDITION (NEEDS REPAIR/REPLACEMENT)",
};

const conditionClass: Record<Condition, string> = {
  A: "border-emerald-700 bg-emerald-700 text-white",
  B: "border-green-500 bg-green-100 text-green-800",
  C: "border-yellow-500 bg-yellow-100 text-yellow-900",
  D: "border-orange-500 bg-orange-100 text-orange-900",
  E: "border-red-600 bg-red-100 text-red-800",
};

const templateLabels: Record<TemplateType, string> = {
  base: "Standard Instrument",
  cctv: "CCTV",
  dcs_pc: "DCS PC",
  gas_detector: "Gas Detector",
  ups: "UPS",
};

const templateColumns: Record<TemplateType, CheckColumn[]> = {
  base: [
    { key: "dcs_panel", label: "DCS/PANEL" },
    { key: "field", label: "FIELD" },
  ],
  cctv: [
    { key: "camera_support", label: "CAMERA SUPPORT" },
    { key: "kabel_connector", label: "KABEL & CONNECTOR" },
  ],
  dcs_pc: [
    { key: "cpu_temp", label: "CPU TEMP", unit: "°C", kind: "number" },
    { key: "rh", label: "% RH", kind: "number" },
  ],
  gas_detector: [
    { key: "dcs", label: "DCS" },
    { key: "field", label: "FIELD" },
    { key: "sensor", label: "SENSOR" },
    { key: "fisik_power", label: "FISIK/POWER" },
    { key: "output_ma", label: "OUTPUT", unit: "mA", kind: "number" },
  ],
  ups: [
    { key: "fisik_ups", label: "FISIK UPS" },
    { key: "baterai", label: "BATERAI" },
    { key: "temp_rh", label: "°C / %RH", kind: "text" },
  ],
};

const plantTemplateMap: Record<string, TemplateType> = {
  "CCTV": "cctv",
  "DCS PC": "dcs_pc",
  "DCS PC": "dcs_pc",
  "GAS DETECTOR": "gas_detector",
  "UPS": "ups",
};

const defaultPlantAreas = [
  "HYPO PROCESS",
  "HYDRAZINE",
  "HDCA",
  "E-PROCESS",
  "PANNEVISE DRYING",
  "PE - MIXING",
  "ZET O MILL",
  "ADCA MILLING",
  "OBSH TSH",
  "COMPRESSOR",
  "AIR DRYER",
  "REFRIGRATOR",
  "BOILER",
  "WWT",
  "DEMIN WATER",
  "LABORATORIUM",
  "CCTV",
  "DCS PC",
  "UPS",
  "GAS DETECTOR"
];

const equipmentPresets: Record<string, Equipment[]> = {
  "HYPO PROCESS": [
    {
      "id": "hypo-process-1",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "DI WATER TO T-4501",
      "tagNo": "FIC-4501B"
    },
    {
      "id": "hypo-process-2",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "NaOH 31% TO T-4501",
      "tagNo": "FICQ-4501A"
    },
    {
      "id": "hypo-process-3",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "CL2 TO T-4502",
      "tagNo": "FICQ-4502"
    },
    {
      "id": "hypo-process-4",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "DI WATER TO T-4601",
      "tagNo": "FICQ-4601A"
    },
    {
      "id": "hypo-process-5",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "NaOH 31% TO T-4601",
      "tagNo": "FIC-4601B"
    },
    {
      "id": "hypo-process-6",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "CL2 TO T-4602",
      "tagNo": "FICQ-4602"
    },
    {
      "id": "hypo-process-7",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "LEVEL ST-4503",
      "tagNo": "LI-4503"
    },
    {
      "id": "hypo-process-8",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "LEVEL ST-4603",
      "tagNo": "LI-4603"
    },
    {
      "id": "hypo-process-9",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "INDICATION ST-4503",
      "tagNo": "ORP-4503"
    },
    {
      "id": "hypo-process-10",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "INDICATION ST-4603",
      "tagNo": "ORP-4603"
    },
    {
      "id": "hypo-process-11",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "PH INDICATION ST-4503",
      "tagNo": "PH-4503"
    },
    {
      "id": "hypo-process-12",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "PH INDICATION ST-4603",
      "tagNo": "PH-4603"
    },
    {
      "id": "hypo-process-13",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "TEMPERATURE ST-4503",
      "tagNo": "TI-4503"
    },
    {
      "id": "hypo-process-14",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "TEMPERATURE ST-4603",
      "tagNo": "TI-4603"
    },
    {
      "id": "hypo-process-15",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "ORP SCRUBBER",
      "tagNo": "-"
    },
    {
      "id": "hypo-process-16",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "COUSTIC P-500",
      "tagNo": "FI-4009"
    },
    {
      "id": "hypo-process-17",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "ST-4007 (COUSTIC)",
      "tagNo": "LI-4007"
    },
    {
      "id": "hypo-process-18",
      "plantArea": "HYPO PROCESS",
      "equipmentService": "COUSTIC",
      "tagNo": "PG-4008"
    }
  ],
  "HYDRAZINE": [
    {
      "id": "hydrazine-1",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DC-1021 TO HX-1024",
      "tagNo": "FI-1206"
    },
    {
      "id": "hydrazine-2",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1047 A/B TO DC-1021",
      "tagNo": "FIC-1202"
    },
    {
      "id": "hydrazine-3",
      "plantArea": "HYDRAZINE",
      "equipmentService": "CWS TO HX-1024",
      "tagNo": "FIC-1203"
    },
    {
      "id": "hydrazine-4",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1021 A/B TO HX-1023",
      "tagNo": "FICQ-1201"
    },
    {
      "id": "hydrazine-5",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO DC-1021",
      "tagNo": "FICQ-1204"
    },
    {
      "id": "hydrazine-6",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1023A TO HX-1045",
      "tagNo": "FIC-1205"
    },
    {
      "id": "hydrazine-7",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DC-1022",
      "tagNo": "LIA-1202"
    },
    {
      "id": "hydrazine-8",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DC-1021 TO WWT",
      "tagNo": "LIC-1201"
    },
    {
      "id": "hydrazine-9",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1023A TO DC-1022",
      "tagNo": "LIC-1203"
    },
    {
      "id": "hydrazine-10",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-1021",
      "tagNo": "PI-1201"
    },
    {
      "id": "hydrazine-11",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE HX-1024",
      "tagNo": "PI-1202"
    },
    {
      "id": "hydrazine-12",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-1022",
      "tagNo": "PI-1203"
    },
    {
      "id": "hydrazine-13",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DM-1023",
      "tagNo": "PI-1204"
    },
    {
      "id": "hydrazine-14",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-1021",
      "tagNo": "TR-1201-2"
    },
    {
      "id": "hydrazine-15",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-1021",
      "tagNo": "TR-1201-3"
    },
    {
      "id": "hydrazine-16",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-1021",
      "tagNo": "TR-1201-4"
    },
    {
      "id": "hydrazine-17",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-1021",
      "tagNo": "TR-1201-5"
    },
    {
      "id": "hydrazine-18",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-1021",
      "tagNo": "TR-1201-6"
    },
    {
      "id": "hydrazine-19",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP HX-1024 TO DC-1022",
      "tagNo": "TR-1202-1"
    },
    {
      "id": "hydrazine-20",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-1022",
      "tagNo": "TR-1202-2"
    },
    {
      "id": "hydrazine-21",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-1022",
      "tagNo": "TR-1202-3"
    },
    {
      "id": "hydrazine-22",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DM-1023",
      "tagNo": "TR-1202-4"
    },
    {
      "id": "hydrazine-23",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1023B TO DM-1023",
      "tagNo": "TR-1202-5"
    },
    {
      "id": "hydrazine-24",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-1024 TO C.W.R",
      "tagNo": "TR-1203"
    },
    {
      "id": "hydrazine-25",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-1025 TO C.W.R",
      "tagNo": "TR-1204"
    },
    {
      "id": "hydrazine-26",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TRA-1201-1",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-27",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1023 A/B TO DR-1031",
      "tagNo": "FI-1307"
    },
    {
      "id": "hydrazine-28",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DR-1031 TO HX-1036",
      "tagNo": "FI-1308"
    },
    {
      "id": "hydrazine-29",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1031 A/B TO DC-2031",
      "tagNo": "FIC-1302"
    },
    {
      "id": "hydrazine-30",
      "plantArea": "HYDRAZINE",
      "equipmentService": "CWS TO HX-1036",
      "tagNo": "FIC-1303"
    },
    {
      "id": "hydrazine-31",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1039 A/B TO DC-1034",
      "tagNo": "FIC-1304"
    },
    {
      "id": "hydrazine-32",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1030 A/B TO DC-1031",
      "tagNo": "FICQ-1301"
    },
    {
      "id": "hydrazine-33",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO HX-1034",
      "tagNo": "FICQ-1305"
    },
    {
      "id": "hydrazine-34",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1041 A/B TO DC-1041",
      "tagNo": "FICQ-1306"
    },
    {
      "id": "hydrazine-35",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1008 TO TK-1031",
      "tagNo": "FIQ-1309"
    },
    {
      "id": "hydrazine-36",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DR-1031",
      "tagNo": "LI-1303"
    },
    {
      "id": "hydrazine-37",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL TK-1031",
      "tagNo": "LIA-1301"
    },
    {
      "id": "hydrazine-38",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL CONTROL DC-1031",
      "tagNo": "LIC-1302"
    },
    {
      "id": "hydrazine-39",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-1304",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-40",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-1305",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-41",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-1306",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-42",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-1307",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-43",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DC-2031 TO HX-1032A",
      "tagNo": "PI-1302"
    },
    {
      "id": "hydrazine-44",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DR-1031",
      "tagNo": "PI-1303"
    },
    {
      "id": "hydrazine-45",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DR-1032",
      "tagNo": "PI-1304"
    },
    {
      "id": "hydrazine-46",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DR-1033",
      "tagNo": "PI-1305"
    },
    {
      "id": "hydrazine-47",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DR-1034",
      "tagNo": "PI-1306"
    },
    {
      "id": "hydrazine-48",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-1034",
      "tagNo": "PI-1307"
    },
    {
      "id": "hydrazine-49",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PICA-1301",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-50",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1031",
      "tagNo": "TR-1301-1"
    },
    {
      "id": "hydrazine-51",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1031",
      "tagNo": "TR-1301-2"
    },
    {
      "id": "hydrazine-52",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1031",
      "tagNo": "TR-1301-3"
    },
    {
      "id": "hydrazine-53",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1031",
      "tagNo": "TR-1301-4"
    },
    {
      "id": "hydrazine-54",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1031",
      "tagNo": "TR-1301-5"
    },
    {
      "id": "hydrazine-55",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DR-1031",
      "tagNo": "TR-1301-6"
    },
    {
      "id": "hydrazine-56",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TR-1301-7",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-57",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TR-1301-8",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-58",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DR-1032",
      "tagNo": "TR-1302-1"
    },
    {
      "id": "hydrazine-59",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DR-1033",
      "tagNo": "TR-1302-2"
    },
    {
      "id": "hydrazine-60",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DR-1034",
      "tagNo": "TR-1302-3"
    },
    {
      "id": "hydrazine-61",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1034",
      "tagNo": "TR-1302-4"
    },
    {
      "id": "hydrazine-62",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1034",
      "tagNo": "TR-1302-5"
    },
    {
      "id": "hydrazine-63",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1034",
      "tagNo": "TR-1302-6"
    },
    {
      "id": "hydrazine-64",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DEMIN WTR TO DC-1061",
      "tagNo": "FI-1604"
    },
    {
      "id": "hydrazine-65",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PP-1060 TO DC-1061",
      "tagNo": "FIC-1601"
    },
    {
      "id": "hydrazine-66",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1062 TO DC-1061",
      "tagNo": "FIC-1603"
    },
    {
      "id": "hydrazine-67",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO HX-1061R",
      "tagNo": "FICQ-1602"
    },
    {
      "id": "hydrazine-68",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DC-1061",
      "tagNo": "LI-1601"
    },
    {
      "id": "hydrazine-69",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL CONTROL DM-1062",
      "tagNo": "LIC-1602"
    },
    {
      "id": "hydrazine-70",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-1601",
      "tagNo": "PI-1601"
    },
    {
      "id": "hydrazine-71",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1061",
      "tagNo": "TR-1601-1"
    },
    {
      "id": "hydrazine-72",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1061",
      "tagNo": "TR-1601-2"
    },
    {
      "id": "hydrazine-73",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1061",
      "tagNo": "TR-1601-3"
    },
    {
      "id": "hydrazine-74",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TR-1602",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-75",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1031 A/B TO HX-1045",
      "tagNo": "FIC-1401"
    },
    {
      "id": "hydrazine-76",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1043 A/B TO DC-1041",
      "tagNo": "FIC-1404A"
    },
    {
      "id": "hydrazine-77",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1043 A/B TO DC-1031",
      "tagNo": "FIC-1404B"
    },
    {
      "id": "hydrazine-78",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-1044 TO HH 80%",
      "tagNo": "FICQ-1402"
    },
    {
      "id": "hydrazine-79",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO HX 1041",
      "tagNo": "FICQ-1403"
    },
    {
      "id": "hydrazine-80",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DC-1041",
      "tagNo": "LI-1401"
    },
    {
      "id": "hydrazine-81",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DM-1044",
      "tagNo": "LI-1403"
    },
    {
      "id": "hydrazine-82",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-1404",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-83",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LISA-1045",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-84",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-1041",
      "tagNo": "PI-1401"
    },
    {
      "id": "hydrazine-85",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PI-1402",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-86",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE TK-1045",
      "tagNo": "TI-1045"
    },
    {
      "id": "hydrazine-87",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1041",
      "tagNo": "TR-1401-1"
    },
    {
      "id": "hydrazine-88",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1041",
      "tagNo": "TR-1401-2"
    },
    {
      "id": "hydrazine-89",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1041",
      "tagNo": "TR-1401-3"
    },
    {
      "id": "hydrazine-90",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE HX-1042A",
      "tagNo": "TR-1402"
    },
    {
      "id": "hydrazine-91",
      "plantArea": "HYDRAZINE",
      "equipmentService": "EJ-1013 TO EJ-1012B",
      "tagNo": "FI-1023B"
    },
    {
      "id": "hydrazine-92",
      "plantArea": "HYDRAZINE",
      "equipmentService": "EJ-1013 TO EJ-1012C",
      "tagNo": "FI-1023C"
    },
    {
      "id": "hydrazine-93",
      "plantArea": "HYDRAZINE",
      "equipmentService": "EJ-1013 TO EJ-1012D",
      "tagNo": "FI-1023D"
    },
    {
      "id": "hydrazine-94",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-1011A",
      "tagNo": "FI-1026A"
    },
    {
      "id": "hydrazine-95",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-1011B",
      "tagNo": "FI-1026B"
    },
    {
      "id": "hydrazine-96",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-1011C",
      "tagNo": "FI-1026C"
    },
    {
      "id": "hydrazine-97",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-1011D",
      "tagNo": "FI1026D"
    },
    {
      "id": "hydrazine-98",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-1012E TO DC-1011",
      "tagNo": "FI-1028"
    },
    {
      "id": "hydrazine-99",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1014A TO HX-1012A",
      "tagNo": "FI-1030A"
    },
    {
      "id": "hydrazine-100",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1014B TO HX-1012B",
      "tagNo": "FI-1030B"
    },
    {
      "id": "hydrazine-101",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1014C TO HX-1012C",
      "tagNo": "FI-1030C"
    },
    {
      "id": "hydrazine-102",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1014D TO HX-1012D",
      "tagNo": "FI-1030D"
    },
    {
      "id": "hydrazine-103",
      "plantArea": "HYDRAZINE",
      "equipmentService": "GELATINE TO DR-1011",
      "tagNo": "FI-1031"
    },
    {
      "id": "hydrazine-104",
      "plantArea": "HYDRAZINE",
      "equipmentService": "N2 GAS TO DR-1011",
      "tagNo": "FI-1032"
    },
    {
      "id": "hydrazine-105",
      "plantArea": "HYDRAZINE",
      "equipmentService": "EJ-1013 TO EJ-1012A",
      "tagNo": "FIC-1023A"
    },
    {
      "id": "hydrazine-106",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-1011A/B/C/D",
      "tagNo": "FIC-1027"
    },
    {
      "id": "hydrazine-107",
      "plantArea": "HYDRAZINE",
      "equipmentService": "FICQ-1021",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-108",
      "plantArea": "HYDRAZINE",
      "equipmentService": "14% HYPO TO EJ-1013",
      "tagNo": "FICQ-1024"
    },
    {
      "id": "hydrazine-109",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-1031 A/B TO EJ-1011 A/B",
      "tagNo": "FICQ-1025"
    },
    {
      "id": "hydrazine-110",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DM WTR TO EJ-1013",
      "tagNo": "FICQ-1029"
    },
    {
      "id": "hydrazine-111",
      "plantArea": "HYDRAZINE",
      "equipmentService": "FICQ-1030",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-112",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DR-1011",
      "tagNo": "LIA-1023"
    },
    {
      "id": "hydrazine-113",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PICA-1022",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-114",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DR-1011 EJ-1011 A/B/C/D",
      "tagNo": "PICA-1023"
    },
    {
      "id": "hydrazine-115",
      "plantArea": "HYDRAZINE",
      "equipmentService": "CWS TO HX-1012 A/B/C/D",
      "tagNo": "TI-1022A"
    },
    {
      "id": "hydrazine-116",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-1012 A/B/C/D TO CWR",
      "tagNo": "TI-1022B"
    },
    {
      "id": "hydrazine-117",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1011",
      "tagNo": "TRA-1021-2"
    },
    {
      "id": "hydrazine-118",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1011",
      "tagNo": "TRA-1021-3"
    },
    {
      "id": "hydrazine-119",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-1011",
      "tagNo": "TRA-1021-4"
    },
    {
      "id": "hydrazine-120",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DC-2021 TO HX-2024",
      "tagNo": "FI-2206"
    },
    {
      "id": "hydrazine-121",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2047 A/B TO DC-2021",
      "tagNo": "FIC-2202"
    },
    {
      "id": "hydrazine-122",
      "plantArea": "HYDRAZINE",
      "equipmentService": "CWS TO HX-2024",
      "tagNo": "FIC-2203"
    },
    {
      "id": "hydrazine-123",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2021 A/B TO HX-2023",
      "tagNo": "FICQ-2201"
    },
    {
      "id": "hydrazine-124",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO DC-2021",
      "tagNo": "FICQ-2204"
    },
    {
      "id": "hydrazine-125",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2023A TO HX-2045",
      "tagNo": "FIC-2205"
    },
    {
      "id": "hydrazine-126",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DC-1022",
      "tagNo": "LIA-2202"
    },
    {
      "id": "hydrazine-127",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DC-2021 TO WWT",
      "tagNo": "LIC-2201"
    },
    {
      "id": "hydrazine-128",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2023A TO DC-2022",
      "tagNo": "LIC-2203"
    },
    {
      "id": "hydrazine-129",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-2021",
      "tagNo": "PI-2201"
    },
    {
      "id": "hydrazine-130",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE HX-2024",
      "tagNo": "PI-2202"
    },
    {
      "id": "hydrazine-131",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-2022",
      "tagNo": "PI-2203"
    },
    {
      "id": "hydrazine-132",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DM-2023",
      "tagNo": "PI-2204"
    },
    {
      "id": "hydrazine-133",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-2021",
      "tagNo": "TR-2201-2"
    },
    {
      "id": "hydrazine-134",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-2021",
      "tagNo": "TR-2201-3"
    },
    {
      "id": "hydrazine-135",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-2021",
      "tagNo": "TR-2201-4"
    },
    {
      "id": "hydrazine-136",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-2021",
      "tagNo": "TR-2201-5"
    },
    {
      "id": "hydrazine-137",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-2021",
      "tagNo": "TR-2201-6"
    },
    {
      "id": "hydrazine-138",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP HX-2024 TO DC-2022",
      "tagNo": "TR-2202-1"
    },
    {
      "id": "hydrazine-139",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-2022",
      "tagNo": "TR-2202-2"
    },
    {
      "id": "hydrazine-140",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DC-2022",
      "tagNo": "TR-2202-3"
    },
    {
      "id": "hydrazine-141",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMP DM-2023",
      "tagNo": "TR-2202-4"
    },
    {
      "id": "hydrazine-142",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2023B TO DM-2023",
      "tagNo": "TR-2202-5"
    },
    {
      "id": "hydrazine-143",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-2024 TO C.W.R",
      "tagNo": "TR-2203"
    },
    {
      "id": "hydrazine-144",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-2025 TO C.W.R",
      "tagNo": "TR-2204"
    },
    {
      "id": "hydrazine-145",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TRA-2201-1",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-146",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2023 A/B TO DR-2031",
      "tagNo": "FI-2307"
    },
    {
      "id": "hydrazine-147",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DR-2031 TO HX-2036",
      "tagNo": "FI-2308"
    },
    {
      "id": "hydrazine-148",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2031 A/B TO DC-2031",
      "tagNo": "FIC-2302"
    },
    {
      "id": "hydrazine-149",
      "plantArea": "HYDRAZINE",
      "equipmentService": "CWS TO HX-2036",
      "tagNo": "FIC-2303"
    },
    {
      "id": "hydrazine-150",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2039 A/B TO DC-2034",
      "tagNo": "FIC-2304"
    },
    {
      "id": "hydrazine-151",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2030 A/B TO DC-2031",
      "tagNo": "FICQ-2301"
    },
    {
      "id": "hydrazine-152",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO HX-2034",
      "tagNo": "FICQ-2305"
    },
    {
      "id": "hydrazine-153",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2041 A/B TO DC-2041",
      "tagNo": "FICQ-2306"
    },
    {
      "id": "hydrazine-154",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2008 TO TK-2031",
      "tagNo": "FIQ-2309"
    },
    {
      "id": "hydrazine-155",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DR-2031",
      "tagNo": "LI-2303"
    },
    {
      "id": "hydrazine-156",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL TK-2031",
      "tagNo": "LIA-2301"
    },
    {
      "id": "hydrazine-157",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL CONTROL DC-2031",
      "tagNo": "LIC-2302"
    },
    {
      "id": "hydrazine-158",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-2304",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-159",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-2305",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-160",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-2306",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-161",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-2307CASCADE TO",
      "tagNo": "FICQ-2306"
    },
    {
      "id": "hydrazine-162",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DC-2031 TO HX-2032A",
      "tagNo": "PI-2302"
    },
    {
      "id": "hydrazine-163",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DR-2031",
      "tagNo": "PI-2303"
    },
    {
      "id": "hydrazine-164",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DR-2032",
      "tagNo": "PI-2304"
    },
    {
      "id": "hydrazine-165",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DR-2033",
      "tagNo": "PI-2305"
    },
    {
      "id": "hydrazine-166",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DR-2034",
      "tagNo": "PI-2306"
    },
    {
      "id": "hydrazine-167",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-2034",
      "tagNo": "PI-2307"
    },
    {
      "id": "hydrazine-168",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PICA-2301",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-169",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2031",
      "tagNo": "TR-2301-1"
    },
    {
      "id": "hydrazine-170",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2031",
      "tagNo": "TR-2301-2"
    },
    {
      "id": "hydrazine-171",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2031",
      "tagNo": "TR-2301-3"
    },
    {
      "id": "hydrazine-172",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2031",
      "tagNo": "TR-2301-4"
    },
    {
      "id": "hydrazine-173",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2031",
      "tagNo": "TR-2301-5"
    },
    {
      "id": "hydrazine-174",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DR-2031",
      "tagNo": "TR-2301-6"
    },
    {
      "id": "hydrazine-175",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TR-2301-7",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-176",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TR-2301-8",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-177",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DR-2032",
      "tagNo": "TR-2302-1"
    },
    {
      "id": "hydrazine-178",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DR-2033",
      "tagNo": "TR-2302-2"
    },
    {
      "id": "hydrazine-179",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DR-2034",
      "tagNo": "TR-2302-3"
    },
    {
      "id": "hydrazine-180",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2034",
      "tagNo": "TR-2302-4"
    },
    {
      "id": "hydrazine-181",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2034",
      "tagNo": "TR-2302-5"
    },
    {
      "id": "hydrazine-182",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2034",
      "tagNo": "TR-2302-6"
    },
    {
      "id": "hydrazine-183",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2031 A/B TO HX-2045",
      "tagNo": "FIC-2401"
    },
    {
      "id": "hydrazine-184",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2043 A/B TO DC-2041",
      "tagNo": "FIC-2404A"
    },
    {
      "id": "hydrazine-185",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2043 A/B TO DC-2031",
      "tagNo": "FIC-2404B"
    },
    {
      "id": "hydrazine-186",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-2044 TO HH 80%",
      "tagNo": "FICQ-2402"
    },
    {
      "id": "hydrazine-187",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO HX 1041",
      "tagNo": "FICQ-2403"
    },
    {
      "id": "hydrazine-188",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DC-2041",
      "tagNo": "LI-2401"
    },
    {
      "id": "hydrazine-189",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DM-2044",
      "tagNo": "LI-2403"
    },
    {
      "id": "hydrazine-190",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LIC-2404",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-191",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LISA-2045",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-192",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-2041",
      "tagNo": "PI-2401"
    },
    {
      "id": "hydrazine-193",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PI-2402",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-194",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE TK-2045",
      "tagNo": "TI-2045"
    },
    {
      "id": "hydrazine-195",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2041",
      "tagNo": "TR-2401-1"
    },
    {
      "id": "hydrazine-196",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2041",
      "tagNo": "TR-2401-2"
    },
    {
      "id": "hydrazine-197",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2041",
      "tagNo": "TR-2401-3"
    },
    {
      "id": "hydrazine-198",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE HX-2042A",
      "tagNo": "TR-2402"
    },
    {
      "id": "hydrazine-199",
      "plantArea": "HYDRAZINE",
      "equipmentService": "EJ-2013 TO EJ-2012B",
      "tagNo": "FI-2023B"
    },
    {
      "id": "hydrazine-200",
      "plantArea": "HYDRAZINE",
      "equipmentService": "EJ-2013 TO EJ-2012C",
      "tagNo": "FI-2023C"
    },
    {
      "id": "hydrazine-201",
      "plantArea": "HYDRAZINE",
      "equipmentService": "EJ-2013 TO EJ-2012D",
      "tagNo": "FI-2023D"
    },
    {
      "id": "hydrazine-202",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-2011A",
      "tagNo": "FI-2026A"
    },
    {
      "id": "hydrazine-203",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-2011B",
      "tagNo": "FI-2026B"
    },
    {
      "id": "hydrazine-204",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-2011C",
      "tagNo": "FI-2026C"
    },
    {
      "id": "hydrazine-205",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-2011D",
      "tagNo": "FI1026D"
    },
    {
      "id": "hydrazine-206",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-2012E TO DC-2011",
      "tagNo": "FI-2028"
    },
    {
      "id": "hydrazine-207",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2014A TO HX-2012A",
      "tagNo": "FI-2030A"
    },
    {
      "id": "hydrazine-208",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2014B TO HX-2012B",
      "tagNo": "FI-2030B"
    },
    {
      "id": "hydrazine-209",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2014C TO HX-2012C",
      "tagNo": "FI-2030C"
    },
    {
      "id": "hydrazine-210",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2014D TO HX-2012D",
      "tagNo": "FI-2030D"
    },
    {
      "id": "hydrazine-211",
      "plantArea": "HYDRAZINE",
      "equipmentService": "GELATINE TO DR-2011",
      "tagNo": "FI-2031"
    },
    {
      "id": "hydrazine-212",
      "plantArea": "HYDRAZINE",
      "equipmentService": "N2 GAS TO DR-2011",
      "tagNo": "FI-2032"
    },
    {
      "id": "hydrazine-213",
      "plantArea": "HYDRAZINE",
      "equipmentService": "EJ-2013 TO EJ-2012A",
      "tagNo": "FIC-2023A"
    },
    {
      "id": "hydrazine-214",
      "plantArea": "HYDRAZINE",
      "equipmentService": "NH3 TO EJ-2011A/B/C/D",
      "tagNo": "FIC-2027"
    },
    {
      "id": "hydrazine-215",
      "plantArea": "HYDRAZINE",
      "equipmentService": "FICQ-2021",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-216",
      "plantArea": "HYDRAZINE",
      "equipmentService": "14% HYPO TO EJ-2013",
      "tagNo": "FICQ-2024"
    },
    {
      "id": "hydrazine-217",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-2031 A/B TO EJ-2011 A/B",
      "tagNo": "FICQ-2025"
    },
    {
      "id": "hydrazine-218",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DM WTR TO EJ-2013",
      "tagNo": "FICQ-2029"
    },
    {
      "id": "hydrazine-219",
      "plantArea": "HYDRAZINE",
      "equipmentService": "FICQ-2030",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-220",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DR-2011",
      "tagNo": "LIA-2023"
    },
    {
      "id": "hydrazine-221",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PICA-2022",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-222",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DR-2011 EJ-2011 A/B/C/D",
      "tagNo": "PICA-2023"
    },
    {
      "id": "hydrazine-223",
      "plantArea": "HYDRAZINE",
      "equipmentService": "CWS TO HX-2012 A/B/C/D",
      "tagNo": "TI-2022A"
    },
    {
      "id": "hydrazine-224",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-2012 A/B/C/D TO CWR",
      "tagNo": "TI-2022B"
    },
    {
      "id": "hydrazine-225",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2011",
      "tagNo": "TRA-2021-2"
    },
    {
      "id": "hydrazine-226",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2011",
      "tagNo": "TRA-2021-3"
    },
    {
      "id": "hydrazine-227",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-2011",
      "tagNo": "TRA-2021-4"
    },
    {
      "id": "hydrazine-228",
      "plantArea": "HYDRAZINE",
      "equipmentService": "FI-3501",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-229",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO HX-3055R",
      "tagNo": "FIC-3504"
    },
    {
      "id": "hydrazine-230",
      "plantArea": "HYDRAZINE",
      "equipmentService": "P-3058 A/B TODC-3056",
      "tagNo": "FIC-3506"
    },
    {
      "id": "hydrazine-231",
      "plantArea": "HYDRAZINE",
      "equipmentService": "STEAM TO HX-3056R",
      "tagNo": "FIC-3507"
    },
    {
      "id": "hydrazine-232",
      "plantArea": "HYDRAZINE",
      "equipmentService": "HX-56K TO TK-3059",
      "tagNo": "FIC-3508"
    },
    {
      "id": "hydrazine-233",
      "plantArea": "HYDRAZINE",
      "equipmentService": "DEMIN WTR TO TK-3059",
      "tagNo": "FIQS-3509"
    },
    {
      "id": "hydrazine-234",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL TK-3059B",
      "tagNo": "LI-3059B"
    },
    {
      "id": "hydrazine-235",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DC-3055",
      "tagNo": "LI-3505"
    },
    {
      "id": "hydrazine-236",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL DC-3056",
      "tagNo": "LI-3506"
    },
    {
      "id": "hydrazine-237",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL TK-3059",
      "tagNo": "LIA-3509"
    },
    {
      "id": "hydrazine-238",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL CONTROL DM-3058",
      "tagNo": "LIC-3510"
    },
    {
      "id": "hydrazine-239",
      "plantArea": "HYDRAZINE",
      "equipmentService": "PRESSURE DC-3056",
      "tagNo": "PIA-3506"
    },
    {
      "id": "hydrazine-240",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TR-3505-1",
      "tagNo": "-"
    },
    {
      "id": "hydrazine-241",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-3055",
      "tagNo": "TR-3505-2"
    },
    {
      "id": "hydrazine-242",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-3056",
      "tagNo": "TR-3506-1"
    },
    {
      "id": "hydrazine-243",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-3056",
      "tagNo": "TR-3506-2"
    },
    {
      "id": "hydrazine-244",
      "plantArea": "HYDRAZINE",
      "equipmentService": "TEMPERATURE DC-3056",
      "tagNo": "TR3506-3"
    },
    {
      "id": "hydrazine-3055",
      "plantArea": "HYDRAZINE",
      "equipmentService": "AND",
      "tagNo": "TK-3055"
    },
    {
      "id": "hydrazine-245",
      "plantArea": "HYDRAZINE",
      "equipmentService": "LEVEL TK-8",
      "tagNo": "LI-1002"
    }
  ],
  "HDCA": [
    {
      "id": "hdca-1",
      "plantArea": "HDCA",
      "equipmentService": "R-4021 TO COND",
      "tagNo": "TIC-4021"
    },
    {
      "id": "hdca-2",
      "plantArea": "HDCA",
      "equipmentService": "R-4022 TO COND",
      "tagNo": "TIC-4022"
    },
    {
      "id": "hdca-3",
      "plantArea": "HDCA",
      "equipmentService": "R-4023 TO COND",
      "tagNo": "TIC-4023"
    },
    {
      "id": "hdca-4",
      "plantArea": "HDCA",
      "equipmentService": "R-4024 TO COND",
      "tagNo": "TIC-4024"
    },
    {
      "id": "hdca-5",
      "plantArea": "HDCA",
      "equipmentService": "R-4025 TO COND",
      "tagNo": "TIC-4025"
    },
    {
      "id": "hdca-6",
      "plantArea": "HDCA",
      "equipmentService": "R-4026 TO COND",
      "tagNo": "TIC-4026"
    },
    {
      "id": "hdca-7",
      "plantArea": "HDCA",
      "equipmentService": "R-4027 TO COND",
      "tagNo": "TIC-4027"
    },
    {
      "id": "hdca-8",
      "plantArea": "HDCA",
      "equipmentService": "R-4028 TO COND",
      "tagNo": "TIC-4028"
    },
    {
      "id": "hdca-9",
      "plantArea": "HDCA",
      "equipmentService": "TEMPERATURE T-4029",
      "tagNo": "TI-4029"
    },
    {
      "id": "hdca-10",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL T-4029",
      "tagNo": "LI-4029"
    },
    {
      "id": "hdca-11",
      "plantArea": "HDCA",
      "equipmentService": "UREA TO R-4301",
      "tagNo": "FIC-4004C"
    },
    {
      "id": "hdca-12",
      "plantArea": "HDCA",
      "equipmentService": "UREA TO R-4101",
      "tagNo": "FICQ-4004A"
    },
    {
      "id": "hdca-13",
      "plantArea": "HDCA",
      "equipmentService": "UREA TO R-4201",
      "tagNo": "FICQ-4004B"
    },
    {
      "id": "hdca-14",
      "plantArea": "HDCA",
      "equipmentService": "SIRKULASI FROM HX-4100",
      "tagNo": "FICQ-4100"
    },
    {
      "id": "hdca-15",
      "plantArea": "HDCA",
      "equipmentService": "SIRKULASI FROM HX-4200",
      "tagNo": "FICQ-4200"
    },
    {
      "id": "hdca-16",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-4005",
      "tagNo": "LI-4005"
    },
    {
      "id": "hdca-17",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL R-4103",
      "tagNo": "LI-4103"
    },
    {
      "id": "hdca-18",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL R-4203",
      "tagNo": "LI-4203"
    },
    {
      "id": "hdca-19",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL R-4303",
      "tagNo": "LI-4303"
    },
    {
      "id": "hdca-20",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL R-4202 TO R-4203",
      "tagNo": "LIS-4202"
    },
    {
      "id": "hdca-21",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL R-4302 TO R-4303",
      "tagNo": "LIS-4302"
    },
    {
      "id": "hdca-22",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO ST-4005",
      "tagNo": "TIC-4005"
    },
    {
      "id": "hdca-23",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO HX-4100",
      "tagNo": "TIC-4100"
    },
    {
      "id": "hdca-24",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO R-4101",
      "tagNo": "TIC-4101"
    },
    {
      "id": "hdca-25",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO R-4102",
      "tagNo": "TIC-4102"
    },
    {
      "id": "hdca-26",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO HX-4200",
      "tagNo": "TIC-4200"
    },
    {
      "id": "hdca-27",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO R-4201",
      "tagNo": "TIC-4201"
    },
    {
      "id": "hdca-28",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO R-4202",
      "tagNo": "TIC-4202"
    },
    {
      "id": "hdca-29",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO HX-4300",
      "tagNo": "TIC-4300"
    },
    {
      "id": "hdca-30",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO R-4301",
      "tagNo": "TIC-4301"
    },
    {
      "id": "hdca-31",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO R-4302",
      "tagNo": "TIC-4302"
    },
    {
      "id": "hdca-32",
      "plantArea": "HDCA",
      "equipmentService": "E-3104 TO C-3101",
      "tagNo": "FI-3107"
    },
    {
      "id": "hdca-33",
      "plantArea": "HDCA",
      "equipmentService": "P-3109 A/B TO E-3110",
      "tagNo": "FI-3109"
    },
    {
      "id": "hdca-34",
      "plantArea": "HDCA",
      "equipmentService": "E-3204 TO C-3201",
      "tagNo": "FI-3207"
    },
    {
      "id": "hdca-35",
      "plantArea": "HDCA",
      "equipmentService": "P-3209 A/B TO E-3210",
      "tagNo": "FI-3209"
    },
    {
      "id": "hdca-36",
      "plantArea": "HDCA",
      "equipmentService": "DEMIN WTR TO C-3307",
      "tagNo": "FI-3307"
    },
    {
      "id": "hdca-37",
      "plantArea": "HDCA",
      "equipmentService": "NH3 TK TO C-3301",
      "tagNo": "FI-3406"
    },
    {
      "id": "hdca-38",
      "plantArea": "HDCA",
      "equipmentService": "E-3303B TO C-3301",
      "tagNo": "FIC-3306"
    },
    {
      "id": "hdca-39",
      "plantArea": "HDCA",
      "equipmentService": "C-3307 TO C-3304",
      "tagNo": "FIC-3307"
    },
    {
      "id": "hdca-40",
      "plantArea": "HDCA",
      "equipmentService": "P-3120 A/B TO AT-3420",
      "tagNo": "FIC-3421"
    },
    {
      "id": "hdca-41",
      "plantArea": "HDCA",
      "equipmentService": "DEMIN WTR TO AT-3420",
      "tagNo": "FIC-3422"
    },
    {
      "id": "hdca-42",
      "plantArea": "HDCA",
      "equipmentService": "DEMIN WTR TO C-3101",
      "tagNo": "FICQ-3101"
    },
    {
      "id": "hdca-43",
      "plantArea": "HDCA",
      "equipmentService": "NaOH TO C-3101",
      "tagNo": "FICQ-3102"
    },
    {
      "id": "hdca-44",
      "plantArea": "HDCA",
      "equipmentService": "P-3120 A/B TO HH PLANT",
      "tagNo": "FICQ-3120"
    },
    {
      "id": "hdca-45",
      "plantArea": "HDCA",
      "equipmentService": "DEMIN WTR TO C-3201",
      "tagNo": "FICQ-3201"
    },
    {
      "id": "hdca-46",
      "plantArea": "HDCA",
      "equipmentService": "NaOH TO C-3201",
      "tagNo": "FICQ-3202"
    },
    {
      "id": "hdca-47",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO E-3108",
      "tagNo": "FIQ-3108"
    },
    {
      "id": "hdca-48",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO E-3208",
      "tagNo": "FIQ-3208"
    },
    {
      "id": "hdca-49",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-3119",
      "tagNo": "LI-3119"
    },
    {
      "id": "hdca-50",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL AT-3420",
      "tagNo": "LI-3420"
    },
    {
      "id": "hdca-51",
      "plantArea": "HDCA",
      "equipmentService": "P-3103 A/B/C TO E-3110",
      "tagNo": "LIC-3101"
    },
    {
      "id": "hdca-52",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL COTROL C-3107",
      "tagNo": "LIC-3107"
    },
    {
      "id": "hdca-53",
      "plantArea": "HDCA",
      "equipmentService": "P-3203 A/B/C TO E-3210",
      "tagNo": "LIC-3201"
    },
    {
      "id": "hdca-54",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL COTROL C-3207",
      "tagNo": "LIC-3207"
    },
    {
      "id": "hdca-55",
      "plantArea": "HDCA",
      "equipmentService": "E-3303A/B TO ST-3119",
      "tagNo": "LIC-3301"
    },
    {
      "id": "hdca-56",
      "plantArea": "HDCA",
      "equipmentService": "SW TO P-3305 A/B/C",
      "tagNo": "LIC-3304"
    },
    {
      "id": "hdca-57",
      "plantArea": "HDCA",
      "equipmentService": "PH INDICATION C-3101",
      "tagNo": "PH-3101"
    },
    {
      "id": "hdca-58",
      "plantArea": "HDCA",
      "equipmentService": "PH INDICATION AT-3420",
      "tagNo": "PH-3420"
    },
    {
      "id": "hdca-59",
      "plantArea": "HDCA",
      "equipmentService": "PRESSURE C-3101",
      "tagNo": "PI-3101"
    },
    {
      "id": "hdca-60",
      "plantArea": "HDCA",
      "equipmentService": "TEMPERATURE C-3101",
      "tagNo": "TI-3101"
    },
    {
      "id": "hdca-61",
      "plantArea": "HDCA",
      "equipmentService": "TEMPERATURE C-3107",
      "tagNo": "TI-3107A"
    },
    {
      "id": "hdca-62",
      "plantArea": "HDCA",
      "equipmentService": "TEMPERATURE C-3201",
      "tagNo": "TI-3201"
    },
    {
      "id": "hdca-63",
      "plantArea": "HDCA",
      "equipmentService": "TEMPERATURE C-3207",
      "tagNo": "TI-3207A"
    },
    {
      "id": "hdca-64",
      "plantArea": "HDCA",
      "equipmentService": "TEMPERATURE C-3301",
      "tagNo": "TI-3301"
    },
    {
      "id": "hdca-65",
      "plantArea": "HDCA",
      "equipmentService": "TI-3303",
      "tagNo": "-"
    },
    {
      "id": "hdca-66",
      "plantArea": "HDCA",
      "equipmentService": "TEMPERATURE C-3304",
      "tagNo": "TI-3304"
    },
    {
      "id": "hdca-67",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO C-3107",
      "tagNo": "TIC-3107"
    },
    {
      "id": "hdca-68",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO C-3207",
      "tagNo": "TIC-3207"
    },
    {
      "id": "hdca-69",
      "plantArea": "HDCA",
      "equipmentService": "HDCA SLURRY TO S-4106",
      "tagNo": "FI-4106A"
    },
    {
      "id": "hdca-70",
      "plantArea": "HDCA",
      "equipmentService": "HDCA SLURRY TO S-4206",
      "tagNo": "FI-4206A"
    },
    {
      "id": "hdca-71",
      "plantArea": "HDCA",
      "equipmentService": "HDCA SLURRY TO S-4306",
      "tagNo": "FI-4306A"
    },
    {
      "id": "hdca-72",
      "plantArea": "HDCA",
      "equipmentService": "SOFT WATER TO S-4106",
      "tagNo": "FIC-4106B"
    },
    {
      "id": "hdca-73",
      "plantArea": "HDCA",
      "equipmentService": "SOFT WATER TO S-4206",
      "tagNo": "FIC-4206B"
    },
    {
      "id": "hdca-74",
      "plantArea": "HDCA",
      "equipmentService": "SOFT WATER TO S-4306",
      "tagNo": "FIC-4306B"
    },
    {
      "id": "hdca-75",
      "plantArea": "HDCA",
      "equipmentService": "FIC-4408",
      "tagNo": "-"
    },
    {
      "id": "hdca-76",
      "plantArea": "HDCA",
      "equipmentService": "P-1042 TO S-4106",
      "tagNo": "FICQ-1042"
    },
    {
      "id": "hdca-77",
      "plantArea": "HDCA",
      "equipmentService": "P-2042 TO S-4206",
      "tagNo": "FICQ-2042"
    },
    {
      "id": "hdca-78",
      "plantArea": "HDCA",
      "equipmentService": "P-1012 A/B TO ST-1021",
      "tagNo": "FIQ-1012"
    },
    {
      "id": "hdca-79",
      "plantArea": "HDCA",
      "equipmentService": "P-2012 TO ST-2021",
      "tagNo": "FIQ-2012"
    },
    {
      "id": "hdca-80",
      "plantArea": "HDCA",
      "equipmentService": "P-2016 TO ST-2031",
      "tagNo": "FIQ-2016"
    },
    {
      "id": "hdca-81",
      "plantArea": "HDCA",
      "equipmentService": "P-2042 TO S-4306",
      "tagNo": "FIQ-2043"
    },
    {
      "id": "hdca-82",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL D-4404A",
      "tagNo": "LI-4404A"
    },
    {
      "id": "hdca-83",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL D-4404B",
      "tagNo": "LI-4404B"
    },
    {
      "id": "hdca-84",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL TK-4407",
      "tagNo": "LI-4407"
    },
    {
      "id": "hdca-85",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL T-4430 (HOT WATER)",
      "tagNo": "LI-4430"
    },
    {
      "id": "hdca-86",
      "plantArea": "HDCA",
      "equipmentService": "DECANTER #4",
      "tagNo": "LI-5201"
    },
    {
      "id": "hdca-87",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-1021",
      "tagNo": "LIA-1021"
    },
    {
      "id": "hdca-88",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-2021",
      "tagNo": "LIA-2021"
    },
    {
      "id": "hdca-89",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-2031",
      "tagNo": "LIA-2031"
    },
    {
      "id": "hdca-90",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL CONTROL ST-2011",
      "tagNo": "LIC-2011"
    },
    {
      "id": "hdca-91",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL CONTROL ST-2015",
      "tagNo": "LIC-2015"
    },
    {
      "id": "hdca-92",
      "plantArea": "HDCA",
      "equipmentService": "TK-4402 TO TK-4406",
      "tagNo": "LIC-4402"
    },
    {
      "id": "hdca-93",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL CONTROL ST-1011",
      "tagNo": "LICA-1011"
    },
    {
      "id": "hdca-94",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO T-4430",
      "tagNo": "TIC-4430"
    },
    {
      "id": "hdca-95",
      "plantArea": "HDCA",
      "equipmentService": "WEIGHING ST-1011",
      "tagNo": "WE-1011"
    },
    {
      "id": "hdca-96",
      "plantArea": "HDCA",
      "equipmentService": "FICQ-4004A",
      "tagNo": "-"
    },
    {
      "id": "hdca-97",
      "plantArea": "HDCA",
      "equipmentService": "FICQ-4004B",
      "tagNo": "-"
    },
    {
      "id": "hdca-98",
      "plantArea": "HDCA",
      "equipmentService": "FICQ-4004C",
      "tagNo": "-"
    },
    {
      "id": "hdca-99",
      "plantArea": "HDCA",
      "equipmentService": "FICQ-4100",
      "tagNo": "-"
    },
    {
      "id": "hdca-100",
      "plantArea": "HDCA",
      "equipmentService": "FICQ-4200",
      "tagNo": "-"
    },
    {
      "id": "hdca-101",
      "plantArea": "HDCA",
      "equipmentService": "FICQ-4300",
      "tagNo": "-"
    },
    {
      "id": "hdca-102",
      "plantArea": "HDCA",
      "equipmentService": "NaOH (ASC) TO ST-4007",
      "tagNo": "FIQ-4008"
    },
    {
      "id": "hdca-103",
      "plantArea": "HDCA",
      "equipmentService": "FIQ-4009",
      "tagNo": "-"
    },
    {
      "id": "hdca-104",
      "plantArea": "HDCA",
      "equipmentService": "FIQS-4002A",
      "tagNo": "-"
    },
    {
      "id": "hdca-105",
      "plantArea": "HDCA",
      "equipmentService": "FIQS-4002B",
      "tagNo": "-"
    },
    {
      "id": "hdca-106",
      "plantArea": "HDCA",
      "equipmentService": "FIQS-4002C",
      "tagNo": "-"
    },
    {
      "id": "hdca-107",
      "plantArea": "HDCA",
      "equipmentService": "D-4011A TO ST-4003",
      "tagNo": "FIQS-4004D"
    },
    {
      "id": "hdca-108",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-4001 (HH 60%)",
      "tagNo": "LI-4001"
    },
    {
      "id": "hdca-109",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-4003 (UREA 20%)",
      "tagNo": "LI-4003"
    },
    {
      "id": "hdca-110",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-4005 (DISSOLVER)",
      "tagNo": "LI-4005"
    },
    {
      "id": "hdca-111",
      "plantArea": "HDCA",
      "equipmentService": "LEVEL ST-4007 (NaOH 30%)",
      "tagNo": "LI-4007"
    },
    {
      "id": "hdca-112",
      "plantArea": "HDCA",
      "equipmentService": "LI-4011A",
      "tagNo": "-"
    },
    {
      "id": "hdca-113",
      "plantArea": "HDCA",
      "equipmentService": "LI-4011B",
      "tagNo": "-"
    },
    {
      "id": "hdca-114",
      "plantArea": "HDCA",
      "equipmentService": "LI-4011C",
      "tagNo": "-"
    },
    {
      "id": "hdca-115",
      "plantArea": "HDCA",
      "equipmentService": "STEAM TO ST-4005",
      "tagNo": "TIC-4005"
    }
  ],
  "E-PROCESS": [
    {
      "id": "e-process-1",
      "plantArea": "E-PROCESS",
      "equipmentService": "FICQ-1042",
      "tagNo": "-"
    },
    {
      "id": "e-process-2",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO AT-1401",
      "tagNo": "FICQ-1401"
    },
    {
      "id": "e-process-3",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO AT-1501",
      "tagNo": "FICQ-1501"
    },
    {
      "id": "e-process-4",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO AT-1501",
      "tagNo": "FICQ-1601"
    },
    {
      "id": "e-process-5",
      "plantArea": "E-PROCESS",
      "equipmentService": "FICQ-1701",
      "tagNo": "-"
    },
    {
      "id": "e-process-6",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL AT-1401",
      "tagNo": "LIA-1401"
    },
    {
      "id": "e-process-7",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL AT-1501",
      "tagNo": "LIA-1501"
    },
    {
      "id": "e-process-8",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL AT-1601",
      "tagNo": "LIA-1601"
    },
    {
      "id": "e-process-9",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL ST-1041",
      "tagNo": "LIA-1701"
    },
    {
      "id": "e-process-10",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION AT-1401",
      "tagNo": "ORP-1401"
    },
    {
      "id": "e-process-11",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION AT-1501",
      "tagNo": "ORP-1501"
    },
    {
      "id": "e-process-12",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION AT-1601",
      "tagNo": "ORP-1601"
    },
    {
      "id": "e-process-13",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO AT-1401",
      "tagNo": "TIC-1401"
    },
    {
      "id": "e-process-14",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO AT-1501",
      "tagNo": "TIC-1501"
    },
    {
      "id": "e-process-15",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO AT-1601",
      "tagNo": "TIC-1601"
    },
    {
      "id": "e-process-16",
      "plantArea": "E-PROCESS",
      "equipmentService": "FICQ-2042",
      "tagNo": "-"
    },
    {
      "id": "e-process-17",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO AT-2401",
      "tagNo": "FICQ-2401"
    },
    {
      "id": "e-process-18",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO AT-2501",
      "tagNo": "FICQ-2501"
    },
    {
      "id": "e-process-19",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO AT-2601",
      "tagNo": "FICQ-2601"
    },
    {
      "id": "e-process-20",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO AT-2611",
      "tagNo": "FICQ-2611"
    },
    {
      "id": "e-process-21",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO AT-2621",
      "tagNo": "FICQ-2621"
    },
    {
      "id": "e-process-4206",
      "plantArea": "E-PROCESS",
      "equipmentService": "&",
      "tagNo": "S-4306"
    },
    {
      "id": "e-process-22",
      "plantArea": "E-PROCESS",
      "equipmentService": "FIQ-1602",
      "tagNo": "-"
    },
    {
      "id": "e-process-23",
      "plantArea": "E-PROCESS",
      "equipmentService": "FIQ-2043",
      "tagNo": "-"
    },
    {
      "id": "e-process-24",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL ST-2031",
      "tagNo": "LIA-2031"
    },
    {
      "id": "e-process-25",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL AT-2401",
      "tagNo": "LIA-2401"
    },
    {
      "id": "e-process-26",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL AT-2501",
      "tagNo": "LIA-2501"
    },
    {
      "id": "e-process-27",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL AT-2601",
      "tagNo": "LIA-2601"
    },
    {
      "id": "e-process-28",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL AT-2611",
      "tagNo": "LIA-2611"
    },
    {
      "id": "e-process-29",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL AT-2621",
      "tagNo": "LIA-2621"
    },
    {
      "id": "e-process-30",
      "plantArea": "E-PROCESS",
      "equipmentService": "ST-2701 TO ST-2041",
      "tagNo": "LIC-2701"
    },
    {
      "id": "e-process-31",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION AT-2401",
      "tagNo": "ORP-2401"
    },
    {
      "id": "e-process-32",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION AT-2501",
      "tagNo": "ORP-2501"
    },
    {
      "id": "e-process-33",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION AT-2601",
      "tagNo": "ORP-2601"
    },
    {
      "id": "e-process-34",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION AT-2611",
      "tagNo": "ORP-2611"
    },
    {
      "id": "e-process-35",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION AT-2621",
      "tagNo": "ORP-2621"
    },
    {
      "id": "e-process-36",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO AT-2401",
      "tagNo": "TIC-2401"
    },
    {
      "id": "e-process-37",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO AT-2501",
      "tagNo": "TIC-2501"
    },
    {
      "id": "e-process-38",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO AT-2601",
      "tagNo": "TIC-2601"
    },
    {
      "id": "e-process-39",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO AT-2611",
      "tagNo": "TIC-2611"
    },
    {
      "id": "e-process-40",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO AT-2621",
      "tagNo": "TIC-2621"
    },
    {
      "id": "e-process-41",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-11021 TO RTF-1103",
      "tagNo": "FI-1103"
    },
    {
      "id": "e-process-42",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-11021 TO RTF-1203",
      "tagNo": "FI-1203"
    },
    {
      "id": "e-process-43",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-11021 TO RTF-1303",
      "tagNo": "FI-1303"
    },
    {
      "id": "e-process-44",
      "plantArea": "E-PROCESS",
      "equipmentService": "N2 TO RT-1101",
      "tagNo": "FIC-1101"
    },
    {
      "id": "e-process-45",
      "plantArea": "E-PROCESS",
      "equipmentService": "N2 TO RT-1201",
      "tagNo": "FIC-1201"
    },
    {
      "id": "e-process-46",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-1022 TO RT-1101",
      "tagNo": "FICQ-1022"
    },
    {
      "id": "e-process-47",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-1104 TO RT-1201",
      "tagNo": "FICQ-1104"
    },
    {
      "id": "e-process-48",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-1204 TO RT-1302",
      "tagNo": "FICQ-1204"
    },
    {
      "id": "e-process-49",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-1304 TO AGING TANK",
      "tagNo": "FICQ-1304"
    },
    {
      "id": "e-process-50",
      "plantArea": "E-PROCESS",
      "equipmentService": "ST-1011 TO ST-1021",
      "tagNo": "FIQ-1012"
    },
    {
      "id": "e-process-51",
      "plantArea": "E-PROCESS",
      "equipmentService": "N2 TO RT-1301",
      "tagNo": "FIQ-1301"
    },
    {
      "id": "e-process-52",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL ST-1021",
      "tagNo": "LIA-1021"
    },
    {
      "id": "e-process-53",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL ST-1033",
      "tagNo": "LIA-1033"
    },
    {
      "id": "e-process-54",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL RT-1101",
      "tagNo": "LIA-1101"
    },
    {
      "id": "e-process-55",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL RT-1201",
      "tagNo": "LIA-1201"
    },
    {
      "id": "e-process-56",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL RT-1301",
      "tagNo": "LIA-1301"
    },
    {
      "id": "e-process-57",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL CONTROL ST-1011",
      "tagNo": "LICA-1011"
    },
    {
      "id": "e-process-58",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION RT-1101",
      "tagNo": "OIA-1101"
    },
    {
      "id": "e-process-59",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION RT-1201",
      "tagNo": "OIA-1201"
    },
    {
      "id": "e-process-60",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION RT-1301",
      "tagNo": "OIA-1301"
    },
    {
      "id": "e-process-61",
      "plantArea": "E-PROCESS",
      "equipmentService": "REICTIFIER #1",
      "tagNo": "RTF-1103"
    },
    {
      "id": "e-process-62",
      "plantArea": "E-PROCESS",
      "equipmentService": "REICTIFIER #2",
      "tagNo": "RTF-1203"
    },
    {
      "id": "e-process-63",
      "plantArea": "E-PROCESS",
      "equipmentService": "REICTIFIER #3",
      "tagNo": "RTF-1303"
    },
    {
      "id": "e-process-64",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO RT-1101",
      "tagNo": "TIC-1101"
    },
    {
      "id": "e-process-65",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO RT-1201",
      "tagNo": "TIC-1201"
    },
    {
      "id": "e-process-66",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO RT-1301",
      "tagNo": "TIC-1301"
    },
    {
      "id": "e-process-67",
      "plantArea": "E-PROCESS",
      "equipmentService": "WEIGHING ST-1011",
      "tagNo": "WE-1011"
    },
    {
      "id": "e-process-68",
      "plantArea": "E-PROCESS",
      "equipmentService": "ST-2011 TO ST-2021",
      "tagNo": "FIQ-2012"
    },
    {
      "id": "e-process-69",
      "plantArea": "E-PROCESS",
      "equipmentService": "LIC-2011",
      "tagNo": "-"
    },
    {
      "id": "e-process-70",
      "plantArea": "E-PROCESS",
      "equipmentService": "DI-2011",
      "tagNo": "-"
    },
    {
      "id": "e-process-71",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL ST-2011",
      "tagNo": "LIA-2011"
    },
    {
      "id": "e-process-72",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-2022 TO RT-2101",
      "tagNo": "FICQ-2022"
    },
    {
      "id": "e-process-73",
      "plantArea": "E-PROCESS",
      "equipmentService": "FIQS-2022",
      "tagNo": "-"
    },
    {
      "id": "e-process-74",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL ST-2021",
      "tagNo": "LIA-2021"
    },
    {
      "id": "e-process-75",
      "plantArea": "E-PROCESS",
      "equipmentService": "N2 TO RT-2101",
      "tagNo": "FIC-2101"
    },
    {
      "id": "e-process-76",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO RT-2101",
      "tagNo": "TIC-2101"
    },
    {
      "id": "e-process-77",
      "plantArea": "E-PROCESS",
      "equipmentService": "TEMPERATURE RTF 2103",
      "tagNo": "TI-2103"
    },
    {
      "id": "e-process-78",
      "plantArea": "E-PROCESS",
      "equipmentService": "RECTIFIER #1",
      "tagNo": "RTF-2103"
    },
    {
      "id": "e-process-79",
      "plantArea": "E-PROCESS",
      "equipmentService": "FI-2103",
      "tagNo": "-"
    },
    {
      "id": "e-process-80",
      "plantArea": "E-PROCESS",
      "equipmentService": "PI-2102",
      "tagNo": "-"
    },
    {
      "id": "e-process-81",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL RT-2101",
      "tagNo": "LIA-2101"
    },
    {
      "id": "e-process-82",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-2104 TO RT-2201",
      "tagNo": "FICQ-2104"
    },
    {
      "id": "e-process-83",
      "plantArea": "E-PROCESS",
      "equipmentService": "N2 TO RT-2201",
      "tagNo": "FIC-2201"
    },
    {
      "id": "e-process-84",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO RT-2201",
      "tagNo": "TI-2203"
    },
    {
      "id": "e-process-85",
      "plantArea": "E-PROCESS",
      "equipmentService": "TEMPERATURE RTF 2203",
      "tagNo": "RTF-2203"
    },
    {
      "id": "e-process-86",
      "plantArea": "E-PROCESS",
      "equipmentService": "RECTIFIER #2",
      "tagNo": "FI-2203"
    },
    {
      "id": "e-process-87",
      "plantArea": "E-PROCESS",
      "equipmentService": "PI-2202",
      "tagNo": "-"
    },
    {
      "id": "e-process-88",
      "plantArea": "E-PROCESS",
      "equipmentService": "LIA-2201",
      "tagNo": "-"
    },
    {
      "id": "e-process-89",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL RT-2201",
      "tagNo": "TIC-2201"
    },
    {
      "id": "e-process-90",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-2204 TO RT-2301",
      "tagNo": "FICQ-2204"
    },
    {
      "id": "e-process-91",
      "plantArea": "E-PROCESS",
      "equipmentService": "N2 TO RT-2301",
      "tagNo": "FIC-2301"
    },
    {
      "id": "e-process-92",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO RT-2301",
      "tagNo": "TI-2303"
    },
    {
      "id": "e-process-93",
      "plantArea": "E-PROCESS",
      "equipmentService": "TEMPERATURE RTF-2303",
      "tagNo": "RTF-2303"
    },
    {
      "id": "e-process-94",
      "plantArea": "E-PROCESS",
      "equipmentService": "RECTIFIER #2",
      "tagNo": "FI-2303"
    },
    {
      "id": "e-process-95",
      "plantArea": "E-PROCESS",
      "equipmentService": "PI-2302",
      "tagNo": "-"
    },
    {
      "id": "e-process-96",
      "plantArea": "E-PROCESS",
      "equipmentService": "LIA-2301",
      "tagNo": "-"
    },
    {
      "id": "e-process-97",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL RT-2301",
      "tagNo": "TIC-2301"
    },
    {
      "id": "e-process-98",
      "plantArea": "E-PROCESS",
      "equipmentService": "P-2304 TO AGING TANK",
      "tagNo": "FICQ-2304"
    },
    {
      "id": "e-process-99",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO R-5301",
      "tagNo": "FICQ-5301"
    },
    {
      "id": "e-process-100",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO R-5302",
      "tagNo": "FICQ-5302"
    },
    {
      "id": "e-process-101",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO R-5303",
      "tagNo": "FICQ-5303"
    },
    {
      "id": "e-process-102",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO R-5304",
      "tagNo": "FICQ-5304"
    },
    {
      "id": "e-process-103",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO R-5305",
      "tagNo": "FICQ-5305"
    },
    {
      "id": "e-process-104",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO R-5306",
      "tagNo": "FICQ-5306"
    },
    {
      "id": "e-process-105",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO R-5307",
      "tagNo": "FICQ-5307"
    },
    {
      "id": "e-process-106",
      "plantArea": "E-PROCESS",
      "equipmentService": "CL2 TO R-5308",
      "tagNo": "FICQ-5308"
    },
    {
      "id": "e-process-107",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO R-5301",
      "tagNo": "TIC-5301"
    },
    {
      "id": "e-process-108",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO R-5302",
      "tagNo": "TIC-5302"
    },
    {
      "id": "e-process-109",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO R-5303",
      "tagNo": "TIC-5303"
    },
    {
      "id": "e-process-110",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO R-5304",
      "tagNo": "TIC-5304"
    },
    {
      "id": "e-process-111",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO R-5305",
      "tagNo": "TIC-5305"
    },
    {
      "id": "e-process-112",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO R-5306",
      "tagNo": "TIC-5306"
    },
    {
      "id": "e-process-113",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO R-5307",
      "tagNo": "TIC-5307"
    },
    {
      "id": "e-process-114",
      "plantArea": "E-PROCESS",
      "equipmentService": "CW TO R-5308",
      "tagNo": "TIC-5308"
    },
    {
      "id": "e-process-115",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION R-5301",
      "tagNo": "ORP-5301"
    },
    {
      "id": "e-process-116",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION R-5302",
      "tagNo": "ORP-5302"
    },
    {
      "id": "e-process-117",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION R-5303",
      "tagNo": "ORP-5303"
    },
    {
      "id": "e-process-118",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION R-5304",
      "tagNo": "ORP-5304"
    },
    {
      "id": "e-process-119",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION R-5305",
      "tagNo": "ORP-5305"
    },
    {
      "id": "e-process-120",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION R-5306",
      "tagNo": "ORP-5306"
    },
    {
      "id": "e-process-121",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION R-5307",
      "tagNo": "ORP-5307"
    },
    {
      "id": "e-process-122",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION R-5308",
      "tagNo": "ORP-5308"
    },
    {
      "id": "e-process-123",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL R-5301",
      "tagNo": "LIA-5301"
    },
    {
      "id": "e-process-124",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL R-5302",
      "tagNo": "LIA-5302"
    },
    {
      "id": "e-process-125",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL R-5303",
      "tagNo": "LIA-5303"
    },
    {
      "id": "e-process-126",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL R-5304",
      "tagNo": "LIA-5304"
    },
    {
      "id": "e-process-127",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL R-5305",
      "tagNo": "LIA-5305"
    },
    {
      "id": "e-process-128",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL R-5306",
      "tagNo": "LIA-5306"
    },
    {
      "id": "e-process-129",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL R-5307",
      "tagNo": "LIA-5307"
    },
    {
      "id": "e-process-130",
      "plantArea": "E-PROCESS",
      "equipmentService": "LEVEL R-5308",
      "tagNo": "LIA-5308"
    },
    {
      "id": "e-process-131",
      "plantArea": "E-PROCESS",
      "equipmentService": "INDICATION CL2 SCR. B",
      "tagNo": "ORP-2800"
    },
    {
      "id": "e-process-132",
      "plantArea": "E-PROCESS",
      "equipmentService": "QLD AIR PT",
      "tagNo": "PI-2801"
    }
  ],
  "PANNEVISE DRYING": [
    {
      "id": "pannevise-drying-1",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-2",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-3",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 3",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-4",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-5",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-6",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 3",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-7",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID VACUUM",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-8",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID VENTING",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-9",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-10",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PROXIMITY SWITCH - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-11",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PROXIMITY SWITCH - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-12",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PG-INLET",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-13",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "REGULATOR PRESSURE",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-14",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "INVERTER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-15",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "VG - 1 (TK-4)",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-16",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "VG - 2 (TK-12)",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-17",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AIR CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-18",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-WATER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-19",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-AMONIA",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-20",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-RO WATER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-21",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-22",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-23",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 3",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-24",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-25",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-26",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 3",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-27",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID VACUUM",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-28",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID VENTING",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-29",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-30",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PROXIMITY SWITCH - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-31",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PROXIMITY SWITCH - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-32",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PG-INLET",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-33",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "REGULATOR PRESSURE",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-34",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "INVERTER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-35",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "VG - 1 (TK-10)",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-36",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "VG - 2 (TK-8)",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-37",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AIR CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-38",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-WATER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-39",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-AMONIA",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-40",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-RO WATER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-41",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-42",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-43",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 3",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-44",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-45",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-46",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 3",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-47",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID VACUUM",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-48",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID VENTING",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-49",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-50",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PROXIMITY SWITCH - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-51",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PROXIMITY SWITCH - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-52",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PG-INLET",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-53",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "REGULATOR PRESSURE",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-54",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "INVERTER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-55",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "VG - 1 (TK-6)",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-56",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "VG - 2 (TK-3)",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-57",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AIR CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-58",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-WATER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-59",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-AMONIA",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-60",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-RO WATER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-61",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-62",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-63",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VACUUM - 3",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-64",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-65",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-66",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING - 3",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-67",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID VACUUM",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-68",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID VENTING",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-69",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "SOLENOID CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-70",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PROXIMITY SWITCH - 1",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-71",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PROXIMITY SWITCH - 2",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-72",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PG-INLET",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-73",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "REGULATOR PRESSURE",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-74",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "INVERTER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-75",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "VG - 1 (TK-11)",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-76",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "VG - 2 (TK-7)",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-77",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AIR CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-78",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-WATER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-79",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-AMONIA",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-80",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "ROTA FLOW-RO WATER",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-81",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "C/V INLET DRY -",
      "tagNo": "5"
    },
    {
      "id": "pannevise-drying-83",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "DUST COLLECTOR SILO -",
      "tagNo": "5"
    },
    {
      "id": "pannevise-drying-84",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PG - DUST COLLECTOR -",
      "tagNo": "5"
    },
    {
      "id": "pannevise-drying-85",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "TE - DRY -",
      "tagNo": "5"
    },
    {
      "id": "pannevise-drying-87",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "C/V INLET DRY -",
      "tagNo": "6"
    },
    {
      "id": "pannevise-drying-89",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "DUST COLLECTOR SILO -",
      "tagNo": "6"
    },
    {
      "id": "pannevise-drying-90",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PG - DUST COLLECTOR -",
      "tagNo": "6"
    },
    {
      "id": "pannevise-drying-91",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "TE - DRY -",
      "tagNo": "6"
    },
    {
      "id": "pannevise-drying-92",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "C/V INLET DRY -",
      "tagNo": "7"
    },
    {
      "id": "pannevise-drying-94",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "DUST COLLECTOR SILO -",
      "tagNo": "7"
    },
    {
      "id": "pannevise-drying-95",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PG - DUST COLLECTOR -",
      "tagNo": "7"
    },
    {
      "id": "pannevise-drying-96",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "TE - DRY -",
      "tagNo": "7"
    },
    {
      "id": "pannevise-drying-97",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "C/V INLET DRY -",
      "tagNo": "8"
    },
    {
      "id": "pannevise-drying-99",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "DUST COLLECTOR SILO -",
      "tagNo": "8"
    },
    {
      "id": "pannevise-drying-100",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PG - DUST COLLECTOR -",
      "tagNo": "8"
    },
    {
      "id": "pannevise-drying-101",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "TE - DRY -",
      "tagNo": "8"
    },
    {
      "id": "pannevise-drying-102",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING",
      "tagNo": "4\""
    },
    {
      "id": "pannevise-drying-103",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING",
      "tagNo": "8\""
    },
    {
      "id": "pannevise-drying-104",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV DUMPER",
      "tagNo": "16\""
    },
    {
      "id": "pannevise-drying-105",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "RTD PT100 INLET",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-106",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "RTD PT100 OUTLET",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-107",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "TEMP AOV",
      "tagNo": "2\""
    },
    {
      "id": "pannevise-drying-108",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PULSATOR DUST COLLECTOR",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-112",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING",
      "tagNo": "8\""
    },
    {
      "id": "pannevise-drying-114",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "RTD PT100 INLET",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-115",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "RTD PT100 OUTLET",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-116",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "TEMP CONTROL VALVE",
      "tagNo": "2\""
    },
    {
      "id": "pannevise-drying-117",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "PULSATOR DUST COLLECTOR",
      "tagNo": "-"
    },
    {
      "id": "pannevise-drying-118",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING",
      "tagNo": "4\""
    },
    {
      "id": "pannevise-drying-119",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "AOV VENTING",
      "tagNo": "8\""
    },
    {
      "id": "pannevise-drying-121",
      "plantArea": "PANNEVISE DRYING",
      "equipmentService": "RTD PT100 INLET",
      "tagNo": "-"
    }
  ],
  "PE - MIXING": [
    {
      "id": "pe---mixing-1",
      "plantArea": "PE - MIXING",
      "equipmentService": "TE-1",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-2",
      "plantArea": "PE - MIXING",
      "equipmentService": "TE-2",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-3",
      "plantArea": "PE - MIXING",
      "equipmentService": "TE-3",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-4",
      "plantArea": "PE - MIXING",
      "equipmentService": "PRESSURE GAUGE",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-5",
      "plantArea": "PE - MIXING",
      "equipmentService": "AIR CYLINDER",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-6",
      "plantArea": "PE - MIXING",
      "equipmentService": "AOV TRANSPORTER",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-7",
      "plantArea": "PE - MIXING",
      "equipmentService": "AOV DUMPER 1",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-8",
      "plantArea": "PE - MIXING",
      "equipmentService": "AOV DUMPER 2",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-9",
      "plantArea": "PE - MIXING",
      "equipmentService": "AOV TRANSFER",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-10",
      "plantArea": "PE - MIXING",
      "equipmentService": "PG- LINE WATER 1",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-11",
      "plantArea": "PE - MIXING",
      "equipmentService": "PG- LINE WATER 2",
      "tagNo": "-"
    },
    {
      "id": "pe---mixing-12",
      "plantArea": "PE - MIXING",
      "equipmentService": "AIR REGULATOR 6016",
      "tagNo": "-"
    }
  ],
  "ZET O MILL": [
    {
      "id": "zet-o-mill-1",
      "plantArea": "ZET O MILL",
      "equipmentService": "PT- ZET MILL",
      "tagNo": "2"
    },
    {
      "id": "zet-o-mill-2",
      "plantArea": "ZET O MILL",
      "equipmentService": "PCV- ZET MILL",
      "tagNo": "2"
    },
    {
      "id": "zet-o-mill-3",
      "plantArea": "ZET O MILL",
      "equipmentService": "TE-ZET MILL",
      "tagNo": "2"
    },
    {
      "id": "zet-o-mill-4",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-1"
    },
    {
      "id": "zet-o-mill-5",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-2"
    },
    {
      "id": "zet-o-mill-6",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-3"
    },
    {
      "id": "zet-o-mill-7",
      "plantArea": "ZET O MILL",
      "equipmentService": "PT- ZET MILL",
      "tagNo": "7"
    },
    {
      "id": "zet-o-mill-8",
      "plantArea": "ZET O MILL",
      "equipmentService": "PCV- ZET MILL",
      "tagNo": "7"
    },
    {
      "id": "zet-o-mill-9",
      "plantArea": "ZET O MILL",
      "equipmentService": "TE-ZET MILL",
      "tagNo": "7"
    },
    {
      "id": "zet-o-mill-10",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-1"
    },
    {
      "id": "zet-o-mill-11",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-2"
    },
    {
      "id": "zet-o-mill-12",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-3"
    },
    {
      "id": "zet-o-mill-13",
      "plantArea": "ZET O MILL",
      "equipmentService": "PT- ZET MILL",
      "tagNo": "8"
    },
    {
      "id": "zet-o-mill-14",
      "plantArea": "ZET O MILL",
      "equipmentService": "PCV- ZET MILL",
      "tagNo": "8"
    },
    {
      "id": "zet-o-mill-15",
      "plantArea": "ZET O MILL",
      "equipmentService": "TE-ZET MILL",
      "tagNo": "8"
    },
    {
      "id": "zet-o-mill-16",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-1"
    },
    {
      "id": "zet-o-mill-17",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-2"
    },
    {
      "id": "zet-o-mill-18",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-3"
    },
    {
      "id": "zet-o-mill-19",
      "plantArea": "ZET O MILL",
      "equipmentService": "PT- ZET MILL",
      "tagNo": "9"
    },
    {
      "id": "zet-o-mill-20",
      "plantArea": "ZET O MILL",
      "equipmentService": "PCV- ZET MILL",
      "tagNo": "9"
    },
    {
      "id": "zet-o-mill-21",
      "plantArea": "ZET O MILL",
      "equipmentService": "TE-ZET MILL",
      "tagNo": "9"
    },
    {
      "id": "zet-o-mill-22",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-1"
    },
    {
      "id": "zet-o-mill-23",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-2"
    },
    {
      "id": "zet-o-mill-24",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-3"
    },
    {
      "id": "zet-o-mill-25",
      "plantArea": "ZET O MILL",
      "equipmentService": "PT- ZET MILL",
      "tagNo": "10"
    },
    {
      "id": "zet-o-mill-26",
      "plantArea": "ZET O MILL",
      "equipmentService": "PCV- ZET MILL",
      "tagNo": "10"
    },
    {
      "id": "zet-o-mill-27",
      "plantArea": "ZET O MILL",
      "equipmentService": "TE-ZET MILL",
      "tagNo": "10"
    },
    {
      "id": "zet-o-mill-28",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-1"
    },
    {
      "id": "zet-o-mill-29",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-2"
    },
    {
      "id": "zet-o-mill-30",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-3"
    },
    {
      "id": "zet-o-mill-31",
      "plantArea": "ZET O MILL",
      "equipmentService": "PT- ZET MILL",
      "tagNo": "11"
    },
    {
      "id": "zet-o-mill-32",
      "plantArea": "ZET O MILL",
      "equipmentService": "PCV- ZET MILL",
      "tagNo": "11"
    },
    {
      "id": "zet-o-mill-33",
      "plantArea": "ZET O MILL",
      "equipmentService": "TE-ZET MILL",
      "tagNo": "11"
    },
    {
      "id": "zet-o-mill-34",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-1"
    },
    {
      "id": "zet-o-mill-35",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-2"
    },
    {
      "id": "zet-o-mill-36",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-3"
    },
    {
      "id": "zet-o-mill-37",
      "plantArea": "ZET O MILL",
      "equipmentService": "PT- ZET MILL",
      "tagNo": "12"
    },
    {
      "id": "zet-o-mill-38",
      "plantArea": "ZET O MILL",
      "equipmentService": "PCV- ZET MILL",
      "tagNo": "12"
    },
    {
      "id": "zet-o-mill-39",
      "plantArea": "ZET O MILL",
      "equipmentService": "TE-ZET MILL",
      "tagNo": "12"
    },
    {
      "id": "zet-o-mill-40",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-1"
    },
    {
      "id": "zet-o-mill-41",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-2"
    },
    {
      "id": "zet-o-mill-42",
      "plantArea": "ZET O MILL",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-3"
    }
  ],
  "ADCA MILLING": [
    {
      "id": "adca-milling-1",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PT- QLD",
      "tagNo": "1"
    },
    {
      "id": "adca-milling-2",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PCV- QLD",
      "tagNo": "1"
    },
    {
      "id": "adca-milling-3",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PG-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-4",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PG-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-5",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-6",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-7",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-3",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-8",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-4",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-9",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-10",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-11",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-3",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-12",
      "plantArea": "ADCA MILLING",
      "equipmentService": "DUST COLLECTOR",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-13",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PT- QLD",
      "tagNo": "2"
    },
    {
      "id": "adca-milling-14",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PCV- QLD",
      "tagNo": "2"
    },
    {
      "id": "adca-milling-15",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PG-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-16",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PG-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-17",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-18",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-19",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-3",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-20",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-4",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-21",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-22",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-23",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-3",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-24",
      "plantArea": "ADCA MILLING",
      "equipmentService": "DUST COLLECTOR",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-25",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PT-19",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-26",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PTA-09",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-27",
      "plantArea": "ADCA MILLING",
      "equipmentService": "WIC",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-28",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TSA-07",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-29",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TSA-08",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-30",
      "plantArea": "ADCA MILLING",
      "equipmentService": "FSA-23",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-31",
      "plantArea": "ADCA MILLING",
      "equipmentService": "FSA-24",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-32",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PCV-18",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-33",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-01",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-34",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-03",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-35",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-14",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-36",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-17",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-37",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-21",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-38",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-25",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-39",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-26",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-40",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-27",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-41",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-28",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-42",
      "plantArea": "ADCA MILLING",
      "equipmentService": "GS-04",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-43",
      "plantArea": "ADCA MILLING",
      "equipmentService": "GS-15",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-44",
      "plantArea": "ADCA MILLING",
      "equipmentService": "GS-16",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-45",
      "plantArea": "ADCA MILLING",
      "equipmentService": "GS-26",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-46",
      "plantArea": "ADCA MILLING",
      "equipmentService": "HZ-10",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-47",
      "plantArea": "ADCA MILLING",
      "equipmentService": "GS-02",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-48",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PSA-20",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-49",
      "plantArea": "ADCA MILLING",
      "equipmentService": "SCV",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-50",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TA-05",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-51",
      "plantArea": "ADCA MILLING",
      "equipmentService": "DUST COLLECTOR",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-52",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PG-DUST COLLECTOR",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-53",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PT- QLD",
      "tagNo": "4"
    },
    {
      "id": "adca-milling-54",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PCV- QLD",
      "tagNo": "4"
    },
    {
      "id": "adca-milling-55",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PG-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-56",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PG-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-57",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-58",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-59",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-3",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-60",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-4",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-61",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-1",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-62",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-2",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-63",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-3",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-64",
      "plantArea": "ADCA MILLING",
      "equipmentService": "DUST COLLECTOR",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-65",
      "plantArea": "ADCA MILLING",
      "equipmentService": "PG-DUST COLLECTOR",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-66",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TELSONIC",
      "tagNo": "SG47"
    },
    {
      "id": "adca-milling-67",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-GLAND PACKING A",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-68",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-GLAND PACKING B",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-69",
      "plantArea": "ADCA MILLING",
      "equipmentService": "TE-BODY",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-70",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-6018",
      "tagNo": "-"
    },
    {
      "id": "adca-milling-71",
      "plantArea": "ADCA MILLING",
      "equipmentService": "XV-",
      "tagNo": "-"
    }
  ],
  "OBSH TSH": [
    {
      "id": "obsh-tsh-1",
      "plantArea": "OBSH TSH",
      "equipmentService": "TE-OBSH",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-2",
      "plantArea": "OBSH TSH",
      "equipmentService": "TCV-OBSH",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-3",
      "plantArea": "OBSH TSH",
      "equipmentService": "TELSONIC-SG47",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-4",
      "plantArea": "OBSH TSH",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-1"
    },
    {
      "id": "obsh-tsh-5",
      "plantArea": "OBSH TSH",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-2"
    },
    {
      "id": "obsh-tsh-6",
      "plantArea": "OBSH TSH",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-3"
    },
    {
      "id": "obsh-tsh-7",
      "plantArea": "OBSH TSH",
      "equipmentService": "PT-OBSH",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-8",
      "plantArea": "OBSH TSH",
      "equipmentService": "PCV-OBSH",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-9",
      "plantArea": "OBSH TSH",
      "equipmentService": "PRESSURE GAUGE",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-10",
      "plantArea": "OBSH TSH",
      "equipmentService": "TE-BODY",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-11",
      "plantArea": "OBSH TSH",
      "equipmentService": "TE-INLET",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-12",
      "plantArea": "OBSH TSH",
      "equipmentService": "TE-OUTLET",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-13",
      "plantArea": "OBSH TSH",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-A"
    },
    {
      "id": "obsh-tsh-14",
      "plantArea": "OBSH TSH",
      "equipmentService": "PRESSURE",
      "tagNo": "GAUGE-B"
    },
    {
      "id": "obsh-tsh-15",
      "plantArea": "OBSH TSH",
      "equipmentService": "TE-OH A",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-16",
      "plantArea": "OBSH TSH",
      "equipmentService": "TE-OH B",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-17",
      "plantArea": "OBSH TSH",
      "equipmentService": "TE-TSH A",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-18",
      "plantArea": "OBSH TSH",
      "equipmentService": "TE-TSH B",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-19",
      "plantArea": "OBSH TSH",
      "equipmentService": "WEIGHING-H/H",
      "tagNo": "-"
    },
    {
      "id": "obsh-tsh-20",
      "plantArea": "OBSH TSH",
      "equipmentService": "WEIGHING-NH3",
      "tagNo": "-"
    }
  ],
  "COMPRESSOR": [],
  "AIR DRYER": [],
  "REFRIGRATOR": [
    {
      "id": "refrigrator-1",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-1",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-2",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "LT",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-3",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-HEADER",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-4",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-1",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-5",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-2",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-6",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-1",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-7",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "LT",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-8",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-HEADER",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-9",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-1",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-10",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-2",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-11",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-INLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-12",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-OUTLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-13",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-OUTLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-14",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PRESSURE SWITCH",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-15",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "HIGH-3A"
    },
    {
      "id": "refrigrator-16",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "HIGH-3B"
    },
    {
      "id": "refrigrator-17",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "LOW-3A"
    },
    {
      "id": "refrigrator-18",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "LOW-3B"
    },
    {
      "id": "refrigrator-19",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE- BRINE IN",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-20",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE- BRINE OUT",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-21",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG- BRINE IN",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-22",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG- BRINE OUT",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-23",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-INLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-24",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-OUTLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-25",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-INLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-26",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-OUTLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-27",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PRESSURE SWITCH",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-28",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "HIGH-4A"
    },
    {
      "id": "refrigrator-29",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "HIGH-4B"
    },
    {
      "id": "refrigrator-30",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "LOW-4A"
    },
    {
      "id": "refrigrator-31",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "LOW-4B"
    },
    {
      "id": "refrigrator-32",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-IN BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-33",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-OUT BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-34",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-IN BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-35",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-OUT BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-36",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-INLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-37",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-OUTLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-38",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-INLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-39",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-OUTLET",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-40",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PRESSURE SWITCH",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-41",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "HIGH-5A"
    },
    {
      "id": "refrigrator-42",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "HIGH-5B"
    },
    {
      "id": "refrigrator-43",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "LOW-5A"
    },
    {
      "id": "refrigrator-44",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG",
      "tagNo": "LOW-5B"
    },
    {
      "id": "refrigrator-45",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-IN BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-46",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-OUT BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-47",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-IN BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-48",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-OUT BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-49",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "LT-510",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-50",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-510",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-51",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "LT-540",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-52",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-540",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-53",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "C/V BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-54",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG BRINE",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-55",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-1",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-56",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-1",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-57",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-TANGKI",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-58",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "THERMOMETER RETURN",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-59",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-CHILLER",
      "tagNo": "4"
    },
    {
      "id": "refrigrator-60",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "TE-CHILLER",
      "tagNo": "5"
    },
    {
      "id": "refrigrator-61",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-CHILLER",
      "tagNo": "4"
    },
    {
      "id": "refrigrator-62",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-CHILLER",
      "tagNo": "5"
    },
    {
      "id": "refrigrator-63",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-EVACON A",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-64",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-EVACON B",
      "tagNo": "-"
    },
    {
      "id": "refrigrator-65",
      "plantArea": "REFRIGRATOR",
      "equipmentService": "PG-EVACON",
      "tagNo": "1"
    }
  ],
  "BOILER": [],
  "WWT": [
    {
      "id": "wwt-1",
      "plantArea": "WWT",
      "equipmentService": "PG-FILTER PRESS",
      "tagNo": "1"
    },
    {
      "id": "wwt-2",
      "plantArea": "WWT",
      "equipmentService": "PG-FILTER PRESS",
      "tagNo": "2"
    },
    {
      "id": "wwt-3",
      "plantArea": "WWT",
      "equipmentService": "PT-FILTER PRESS",
      "tagNo": "-"
    },
    {
      "id": "wwt-4",
      "plantArea": "WWT",
      "equipmentService": "XV-FILTER PRESS",
      "tagNo": "-"
    },
    {
      "id": "wwt-5",
      "plantArea": "WWT",
      "equipmentService": "PH (FLOKULASI BARU)",
      "tagNo": "-"
    },
    {
      "id": "wwt-6",
      "plantArea": "WWT",
      "equipmentService": "PH OUTLET",
      "tagNo": "-"
    },
    {
      "id": "wwt-7",
      "plantArea": "WWT",
      "equipmentService": "FLOW METER OUTLET",
      "tagNo": "-"
    },
    {
      "id": "wwt-8",
      "plantArea": "WWT",
      "equipmentService": "PH (EQUAL)",
      "tagNo": "-"
    },
    {
      "id": "wwt-9",
      "plantArea": "WWT",
      "equipmentService": "FT-WWT NaOH",
      "tagNo": "-"
    },
    {
      "id": "wwt-10",
      "plantArea": "WWT",
      "equipmentService": "C/V-WWT NaOCl",
      "tagNo": "-"
    },
    {
      "id": "wwt-11",
      "plantArea": "WWT",
      "equipmentService": "FT-WWT NaOCl",
      "tagNo": "-"
    }
  ],
  "DEMIN WATER": [
    {
      "id": "demin-water-1",
      "plantArea": "DEMIN WATER",
      "equipmentService": "FT-DM",
      "tagNo": "50M³"
    },
    {
      "id": "demin-water-2",
      "plantArea": "DEMIN WATER",
      "equipmentService": "pH-DM",
      "tagNo": "50M³"
    },
    {
      "id": "demin-water-3",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-DMF-100F45D3 IN",
      "tagNo": "-"
    },
    {
      "id": "demin-water-4",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-DMF-100F45D3 OUT",
      "tagNo": "-"
    },
    {
      "id": "demin-water-5",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AN",
      "tagNo": "01"
    },
    {
      "id": "demin-water-6",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AN",
      "tagNo": "02"
    },
    {
      "id": "demin-water-7",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AN",
      "tagNo": "03"
    },
    {
      "id": "demin-water-8",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AN",
      "tagNo": "04"
    },
    {
      "id": "demin-water-9",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AN",
      "tagNo": "05"
    },
    {
      "id": "demin-water-10",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AN",
      "tagNo": "06"
    },
    {
      "id": "demin-water-11",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AN",
      "tagNo": "08"
    },
    {
      "id": "demin-water-12",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-AN",
      "tagNo": "01"
    },
    {
      "id": "demin-water-13",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-AN",
      "tagNo": "02"
    },
    {
      "id": "demin-water-14",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-CV",
      "tagNo": "01"
    },
    {
      "id": "demin-water-15",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-CV",
      "tagNo": "02"
    },
    {
      "id": "demin-water-16",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-CV",
      "tagNo": "03"
    },
    {
      "id": "demin-water-17",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-CV",
      "tagNo": "04"
    },
    {
      "id": "demin-water-18",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-CV",
      "tagNo": "05"
    },
    {
      "id": "demin-water-19",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-CV",
      "tagNo": "06"
    },
    {
      "id": "demin-water-20",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-CV",
      "tagNo": "08"
    },
    {
      "id": "demin-water-21",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-CV",
      "tagNo": "01"
    },
    {
      "id": "demin-water-22",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-SF",
      "tagNo": "01"
    },
    {
      "id": "demin-water-23",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-SF",
      "tagNo": "02"
    },
    {
      "id": "demin-water-24",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-SF",
      "tagNo": "03"
    },
    {
      "id": "demin-water-25",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-SF",
      "tagNo": "04"
    },
    {
      "id": "demin-water-26",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-SF",
      "tagNo": "05"
    },
    {
      "id": "demin-water-27",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-SF",
      "tagNo": "01"
    },
    {
      "id": "demin-water-28",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-SF",
      "tagNo": "02"
    },
    {
      "id": "demin-water-29",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AC",
      "tagNo": "01"
    },
    {
      "id": "demin-water-30",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AC",
      "tagNo": "02"
    },
    {
      "id": "demin-water-31",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AC",
      "tagNo": "03"
    },
    {
      "id": "demin-water-32",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AC",
      "tagNo": "04"
    },
    {
      "id": "demin-water-33",
      "plantArea": "DEMIN WATER",
      "equipmentService": "XV-AC",
      "tagNo": "05"
    },
    {
      "id": "demin-water-34",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-AC",
      "tagNo": "01"
    },
    {
      "id": "demin-water-35",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-AC",
      "tagNo": "02"
    },
    {
      "id": "demin-water-36",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-CV",
      "tagNo": "02"
    },
    {
      "id": "demin-water-37",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-CATRIDGE IN",
      "tagNo": "-"
    },
    {
      "id": "demin-water-38",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-CATRIDGE OUT",
      "tagNo": "1"
    },
    {
      "id": "demin-water-39",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-CATRIDGE OUT",
      "tagNo": "2"
    },
    {
      "id": "demin-water-40",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-RO IN",
      "tagNo": "-"
    },
    {
      "id": "demin-water-41",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-IN PERMAITE",
      "tagNo": "-"
    },
    {
      "id": "demin-water-42",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-REJECT",
      "tagNo": "-"
    },
    {
      "id": "demin-water-43",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-PERMAITE",
      "tagNo": "1"
    },
    {
      "id": "demin-water-44",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-PERMAITE",
      "tagNo": "2"
    },
    {
      "id": "demin-water-45",
      "plantArea": "DEMIN WATER",
      "equipmentService": "PG-PERMAITE",
      "tagNo": "3"
    },
    {
      "id": "demin-water-46",
      "plantArea": "DEMIN WATER",
      "equipmentService": "HIGH PRESSURE SWITCH",
      "tagNo": "-"
    },
    {
      "id": "demin-water-47",
      "plantArea": "DEMIN WATER",
      "equipmentService": "LOW PRESSURE SWITCH",
      "tagNo": "-"
    }
  ],
  "LABORATORIUM": [
    {
      "id": "laboratorium-1",
      "plantArea": "LABORATORIUM",
      "equipmentService": "PRESS MACHINE SHIN HEUNG",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-2",
      "plantArea": "LABORATORIUM",
      "equipmentService": "PRESS MACHINE DAE YOUNG",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-3",
      "plantArea": "LABORATORIUM",
      "equipmentService": "ROLL MACHINE",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-5",
      "plantArea": "LABORATORIUM",
      "equipmentService": "DT-METER A",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-6",
      "plantArea": "LABORATORIUM",
      "equipmentService": "DT-METER B",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-7",
      "plantArea": "LABORATORIUM",
      "equipmentService": "DT-METER C",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-8",
      "plantArea": "LABORATORIUM",
      "equipmentService": "DT-METER D",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-9",
      "plantArea": "LABORATORIUM",
      "equipmentService": "DT-METER E",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-13",
      "plantArea": "LABORATORIUM",
      "equipmentService": "MALVERN HYDRO",
      "tagNo": "EV-1"
    },
    {
      "id": "laboratorium-14",
      "plantArea": "LABORATORIUM",
      "equipmentService": "MALVERN HYDRO",
      "tagNo": "EV-2"
    },
    {
      "id": "laboratorium-15",
      "plantArea": "LABORATORIUM",
      "equipmentService": "MEMMERT OVEN",
      "tagNo": "105°C"
    },
    {
      "id": "laboratorium-17",
      "plantArea": "LABORATORIUM",
      "equipmentService": "ELECTRIC MUFFLE FURNANCE",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-18",
      "plantArea": "LABORATORIUM",
      "equipmentService": "RUBBER AGING TESTER",
      "tagNo": "-"
    },
    {
      "id": "laboratorium-20",
      "plantArea": "LABORATORIUM",
      "equipmentService": "SHIMADZU NEXIS",
      "tagNo": "GC-2030"
    },
    {
      "id": "laboratorium-21",
      "plantArea": "LABORATORIUM",
      "equipmentService": "IKA",
      "tagNo": "C200"
    },
    {
      "id": "laboratorium-22",
      "plantArea": "LABORATORIUM",
      "equipmentService": "IKA RC2 BASIC",
      "tagNo": "-"
    }
  ],
  "CCTV": [
    {
      "id": "cctv-1",
      "plantArea": "CCTV",
      "equipmentService": "HDCA PANNEVISE",
      "tagNo": "D1"
    },
    {
      "id": "cctv-2",
      "plantArea": "CCTV",
      "equipmentService": "ADCA PANNEVISE – 1 / 2",
      "tagNo": "D2"
    },
    {
      "id": "cctv-3",
      "plantArea": "CCTV",
      "equipmentService": "ADCA PANNEVISE – 3 / 4",
      "tagNo": "D3"
    },
    {
      "id": "cctv-4",
      "plantArea": "CCTV",
      "equipmentService": "OLD DRYING – CAM 1",
      "tagNo": "D4"
    },
    {
      "id": "cctv-5",
      "plantArea": "CCTV",
      "equipmentService": "OLD DRYING – CAM 2",
      "tagNo": "D5"
    },
    {
      "id": "cctv-6",
      "plantArea": "CCTV",
      "equipmentService": "ADCA D30CSK",
      "tagNo": "D6"
    },
    {
      "id": "cctv-7",
      "plantArea": "CCTV",
      "equipmentService": "ADCA QLD 1 / 2",
      "tagNo": "D7"
    },
    {
      "id": "cctv-8",
      "plantArea": "CCTV",
      "equipmentService": "ADCA QLD 3 / 4",
      "tagNo": "D8"
    },
    {
      "id": "cctv-9",
      "plantArea": "CCTV",
      "equipmentService": "PE – SUPER MIXER - A/B",
      "tagNo": "D9"
    },
    {
      "id": "cctv-10",
      "plantArea": "CCTV",
      "equipmentService": "PE – SUPER M",
      "tagNo": "D10"
    },
    {
      "id": "cctv-11",
      "plantArea": "CCTV",
      "equipmentService": "PE – SUPER MIXER - C",
      "tagNo": "D11"
    },
    {
      "id": "cctv-12",
      "plantArea": "CCTV",
      "equipmentService": "ADCA DRYING – 1 / 2",
      "tagNo": "D12"
    },
    {
      "id": "cctv-13",
      "plantArea": "CCTV",
      "equipmentService": "ADCA DRYING – 3 / 4",
      "tagNo": "D13"
    },
    {
      "id": "cctv-14",
      "plantArea": "CCTV",
      "equipmentService": "OBSH",
      "tagNo": "D14"
    },
    {
      "id": "cctv-15",
      "plantArea": "CCTV",
      "equipmentService": "REST ROOM",
      "tagNo": "D15"
    },
    {
      "id": "cctv-16",
      "plantArea": "CCTV",
      "equipmentService": "WEIGHING",
      "tagNo": "CH-01"
    },
    {
      "id": "cctv-17",
      "plantArea": "CCTV",
      "equipmentService": "GATE IN",
      "tagNo": "CH-02"
    },
    {
      "id": "cctv-18",
      "plantArea": "CCTV",
      "equipmentService": "LOADING 2",
      "tagNo": "CH-03"
    },
    {
      "id": "cctv-19",
      "plantArea": "CCTV",
      "equipmentService": "GATE 2 / BOILER",
      "tagNo": "CH-04"
    },
    {
      "id": "cctv-20",
      "plantArea": "CCTV",
      "equipmentService": "GUDANG",
      "tagNo": "CH-05"
    },
    {
      "id": "cctv-21",
      "plantArea": "CCTV",
      "equipmentService": "GATE OUT",
      "tagNo": "CH-06"
    },
    {
      "id": "cctv-22",
      "plantArea": "CCTV",
      "equipmentService": "LOADING 1",
      "tagNo": "CH-07"
    },
    {
      "id": "cctv-23",
      "plantArea": "CCTV",
      "equipmentService": "GUDANG AREA",
      "tagNo": "CH-08"
    },
    {
      "id": "cctv-24",
      "plantArea": "CCTV",
      "equipmentService": "DJI – LIMBAH OUTLET",
      "tagNo": "DJI-LIMBAH"
    }
  ],
  "DCS PC": [
    {
      "id": "dcs-pc-1",
      "plantArea": "DCS PC",
      "equipmentService": "MAIN SERVER",
      "tagNo": "SERVER A"
    },
    {
      "id": "dcs-pc-2",
      "plantArea": "DCS PC",
      "equipmentService": "BACKUP SERVER",
      "tagNo": "SERVER B"
    },
    {
      "id": "dcs-pc-3",
      "plantArea": "DCS PC",
      "equipmentService": "DATABASE ALL HYDRAZINE",
      "tagNo": "DATABASE"
    },
    {
      "id": "dcs-pc-4",
      "plantArea": "DCS PC",
      "equipmentService": "HYDRAZINE-1 & 80%",
      "tagNo": "STATION 1"
    },
    {
      "id": "dcs-pc-5",
      "plantArea": "DCS PC",
      "equipmentService": "HYDRAZINE-1 & 80%",
      "tagNo": "STATION 2"
    },
    {
      "id": "dcs-pc-6",
      "plantArea": "DCS PC",
      "equipmentService": "HYDRAZINE-2 & 80%",
      "tagNo": "STATION 3"
    },
    {
      "id": "dcs-pc-7",
      "plantArea": "DCS PC",
      "equipmentService": "HYDRAZINE-2 & 80%",
      "tagNo": "STATION 3"
    },
    {
      "id": "dcs-pc-8",
      "plantArea": "DCS PC",
      "equipmentService": "MAIN SERVER",
      "tagNo": "SERVER A"
    },
    {
      "id": "dcs-pc-9",
      "plantArea": "DCS PC",
      "equipmentService": "BACKUP SERVER",
      "tagNo": "SERVER B"
    },
    {
      "id": "dcs-pc-10",
      "plantArea": "DCS PC",
      "equipmentService": "DATABASE HDCA, HYPO, E-PROCESS",
      "tagNo": "DATABASE"
    },
    {
      "id": "dcs-pc-11",
      "plantArea": "DCS PC",
      "equipmentService": "HDCA, HYPO",
      "tagNo": "STATION 1"
    },
    {
      "id": "dcs-pc-12",
      "plantArea": "DCS PC",
      "equipmentService": "HDCA, HYPO",
      "tagNo": "STATION 2"
    },
    {
      "id": "dcs-pc-13",
      "plantArea": "DCS PC",
      "equipmentService": "HDCA, HYPO",
      "tagNo": "STATION 3"
    },
    {
      "id": "dcs-pc-14",
      "plantArea": "DCS PC",
      "equipmentService": "E-PROCESS",
      "tagNo": "STATION 4"
    },
    {
      "id": "dcs-pc-15",
      "plantArea": "DCS PC",
      "equipmentService": "E-PROCESS",
      "tagNo": "STATION 5"
    }
  ],
  "UPS": [
    {
      "id": "ups-1",
      "plantArea": "UPS",
      "equipmentService": "ALL HYDRAZINE BACKUP POWER",
      "tagNo": "UPS-1"
    },
    {
      "id": "ups-2",
      "plantArea": "UPS",
      "equipmentService": "ALL HYDRAZINE BACKUP POWER",
      "tagNo": "UPS-2"
    },
    {
      "id": "ups-16",
      "plantArea": "UPS",
      "equipmentService": "HDCA, HYPO",
      "tagNo": "UPS-1"
    },
    {
      "id": "ups-17",
      "plantArea": "UPS",
      "equipmentService": "E-PROCESS",
      "tagNo": "UPS-2"
    }
  ],
  "GAS DETECTOR": [
    {
      "id": "gas-detector-1",
      "plantArea": "GAS DETECTOR",
      "equipmentService": "GAS DETECTOR Cl2",
      "tagNo": "GD-CL2"
    },
    {
      "id": "gas-detector-2",
      "plantArea": "GAS DETECTOR",
      "equipmentService": "GAS DETECTOR NH3",
      "tagNo": "GD-NH3"
    }
  ]
};

const defaultEquipmentFallback: Equipment[] = [
  { id: "empty-1", plantArea: "NEW AREA", equipmentService: "TAMBAH EQUIPMENT", tagNo: "-" },
];

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function formatDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function userDisplayName(user: { name?: string | null; username?: string | null } | null | undefined) {
  return user?.name || user?.username || "Current User";
}

function guessTemplate(plantArea: string): TemplateType {
  const normalized = plantArea.trim().toUpperCase();
  return plantTemplateMap[normalized] ?? "base";
}

function inferSubArea(plantArea: string, equipmentService: string, tagNo: string) {
  const service = equipmentService.toUpperCase();
  const tag = tagNo.toUpperCase();

  if (plantArea === "HYPO PROCESS") return "HYPO PROCESS";

  if (plantArea === "CCTV") {
    if (tag.startsWith("D")) return "PRODUCTION";
    if (tag.startsWith("CH")) return "BEA CUKAI";
    return "LIMBAH OUTLET";
  }

  if (plantArea === "DCS PC") {
    if (service.includes("HYDRAZINE")) return "HYDRAZINE";
    if (service.includes("HDCA") || service.includes("HYPO") || service.includes("E-PROCESS")) return "HDCA, HYPO, E-PROCESS";
    return "SERVER / DATABASE";
  }

  if (plantArea === "GAS DETECTOR") return "GAS DETECTOR";
  if (plantArea === "UPS") {
    if (service.includes("HYDRAZINE")) return "HYDRAZINE";
    return "HDCA, HYPO, & E-PROCESS";
  }

  if (plantArea === "HYDRAZINE") {
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR)-12/) || tag.includes("120")) return "HYDRAZINE 1 - DISTILLATION";
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR)-13/) || tag.includes("130")) return "HYDRAZINE 1 - HYDROLYSIS";
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR)-16/) || tag.includes("160")) return "HYDRAZINE 1 - RECOVERY PROCESS";
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR)-14/) || tag.includes("140")) return "HYDRAZINE 1 - SEPARATION";
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR|TI)-10/) || tag.includes("102") || tag.includes("101")) return "HYDRAZINE 1 - SYNTHESIS";
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR)-22/) || tag.includes("220")) return "HYDRAZINE 2 - DISTILLATION";
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR)-23/) || tag.includes("230")) return "HYDRAZINE 2 - HYDROLYSIS";
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR)-24/) || tag.includes("240")) return "HYDRAZINE 2 - SEPARATION";
    if (tag.match(/^(FI|FIC|FICQ|LI|LIC|PI|TR|TI)-20/) || tag.includes("202") || tag.includes("201")) return "HYDRAZINE 2 - SYNTHESIS";
    if (tag.includes("350") || service.includes("305") || service.includes("TK-305")) return "HYDRAZINE - RAW MATERIAL";
    if (tag.includes("1002") || service.includes("TK-8")) return "HYDRAZINE 80%";
    return "HYDRAZINE";
  }

  if (plantArea === "HDCA") {
    if (tag.includes("402") || tag.includes("4004") || tag.includes("4100") || tag.includes("4200") || tag.includes("4300")) return "HDCA CONTINUOUS PROCESS";
    if (tag.includes("4005") || tag.includes("4101") || tag.includes("4102") || tag.includes("4201") || tag.includes("4202") || tag.includes("4301") || tag.includes("4302")) return "HDCA BATCH PROCESS";
    if (tag.includes("31") || tag.includes("32") || tag.includes("33") || tag.includes("34")) return "NH3 RECOVERY PROCESS";
    if (tag.includes("4106") || tag.includes("4206") || tag.includes("4306") || tag.includes("1042") || tag.includes("2042")) return "HDCA PANNEVISE";
    if (tag.includes("40") || service.includes("ST-400") || service.includes("D-4011") || service.includes("DISSOLVER")) return "STORAGE TANK & DISSOLVER";
    return "HDCA";
  }

  if (plantArea === "E-PROCESS") {
    if (tag.includes("140") || tag.includes("150") || tag.includes("160") || tag.includes("170")) return "E-PROCESS AGING & HCL RECOVERY #1";
    if (tag.includes("240") || tag.includes("250") || tag.includes("260") || tag.includes("270")) return "E-PROCESS AGING & HCL RECOVERY #2";
    if (tag.includes("110") || tag.includes("120") || tag.includes("130") || tag.includes("101")) return "E-PROCESS REACTION #1";
    if (tag.includes("210") || tag.includes("220") || tag.includes("230") || tag.includes("201")) return "E-PROCESS REACTION #2";
    if (tag.includes("530") || tag.includes("280")) return "ADCA BATCH PROCESS";
    return "E-PROCESS";
  }

  if (plantArea === "PANNEVISE DRYING") {
    if (service.includes("TK-4") || service.includes("TK-12")) return "PANNEVISE 5";
    if (service.includes("TK-10") || service.includes("TK-8")) return "PANNEVISE 6";
    if (service.includes("TK-6") || service.includes("TK-3")) return "PANNEVISE 7";
    if (service.includes("TK-11") || service.includes("TK-7")) return "PANNEVISE 8";
    if (service.includes("DRY") || service.includes("DUST") || service.includes("TELSONIC")) return "OLD / NEW DRYING";
    return "PANNEVISE DRYING";
  }

  if (plantArea === "PE - MIXING") {
    if (service.includes("SUPER MIXER C")) return "SUPER MIXER C";
    return "SUPER MIXER A-B";
  }

  if (plantArea === "ZET O MILL") {
    const m = service.match(/ZET MILL\s*(\d+)/);
    return m ? `ZET O MILL - ${m[1]}` : "ZET O MILL";
  }

  if (plantArea === "ADCA MILLING") {
    if (service.includes("QLD 1") || service.includes("QLD-1")) return "QLD-1";
    if (service.includes("QLD 2") || service.includes("QLD-2")) return "QLD-2";
    if (service.includes("QLD 3") || service.includes("QLD-3") || service.includes("HOSOKAWA")) return "QLD-3 (HOSOKAWA)";
    if (service.includes("QLD 4") || service.includes("QLD-4")) return "QLD-4";
    return "ADCA MILLING";
  }

  if (plantArea === "OBSH TSH") {
    if (service.includes("OBSH") || service.includes("TELSONIC") || service.includes("PRESSURE GAUGE")) return "OBSH - DRYING";
    if (service.includes("PT-OBSH") || service.includes("PCV-OBSH") || service.includes("TE-BODY") || service.includes("TE-INLET") || service.includes("TE-OUTLET")) return "OBSH - MILLING";
    if (service.includes("GAUGE-A") || service.includes("GAUGE-B")) return "SCRUBBER";
    return "REAKTOR";
  }

  if (plantArea === "REFRIGERATOR") {
    if (service.includes("510") || service.includes("540") || service.includes("BRINE")) return "TANGKI BRINE / HYPO SIRKULASI";
    return "REFRIGERATOR";
  }

  return plantArea;
}

function makeDefaultRows(equipment: Equipment[], templateType: TemplateType): PreventiveRow[] {
  const columns = templateColumns[templateType];
  return equipment.map((item) => ({
    equipmentId: item.id,
    values: Object.fromEntries(columns.map((column) => [column.key, column.kind === "number" || column.kind === "text" ? "" : "B"])),
    remark: "",
  }));
}

function isBadCondition(value: string) {
  return value === "C" || value === "D" || value === "E";
}

function loadSaved(userName: string): PreventiveReport {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PreventiveReport;
      return {
        ...parsed,
        checkedBy: userName || parsed.checkedBy,
      };
    }
  } catch {
    // ignore invalid localStorage
  }

  const templateType: TemplateType = "base";
  const plantArea = "HYPO PROCESS";
  const equipment = (equipmentPresets[plantArea] ?? defaultEquipmentFallback).map((item) => ({
    ...item,
    subArea: item.subArea || inferSubArea(plantArea, item.equipmentService, item.tagNo),
  }));
  return {
    id: makeId("preventive"),
    date: todayJakarta(),
    plantArea,
    templateType,
    checkedBy: userName || "Current User",
    rows: makeDefaultRows(equipment, templateType),
    equipment,
    savedAt: "",
    savedBy: "",
  };
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ConditionInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <select
      value={value || "B"}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={`h-11 w-full rounded-2xl border px-3 text-sm font-black outline-none disabled:cursor-not-allowed disabled:opacity-70 ${conditionClass[(value || "B") as Condition]}`}
    >
      {CONDITION_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ValueInput({
  column,
  value,
  onChange,
  disabled,
}: {
  column: CheckColumn;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  if (column.kind === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={column.unit ? `Isi ${column.unit}` : "Isi angka"}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    );
  }

  if (column.kind === "text") {
    return (
      <input
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Isi nilai"
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    );
  }

  return <ConditionInput value={value} disabled={disabled} onChange={onChange} />;
}

export default function PreventiveChecklistPage() {
  const { user } = useAuth();
  const canView = hasRole(user?.role, permissions.preventiveView);
  const canManage = hasRole(user?.role, permissions.preventiveManage);
  const readOnly = !canManage || isViewOnly(user?.role);
  const currentUserName = userDisplayName(user);

  const [report, setReport] = useState<PreventiveReport>(() => loadSaved(currentUserName));
  const [history, setHistory] = useState<PreventiveReport[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [viewedReport, setViewedReport] = useState<PreventiveReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [newPlantArea, setNewPlantArea] = useState("");
  const [newEquipment, setNewEquipment] = useState({ equipmentService: "", tagNo: "" });
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const templateType = report.templateType;
  const columns = templateColumns[templateType];
  const activeRows = useMemo(
    () => report.equipment.map((equipment) => report.rows.find((row) => row.equipmentId === equipment.id) ?? { equipmentId: equipment.id, values: {}, remark: "" }),
    [report.equipment, report.rows],
  );
  const filteredEquipment = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return report.equipment;
    return report.equipment.filter((equipment) => {
      const row = report.rows.find((item) => item.equipmentId === equipment.id);
      return [
        equipment.equipmentService,
        equipment.tagNo,
        equipment.plantArea,
        equipment.subArea ?? "",
        row?.remark ?? "",
        ...Object.values(row?.values ?? {}),
      ].join(" ").toLowerCase().includes(query);
    });
  }, [report.equipment, report.rows, searchTerm]);
  const filteredRows = useMemo(
    () => filteredEquipment.map((equipment) => report.rows.find((row) => row.equipmentId === equipment.id) ?? { equipmentId: equipment.id, values: {}, remark: "" }),
    [filteredEquipment, report.rows],
  );
  const previewReport = viewedReport ?? report;
  const previewColumns = templateColumns[previewReport.templateType];
  const previewRows = previewReport.equipment.map(
    (equipment) => previewReport.rows.find((row) => row.equipmentId === equipment.id) ?? { equipmentId: equipment.id, values: {}, remark: "" },
  );

  const issues = useMemo(() => {
    const list: Array<{ equipment: Equipment; row: PreventiveRow; column: CheckColumn; value: string }> = [];
    report.equipment.forEach((equipment) => {
      const row = report.rows.find((item) => item.equipmentId === equipment.id);
      if (!row) return;
      columns.forEach((column) => {
        const value = row.values[column.key];
        if (isBadCondition(value)) list.push({ equipment, row, column, value });
      });
    });
    return list;
  }, [columns, report.equipment, report.rows]);

  useEffect(() => {
    setReport((current) => ({ ...current, checkedBy: currentUserName }));
  }, [currentUserName]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  }, [report]);

  if (!canView) {
    return <div className="rounded-3xl border bg-white p-8 shadow-sm dark:bg-slate-900 dark:text-white">Anda tidak memiliki akses ke Preventive Checklist.</div>;
  }

  function replaceReportForPlant(plantArea: string, forcedTemplate?: TemplateType) {
    const nextTemplate = forcedTemplate ?? guessTemplate(plantArea);
    const source = equipmentPresets[plantArea] ?? equipmentPresets[plantArea.toUpperCase()] ?? defaultEquipmentFallback;
    const preset = source.map((item, index) => ({
      ...item,
      id: item.id || `${plantArea}-${index + 1}`.replace(/\s+/g, "-").toLowerCase(),
      plantArea,
      subArea: item.subArea || inferSubArea(plantArea, item.equipmentService, item.tagNo),
    }));

    setViewedReport(null);
    setReport((current) => ({
      ...current,
      id: makeId("preventive"),
      plantArea,
      templateType: nextTemplate,
      equipment: preset,
      rows: makeDefaultRows(preset, nextTemplate),
      checkedBy: currentUserName,
      savedAt: "",
      savedBy: "",
    }));
  }

  function updateRow(equipmentId: string, patch: Partial<PreventiveRow>) {
    setViewedReport(null);
    setReport((current) => {
      const exists = current.rows.some((row) => row.equipmentId === equipmentId);
      const rows = exists
        ? current.rows.map((row) => (row.equipmentId === equipmentId ? { ...row, ...patch, values: { ...row.values, ...(patch.values ?? {}) } } : row))
        : [...current.rows, { equipmentId, values: patch.values ?? {}, remark: patch.remark ?? "" }];
      return { ...current, rows };
    });
  }

  function setAllCondition(value: Condition) {
    setViewedReport(null);
    setReport((current) => ({
      ...current,
      rows: current.equipment.map((equipment) => {
        const existing = current.rows.find((row) => row.equipmentId === equipment.id);
        const values = { ...(existing?.values ?? {}) };
        templateColumns[current.templateType].forEach((column) => {
          if (column.kind !== "number" && column.kind !== "text") values[column.key] = value;
        });
        return { equipmentId: equipment.id, values, remark: existing?.remark ?? "" };
      }),
    }));
  }

  function addPlantArea() {
    const plantArea = newPlantArea.trim().toUpperCase();
    if (!plantArea) return;
    replaceReportForPlant(plantArea, guessTemplate(plantArea));
    setNewPlantArea("");
    setShowPlantModal(false);
  }

  function addEquipment() {
    const equipmentService = newEquipment.equipmentService.trim().toUpperCase();
    const tagNo = newEquipment.tagNo.trim().toUpperCase();
    if (!equipmentService || !tagNo) return;
    const equipment: Equipment = {
      id: makeId("eq"),
      plantArea: report.plantArea,
      subArea: inferSubArea(report.plantArea, equipmentService, tagNo),
      equipmentService,
      tagNo,
    };
    setReport((current) => ({
      ...current,
      equipment: [...current.equipment, equipment],
      rows: [...current.rows, { equipmentId: equipment.id, values: Object.fromEntries(columns.map((column) => [column.key, column.kind === "number" || column.kind === "text" ? "" : "B"])), remark: "" }],
    }));
    setNewEquipment({ equipmentService: "", tagNo: "" });
    setShowEquipmentModal(false);
  }

  function saveReport() {
    const savedAt = new Date().toISOString();
    const normalized: PreventiveReport = {
      ...report,
      id: report.id || makeId("preventive"),
      checkedBy: currentUserName,
      savedBy: currentUserName,
      savedAt,
    };

    const nextHistory = [normalized, ...history.filter((item) => item.id !== normalized.id)].slice(0, 50);
    setReport(normalized);
    setHistory(nextHistory);
    setViewedReport(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setSubmitMessage("Checklist tersimpan ke History Preventive.");
  }

  function submitChecklist() {
    const missingRemark = issues.filter((issue) => !issue.row.remark.trim());
    if (missingRemark.length > 0) {
      setSubmitMessage("Remark wajib diisi untuk semua item dengan condition C, D, atau E.");
      return;
    }

    const issuePayload = issues.map((issue) => ({
      id: `${report.id}-${issue.equipment.id}-${issue.column.key}-${issue.value}`,
      date: report.date,
      plantArea: report.plantArea,
      subArea: templateLabels[report.templateType],
      equipmentId: issue.equipment.id,
      equipmentService: issue.equipment.equipmentService,
      tagNo: issue.equipment.tagNo,
      source: issue.column.label,
      condition: issue.value,
      remark: issue.row.remark,
      checkedBy: currentUserName,
      status: "OPEN",
    }));

    localStorage.setItem(ISSUE_STORAGE_KEY, JSON.stringify(issuePayload));
    window.dispatchEvent(new CustomEvent(ISSUE_UPDATED_EVENT));
    saveReport();
    setSubmitMessage(`Checklist tersimpan. ${issuePayload.length} issue preventive dibuat otomatis.`);
  }

  function printReport() {
    document.body.classList.add("preventive-print-mode");
    window.print();
    window.setTimeout(() => document.body.classList.remove("preventive-print-mode"), 500);
  }

  function exportExcel() {
    const html = document.querySelector(".preventive-print-area")?.innerHTML ?? "";
    const workbook = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 4px; font-family: Arial; font-size: 10px; }
          .preventive-approval td { height: 36px; }
          .preventive-title { font-weight: 900; font-size: 16px; text-align: center; }
        </style>
      </head>
      <body>${html}</body></html>`;
    downloadTextFile(`preventive-${previewReport.plantArea}-${previewReport.date}.xls`, workbook, "application/vnd.ms-excel;charset=utf-8");
  }

  return (
    <div className="space-y-6 preventive-page">
      <section className="rounded-3xl border bg-white p-5 shadow-sm print-hide dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-200">
              <ShieldCheck className="h-4 w-4" /> ISO Preventive Form
            </div>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white">Preventive Checklist</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-300">
              Web form dibuat sederhana untuk input. Format tabel ISO lengkap hanya dipakai untuk Print dan Export Excel.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button onClick={printReport} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Printer className="mr-2 inline h-4 w-4" />Print
            </button>
            <button onClick={exportExcel} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-600 dark:text-white">
              <Download className="mr-2 inline h-4 w-4" />Export Excel
            </button>
            {!readOnly ? (
              <button onClick={saveReport} className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">
                <Save className="mr-2 inline h-4 w-4" />Save
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <label className="preventive-field-label">
            <span>Date</span>
            <input
              type="date"
              value={report.date}
              disabled={readOnly}
              onChange={(event) => {
                setViewedReport(null);
                setReport((current) => ({ ...current, date: event.target.value }));
              }}
              className="preventive-form-control"
            />
          </label>

          <label className="preventive-field-label">
            <span>Plant Area / Form Type</span>
            <select
              value={report.plantArea}
              disabled={readOnly}
              onChange={(event) => replaceReportForPlant(event.target.value)}
              className="preventive-form-control"
            >
              {Array.from(new Set([...defaultPlantAreas, report.plantArea])).map((area) => {
                const formType = guessTemplate(area);
                const suffix = formType === "base" ? "Standard" : templateLabels[formType];
                return <option key={area} value={area}>{`${area} - ${suffix}`}</option>;
              })}
            </select>
          </label>

          <label className="preventive-field-label">
            <span>Checked By</span>
            <input value={currentUserName} readOnly className="preventive-form-control bg-slate-50 font-bold dark:bg-slate-800" />
          </label>

          <div className="flex items-end gap-2">
            {!readOnly ? (
              <>
                <button onClick={() => setShowPlantModal(true)} className="h-11 flex-1 rounded-2xl border border-dashed border-blue-300 px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950">
                  <Plus className="mr-1 inline h-4 w-4" />Area
                </button>
                <button onClick={() => setShowEquipmentModal(true)} className="h-11 flex-1 rounded-2xl border border-dashed border-blue-300 px-3 text-sm font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950">
                  <Plus className="mr-1 inline h-4 w-4" />Equipment
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-200 md:flex-row md:items-center md:justify-between">
          <div>
            Template aktif: <b>{templateLabels[templateType]}</b>. Jumlah equipment: <b>{report.equipment.length}</b>. Issue C/D/E: <b>{issues.length}</b>.
          </div>
          {!readOnly ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setAllCondition("A")} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">All A</button>
              <button onClick={() => setAllCondition("B")} className="rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-black text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-200">All B</button>
            </div>
          ) : null}
        </div>

        {submitMessage ? (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${submitMessage.includes("wajib") ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {submitMessage}
          </div>
        ) : null}
      </section>

      <section className="print-hide rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label className="preventive-field-label">
          <span>Search Equipment</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari equipment service, tag no, remark, atau condition..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </label>
        <div className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
          Menampilkan {filteredEquipment.length} dari {report.equipment.length} equipment.
        </div>
      </section>

      <section className="print-hide rounded-3xl border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Condition Legend</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">Gunakan A/B untuk normal. C/D/E wajib mengisi remark.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONDITION_OPTIONS.map((option) => (
              <span key={option.value} className={`rounded-full border px-3 py-1 text-xs font-black ${conditionClass[option.value]}`}>
                {option.value} - {CONDITION_TEXT[option.value].replace(" CONDITION", "")}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="print-hide space-y-4">
        {filteredEquipment.length === 0 ? (
          <div className="rounded-3xl border bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Equipment tidak ditemukan. Coba ubah kata kunci search atau klik + Equipment.
          </div>
        ) : null}

        {filteredEquipment.map((equipment, index) => {
          const row = filteredRows[index];
          const needRemark = columns.some((column) => isBadCondition(row.values[column.key]));
          const missingRemark = needRemark && !row.remark.trim();

          return (
            <div key={equipment.id} className="rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b pb-4 dark:border-slate-700 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-black uppercase text-slate-400">No. {index + 1}</div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">{equipment.equipmentService}</h2>
                  <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-300">TAG NO: {equipment.tagNo}</p>
                  <p className="mt-1 text-xs font-black uppercase text-blue-600 dark:text-blue-300">SUB AREA: {equipment.subArea || "-"}</p>
                </div>
                {needRemark ? (
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 dark:bg-orange-950 dark:text-orange-200">
                    Remark wajib
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    Normal
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {columns.map((column) => (
                  <label key={`${equipment.id}-${column.key}`} className="preventive-field-label rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                    <span>{column.label}{column.unit ? ` (${column.unit})` : ""}</span>
                    <ValueInput
                      column={column}
                      value={row.values[column.key] ?? ""}
                      disabled={readOnly}
                      onChange={(value) => updateRow(equipment.id, { values: { [column.key]: value } })}
                    />
                  </label>
                ))}
              </div>

              <label className="preventive-field-label mt-4">
                <span>Remark {missingRemark ? "(wajib untuk C/D/E)" : "(opsional)"}</span>
                <textarea
                  value={row.remark}
                  disabled={readOnly}
                  onChange={(event) => updateRow(equipment.id, { remark: event.target.value })}
                  placeholder={missingRemark ? "Isi temuan / tindakan yang dibutuhkan..." : "Tambahkan catatan jika perlu..."}
                  className={`min-h-20 rounded-2xl border bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${missingRemark ? "border-red-300 bg-red-50 dark:bg-red-950" : "border-slate-200"}`}
                />
              </label>
            </div>
          );
        })}

        {!readOnly ? (
          <div className="sticky bottom-4 z-10 rounded-3xl border bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Save menyimpan history. Submit juga membuat issue preventive otomatis untuk condition C/D/E.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={saveReport} className="rounded-2xl border px-5 py-3 text-sm font-black dark:border-slate-600 dark:text-white">
                  <Save className="mr-2 inline h-4 w-4" />Save
                </button>
                <button onClick={submitChecklist} className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800">
                  <Send className="mr-2 inline h-4 w-4" />Submit Checklist
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="print-hide rounded-3xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">History Preventive</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">Klik View untuk melihat laporan yang sudah tersimpan. Klik Load untuk edit ulang.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{history.length} history</span>
        </div>

        {history.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">Belum ada history preventive.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Plant Area</th>
                  <th className="py-2 pr-3">Template</th>
                  <th className="py-2 pr-3">Checked By</th>
                  <th className="py-2 pr-3">Saved At</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-b dark:border-slate-700">
                    <td className="py-3 pr-3 font-bold text-slate-900 dark:text-white">{formatDate(item.date)}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">{item.plantArea}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">{templateLabels[item.templateType]}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">{item.checkedBy}</td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-200">{item.savedAt ? new Date(item.savedAt).toLocaleString() : "-"}</td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewedReport(item)} className="rounded-xl border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950">
                          <Eye className="mr-1 inline h-3 w-3" />View
                        </button>
                        <button
                          onClick={() => {
                            setReport(item);
                            setViewedReport(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="rounded-xl border px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Load
                        </button>
                        {!readOnly ? (
                          <button
                            onClick={() => {
                              const next = history.filter((record) => record.id !== item.id);
                              setHistory(next);
                              if (viewedReport?.id === item.id) setViewedReport(null);
                              localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
                            }}
                            className="rounded-xl border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewedReport ? (
        <div className="print-hide rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <b>Mode View Laporan:</b> sedang menampilkan {viewedReport.plantArea} tanggal {formatDate(viewedReport.date)}.
              <span className="block text-xs opacity-80">Print dan Export Excel akan memakai laporan yang sedang di-view ini.</span>
            </div>
            <button onClick={() => setViewedReport(null)} className="rounded-2xl border border-blue-300 px-4 py-2 text-xs font-black hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900">
              Tutup View
            </button>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b p-4 print-hide dark:border-slate-700">
          <h2 className="font-black text-slate-900 dark:text-white">{viewedReport ? "View Laporan Preventive" : "Preview Print / Export"}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">Format ini otomatis dipakai saat Print dan Export Excel.</p>
        </div>
        <div className="preventive-scroll">
          <div className="preventive-print-area">
            <div className={`preventive-paper preventive-template-${previewReport.templateType}`}>
              <header className="preventive-doc-header">
                <div>
                  <div className="preventive-title">CHECKLIST OF FIELD EQUIPMENT INSTRUMENT</div>
                  <div className="preventive-subtitle">(PREVENTIVE)</div>
                </div>
                <table className="preventive-approval">
                  <thead>
                    <tr><th colSpan={4}>APPROVAL</th></tr>
                    <tr><th>CHARGE</th><th>SECT. CHIEF</th><th>ASST. MANAGER</th><th>MANAGER</th></tr>
                  </thead>
                  <tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>
                </table>
              </header>

              <section className="preventive-meta-grid">
                <div><b>DATE</b><span>{formatDate(previewReport.date)}</span></div>
                <div><b>CHECKED BY</b><span>{previewReport.checkedBy}</span></div>
                <div><b>PLANT AREA</b><span>{previewReport.plantArea}</span></div>
              </section>

              <div className="preventive-condition-note preventive-condition-note-top">
                <b>GENERAL EQUIPMENT CONDITION</b>
                <span>A = VERY GOOD CONDITION | B = GOOD CONDITION | C = FAIRLY GOOD CONDITION | D = POOR CONDITION (STILL OPERATION) | E = DAMAGED CONDITION (NEEDS REPAIR/REPLACEMENT)</span>
              </div>

              <table className="preventive-template-table">
                <thead>
                  <tr>
                    <th className="preventive-no-col">NO</th>
                    <th>EQUIPMENT SERVICE</th>
                    <th>TAG NO</th>
                    {previewColumns.map((column) => (
                      <th key={`print-head-${column.key}`}>{column.label}{column.unit ? <small>{column.unit}</small> : null}</th>
                    ))}
                    <th>REMARK</th>
                  </tr>
                </thead>
                <tbody>
                  {previewReport.equipment.map((equipment, index) => {
                    const row = previewRows[index];
                    const previous = previewReport.equipment[index - 1];
                    const currentSubArea = equipment.subArea || previewReport.plantArea;
                    const showSubArea = index === 0 || (previous?.subArea || previewReport.plantArea) !== currentSubArea;

                    return (
                      <>
                        {showSubArea ? (
                          <tr key={`subarea-${currentSubArea}-${index}`} className="preventive-subarea-row">
                            <td colSpan={previewColumns.length + 4}>{currentSubArea}</td>
                          </tr>
                        ) : null}
                        <tr key={`print-${equipment.id}`}>
                          <td className="preventive-no-col">{index + 1}</td>
                          <td>{equipment.equipmentService}</td>
                          <td>{equipment.tagNo}</td>
                          {previewColumns.map((column) => (
                            <td key={`print-${equipment.id}-${column.key}`} className="preventive-center-cell">
                              {row.values[column.key] || "-"}
                            </td>
                          ))}
                          <td className="preventive-remark-cell">{row.remark || "-"}</td>
                        </tr>
                      </>
                    );
                  })}
                </tbody>
                <tfoot className="preventive-table-footer">
                  <tr>
                    <td colSpan={previewColumns.length + 4}>
                      <div className="preventive-doc-footer">
                        <span>Rev. 03 (2025.10.06)</span>
                        <span>PT. DONGJIN INDONESIA</span>
                        <span>DJF-J-M3-006</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </section>

      <Modal open={showPlantModal} title="Tambah Plant Area" description="Plant area baru akan memakai template standard kecuali namanya cocok CCTV / PC DCS / GAS DETECTOR / UPS." onClose={() => setShowPlantModal(false)} onSave={addPlantArea}>
        <input
          autoFocus
          value={newPlantArea}
          onChange={(event) => setNewPlantArea(event.target.value)}
          placeholder="Contoh: HYPO PROCESS"
          className="h-12 w-full rounded-2xl border px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </Modal>

      <Modal open={showEquipmentModal} title="Tambah Equipment" description={`Plant Area: ${report.plantArea}`} onClose={() => setShowEquipmentModal(false)} onSave={addEquipment}>
        <div className="space-y-4">
          <input
            autoFocus
            value={newEquipment.equipmentService}
            onChange={(event) => setNewEquipment((current) => ({ ...current, equipmentService: event.target.value }))}
            placeholder="Equipment Service"
            className="h-12 w-full rounded-2xl border px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            value={newEquipment.tagNo}
            onChange={(event) => setNewEquipment((current) => ({ ...current, tagNo: event.target.value }))}
            placeholder="Tag No"
            className="h-12 w-full rounded-2xl border px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </Modal>
    </div>
  );
}

function Modal({
  open,
  title,
  description,
  children,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-black">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-2xl border px-4 py-2 text-sm font-bold dark:border-slate-700">Cancel</button>
          <button onClick={onSave} className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">
            <FilePlus2 className="mr-2 inline h-4 w-4" />Save
          </button>
        </div>
      </div>
    </div>
  );
}
