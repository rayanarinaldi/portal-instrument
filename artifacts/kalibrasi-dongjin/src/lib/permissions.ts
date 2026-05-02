export type UserRole =
  | "admin_it"
  | "section_chief"
  | "pic"
  | "foreman"
  | "teknisi"
  | "teknisi_shift"
  | "teknisi_harian"
  | "asst_manager";

export const ROLE_LABELS: Record<string, string> = {
  admin_it: "Admin IT",
  section_chief: "Section Chief",
  pic: "PIC",
  foreman: "Foreman",
  teknisi: "Teknisi",
  teknisi_shift: "Teknisi Shift",
  teknisi_harian: "Teknisi Harian",
  asst_manager: "Asst. Manager",
};

export function hasRole(role: string | undefined, allowed: string[]) {
  return !!role && allowed.includes(role);
}

export function isViewOnly(role?: string) {
  return role === "pic" || role === "asst_manager";
}

export const permissions = {
  calibration: ["admin_it", "section_chief", "foreman", "teknisi", "teknisi_shift", "teknisi_harian", "asst_manager"],
  logsheetShift: ["admin_it", "teknisi_shift", "asst_manager"],
  preventiveView: ["admin_it", "section_chief", "pic", "asst_manager"],
  preventiveManage: ["admin_it", "section_chief"],
  dailyReportForeman: ["admin_it", "foreman", "section_chief", "asst_manager"],
  dailyReportSectionChief: ["admin_it", "section_chief", "asst_manager"],
  collectData: ["admin_it", "asst_manager", "section_chief"],
  monitoring: ["admin_it", "section_chief", "pic", "foreman", "asst_manager"],
};
