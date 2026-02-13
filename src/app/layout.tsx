import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import ThemeInitializer from "@/components/ui/ThemeInitializer";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkCharts — Editor de Grafos Relacionales",
  description: "Editor visual de grafos relacionales para análisis de redes e inteligencia criminal",
};

// Inline script to apply theme before paint (avoids flash)
const themeScript = `(function(){try{var t=localStorage.getItem('linkcharts-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className={`${jetbrainsMono.variable} font-mono antialiased`}>
        <SessionProvider>
          <ThemeInitializer />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
