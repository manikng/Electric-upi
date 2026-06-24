import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Electric UPI — India's P2P EV Charging Network",
  description: "Find home-based EV chargers near you — or turn your home into a charging hub and earn money while you sleep. Just like Airbnb, but for electrons.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read theme preference from cookie on the server so the server-rendered
  // HTML matches the client's initial DOM and avoids hydration mismatch.
  // Read raw Cookie header and parse the `theme` value synchronously. Using
  // `headers().get('cookie')` avoids issues with dynamic cookie helpers in
  // this environment.
  const cookieHeader =  (await headers()).get("cookie") || "";
  const themeMatch = cookieHeader.match(new RegExp('(?:^|; )' + 'theme' + '=([^;]*)'));
  const themeCookie = themeMatch ? decodeURIComponent(themeMatch[1]) : null;
  const initialTheme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "dark";

  const setThemeScript = `(function(){
    try {
      var m = document.cookie.match(new RegExp('(^|; )' + 'theme' + '=([^;]*)'));
      var stored = m ? decodeURIComponent(m[2]) : null;
      if (stored === 'light' || stored === 'dark') {
        document.documentElement.setAttribute('data-theme', stored);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();`;

  return (
    <html lang="en" data-theme={initialTheme}>
      <head>
        {/* Ensure theme is set before React hydrates to avoid flash. Uses cookie so
            server and client can agree on the initial value. */}
        <Script id="theme-init" strategy="beforeInteractive">{`
(function(){
    try {
      var m = document.cookie.match(new RegExp('(^|; )' + 'theme' + '=([^;]*)'));
      var stored = m ? decodeURIComponent(m[2]) : null;
      if (stored === 'light' || stored === 'dark') {
        document.documentElement.setAttribute('data-theme', stored);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();
        `}</Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300..700&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
