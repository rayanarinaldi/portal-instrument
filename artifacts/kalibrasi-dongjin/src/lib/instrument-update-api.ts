import { API_BASE } from "@/lib/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || `API error ${response.status}`);
  }

  return data as T;
}

export type PlantArea = { id: number; name: string };
export type SubArea = { id: number; plantAreaId: number; plantArea: string; name: string };
export type PreventiveEquipment = {
  id: number;
  plantAreaId: number;
  plantArea: string;
  subAreaId: number;
  subArea: string;
  equipmentService: string;
  tagNo: string;
};

export const instrumentApi = {
  listPlantAreas: () => request<PlantArea[]>("/plant-areas"),
  createPlantArea: (name: string) => request<PlantArea>("/plant-areas", { method: "POST", body: JSON.stringify({ name }) }),

  listSubAreas: (plantArea?: string) => request<SubArea[]>(`/sub-areas${plantArea ? `?plantArea=${encodeURIComponent(plantArea)}` : ""}`),
  createSubArea: (payload: { plantArea: string; name: string }) => request<SubArea>("/sub-areas", { method: "POST", body: JSON.stringify(payload) }),

  listEquipment: (plantArea?: string, subArea?: string) => {
    const params = new URLSearchParams();
    if (plantArea) params.set("plantArea", plantArea);
    if (subArea) params.set("subArea", subArea);
    const query = params.toString();
    return request<PreventiveEquipment[]>(`/preventive-equipment${query ? `?${query}` : ""}`);
  },
  createEquipment: (payload: { plantArea: string; subArea: string; equipmentService: string; tagNo: string }) =>
    request<PreventiveEquipment>("/preventive-equipment", { method: "POST", body: JSON.stringify(payload) }),

  createPreventiveChecklist: (payload: unknown) => request("/preventive-checklists", { method: "POST", body: JSON.stringify(payload) }),
  listPreventiveIssues: () => request("/preventive-issues"),
  updatePreventiveIssueStatus: (id: number, payload: { status: "OPEN" | "PROGRESS" | "CLOSED"; actionNote?: string }) =>
    request(`/preventive-issues/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) }),

  createDailyReport: (payload: unknown) => request("/daily-reports", { method: "POST", body: JSON.stringify(payload) }),
  listDailyReports: () => request("/daily-reports"),

  createLogsheetShift: (payload: unknown) => request("/logsheet-shift", { method: "POST", body: JSON.stringify(payload) }),
  listLogsheetShift: () => request("/logsheet-shift"),

  createCollectData: (payload: unknown) => request("/collect-data", { method: "POST", body: JSON.stringify(payload) }),
  listCollectData: () => request("/collect-data"),
};
