import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 relative">
        <div className="w-full max-w-md z-10">
          {children}
        </div>
        <div className="fixed bottom-6 right-6 z-50">
          <ThemeTogglerTwo />
        </div>
      </div>
    </ThemeProvider>
  );
}
