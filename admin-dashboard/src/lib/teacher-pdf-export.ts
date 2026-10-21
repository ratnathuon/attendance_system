import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface SubjectReportData {
  subject_info: {
    id: number;
    subject_name: string;
    subject_code: string;
    class_name: string;
    class_code: string;
    teacher_name: string;
    room?: string;
    schedule_day?: string;
    period_label?: string;
  };
  stats: {
    total_sessions: number;
    total_students: number;
    overall_rate: number;
    total_present: number;
    total_late: number;
    total_absent: number;
    total_excused: number;
  };
  sessions?: Array<{
    id: number;
    title: string;
    session_date: string;
    status: string;
    present_count: number;
    total_count: number;
  }>;
  students: Array<{
    id: number;
    name: string;
    identifier_number?: string;
    email: string;
    present: number;
    late: number;
    absent: number;
    excused: number;
    total_attended: number;
    attendance_rate: number;
  }>;
}

export function exportSubjectAttendancePdf(data: SubjectReportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Institution Header Bar
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ROYAL UNIVERSITY OF PHNOM PENH", 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text("Faculty Attendance Management System • Official Subject Report", 14, 18);

  const todayStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  doc.setFontSize(8);
  doc.text(`Generated: ${todayStr}`, pageWidth - 14, 18, { align: "right" });

  // 2. Course Meta Information
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.subject_info.subject_name, 14, 37);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105); // slate-600

  const subLine = `Course Code: ${data.subject_info.subject_code}   |   Class: ${data.subject_info.class_name} (${data.subject_info.class_code})`;
  doc.text(subLine, 14, 43);

  const period = data.subject_info.period_label ? `Period: ${data.subject_info.period_label}` : "All Recorded Sessions";
  const teacherLine = `Instructor: ${data.subject_info.teacher_name}   |   ${period}   |   Sessions: ${data.stats.total_sessions}`;
  doc.text(teacherLine, 14, 49);

  // 3. Stats Summary Boxes
  const boxY = 54;
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const boxHeight = 16;

  // Box 1: Overall Attendance Rate
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(14, boxY, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text(`${data.stats.overall_rate}%`, 14 + boxWidth / 2, boxY + 7, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(22, 101, 52);
  doc.text("Overall Attendance", 14 + boxWidth / 2, boxY + 12, { align: "center" });

  // Box 2: Total Present
  const b2X = 14 + boxWidth + 3;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(b2X, boxY, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.stats.total_present}`, b2X + boxWidth / 2, boxY + 7, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Present Marks", b2X + boxWidth / 2, boxY + 12, { align: "center" });

  // Box 3: Total Late
  const b3X = b2X + boxWidth + 3;
  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(b3X, boxY, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`${data.stats.total_late}`, b3X + boxWidth / 2, boxY + 7, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(146, 64, 14);
  doc.text("Late Marks", b3X + boxWidth / 2, boxY + 12, { align: "center" });

  // Box 4: Total Absent
  const b4X = b3X + boxWidth + 3;
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(b4X, boxY, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(190, 18, 60); // rose-700
  doc.text(`${data.stats.total_absent}`, b4X + boxWidth / 2, boxY + 7, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(159, 18, 57);
  doc.text("Absent Marks", b4X + boxWidth / 2, boxY + 12, { align: "center" });

  // 4. Students Table
  const tableRows = data.students.map((st, index) => {
    let standing = "Good Standing";
    if (st.attendance_rate < 70) standing = "Critical (<70%)";
    else if (st.attendance_rate < 80) standing = "Warning (<80%)";

    return [
      index + 1,
      st.identifier_number || "—",
      st.name,
      st.present,
      st.late,
      st.absent,
      st.excused,
      `${st.attendance_rate}%`,
      standing,
    ];
  });

  autoTable(doc, {
    startY: boxY + boxHeight + 6,
    head: [
      [
        "#",
        "Student ID",
        "Student Name",
        "Present",
        "Late",
        "Absent",
        "Excused",
        "Rate (%)",
        "Status",
      ],
    ],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 24, fontStyle: "bold" },
      2: { cellWidth: "auto", halign: "left", fontStyle: "bold" },
      3: { cellWidth: 16 },
      4: { cellWidth: 14 },
      5: { cellWidth: 14 },
      6: { cellWidth: 16 },
      7: { cellWidth: 18, fontStyle: "bold" },
      8: { cellWidth: 26 },
    },
    didParseCell: (hookData) => {
      // Highlight low attendance rates
      if (hookData.section === "body" && hookData.column.index === 7) {
        const rateVal = parseFloat(hookData.cell.text[0]);
        if (!isNaN(rateVal) && rateVal < 80) {
          hookData.cell.styles.textColor = [190, 18, 60]; // rose
        }
      }
      if (hookData.section === "body" && hookData.column.index === 8) {
        if (hookData.cell.text[0].includes("Critical")) {
          hookData.cell.styles.textColor = [190, 18, 60];
          hookData.cell.styles.fontStyle = "bold";
        } else if (hookData.cell.text[0].includes("Warning")) {
          hookData.cell.styles.textColor = [180, 83, 9];
        } else {
          hookData.cell.styles.textColor = [21, 128, 61];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Signature Section
  const finalY = (doc as any).lastAutoTable?.finalY || 230;
  if (finalY < 250) {
    const signY = Math.max(finalY + 16, 245);
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Instructor Verification & Signature", 14, signY);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, signY + 12, 70, signY + 12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(data.subject_info.teacher_name, 14, signY + 16);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Academic Affairs / Department Head", pageWidth - 14, signY, { align: "right" });
    doc.line(pageWidth - 70, signY + 12, pageWidth - 14, signY + 12);
    doc.text("Official Seal & Approval", pageWidth - 14, signY + 16, { align: "right" });
  }

  // 6. Save PDF
  const cleanCode = data.subject_info.subject_code.replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `RUPP_${cleanCode}_Attendance_Report.pdf`;
  doc.save(filename);
}
