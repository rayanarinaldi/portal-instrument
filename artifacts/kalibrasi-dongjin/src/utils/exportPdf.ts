import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportCalibrationPdf(records: any[]) {
  const doc = new jsPDF("landscape");

  doc.setFontSize(16);
  doc.text("Laporan Data Kalibrasi Instrument", 14, 15);

  doc.setFontSize(10);
  doc.text("PT. Dongjin Indonesia", 14, 22);
  doc.text(`Tanggal Export: ${new Date().toLocaleDateString("id-ID")}`, 14, 28);

  const rows = records.map((record, index) => {
    const data = record.data || {};

    return [
      index + 1,
      record.tagNo || "-",
      record.formType || "-",
      record.calibratedBy || "-",
      record.date || "-",
      data.calDueDate || "-",
      data.status || "-",
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [[
      "No",
      "Tag No",
      "Type",
      "Calibrated By",
      "Tanggal Kalibrasi",
      "Due Date",
      "Status",
    ]],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  doc.save(`laporan-kalibrasi-${Date.now()}.pdf`);
}