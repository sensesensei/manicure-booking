import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Запись на маникюр",
  description:
    "Мини-проект для самостоятельного мастера: онлайн-запись по слотам и уведомления о новых бронях в Telegram.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
