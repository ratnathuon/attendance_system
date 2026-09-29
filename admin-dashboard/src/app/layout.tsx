import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AttendSphere • Attendance System Admin",
  description: "Enterprise Smart QR & Role-Based Attendance Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100">
        {children}
      </body>
    </html>
  );
}
