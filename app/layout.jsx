import "./globals.css";
import { AppProvider } from "./providers";
import { PushPrompt } from "./components/PushPrompt";

export const metadata = {
  title: "COPA 26 — Bolão da Vidros",
  description: "O bolão oficial da Vidros para a Copa do Mundo de 2026. Faça seus palpites e jogue com amigos!",
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
