import "./globals.css";
import { AppProvider } from "./providers";
import { PushPrompt } from "./components/PushPrompt";

export const metadata = {
  title: "COPA 26 — Bolão da Vidros",
  description: "O bolão oficial da Vidros para a Copa do Mundo de 2026. Faça seus palpites e jogue com amigos!",
  manifest: "/manifest.json",
  themeColor: "#a3e635",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bolão 2026",
  },
  icons: {
    icon: "/icon-512x512.png",
    apple: "/icon-192x192.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProvider>
          {children}
          <PushPrompt />
        </AppProvider>
      </body>
    </html>
  );
}
