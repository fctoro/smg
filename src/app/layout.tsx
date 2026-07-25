import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ClubDataProvider } from '@/context/ClubDataContext';
import AuthProvider from '@/context/AuthProvider';


const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <AuthProvider>
            <ClubDataProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </ClubDataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
