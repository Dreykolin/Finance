"use client";

import { useState } from "react";
import Link from "next/link";
// Si tienes una fuente personalizada (ej. Inter o Geist), impórtala aquí
// import { Inter } from "next/font/google";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div>
      {/* Botón menú flotante */}
      <button
        className={`fixed top-6 z-50 flex items-center justify-center w-12 h-12 
          bg-zinc-100 text-zinc-900 rounded-full shadow-lg hover:bg-white hover:scale-105 
          transition-all duration-300 ease-out border border-zinc-200`}
        onClick={() => setMenuAbierto((v) => !v)}
        style={{ left: menuAbierto ? "17.5rem" : "1.5rem" }}
        aria-label="Alternar menú"
      >
        {menuAbierto ? (
          <span className="text-xl font-bold leading-none">✕</span>
        ) : (
          <span className="text-xl font-bold leading-none">☰</span>
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 
          shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
            menuAbierto ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="p-8 flex flex-col h-full">
          <h2 className="text-2xl font-bold mb-10 text-white tracking-tight">Finanzas</h2>

          <nav className="flex-1">
            <ul className="flex flex-col gap-2">
              <MenuItem href="/" label="Inicio" onClick={() => setMenuAbierto(false)} />
              <MenuItem href="/cuotas" label="Cuotas" onClick={() => setMenuAbierto(false)} />
              <MenuItem href="/graficos" label="Gráficos" onClick={() => setMenuAbierto(false)} />
              <MenuItem href="/gestor-tarjetas" label="Gestor de Tarjetas" onClick={() => setMenuAbierto(false)} />
            </ul>
          </nav>

          <div className="pt-6 border-t border-zinc-800 text-xs text-zinc-500">© 2026 App Gastos</div>
        </div>
      </aside>

      {/* Contenedor principal */}
      <main className={`min-h-screen transition-all duration-300 ease-in-out ${menuAbierto ? "ml-64" : "ml-0"}`}>
        {children}
      </main>
    </div>
  );
}

// Pequeño componente auxiliar para los links del menú
// Esto ayuda a mantener el código limpio y consistente
function MenuItem({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="block px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors font-medium"
      >
        {label}
      </Link>
    </li>
  );
}