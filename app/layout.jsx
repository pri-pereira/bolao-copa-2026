import "./globals.css";
import { AppProvider } from "./providers";

export const metadata = {
  title: "Copa — Bolão da Vidros",
  description: "O bolão oficial da Vidros para a Copa do Mundo de 2026. Faça seus palpites e jogue com amigos!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
