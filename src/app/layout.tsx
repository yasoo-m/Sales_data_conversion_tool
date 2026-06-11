import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "売上データ変換ツール",
  description: "ECモール売上CSVデータを統一フォーマットExcelに変換",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
