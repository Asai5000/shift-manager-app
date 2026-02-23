import type { Metadata } from "next";
import { inter, notoSansJP } from "@/lib/fonts";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "シフト管理システム",
  description: "効率的なシフト作成と管理のためのアプリケーション",
};

import { UnsavedChangesProvider } from '@/components/providers/unsaved-changes-provider';
import { UnsavedChangesDialog } from '@/components/unsaved-changes-dialog';
import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={cn(
        "min-h-screen bg-slate-50 font-sans antialiased",
        inter.variable,
        notoSansJP.variable
      )}>
        <UnsavedChangesProvider>
          <NavBar />
          <main className="container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </main>
          <UnsavedChangesDialog />
          <Toaster />
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
