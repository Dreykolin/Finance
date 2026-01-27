import "./globals.css";
import ClientLayout from "./components/layout";

export const metadata = {
  title: "Finance App",
  description: "Resumen de gastos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-zinc-200">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
