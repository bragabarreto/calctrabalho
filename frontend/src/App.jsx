import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import CalculadoraPage from './pages/Calculadora/index.jsx';
import HistoricoPage from './pages/Historico/index.jsx';
import HistoricoDetalhe from './pages/Historico/Detalhe.jsx';
import ComparacaoPage from './pages/Comparacao/index.jsx';
import ComparacaoPainel from './pages/Comparacao/Painel.jsx';
import ConfiguracoesPage from './pages/Configuracoes/index.jsx';
import SimuladorAcordoPage from './pages/SimuladorAcordo/index.jsx';

function Sidebar() {
  const links = [
    { to: '/', label: 'Calculadora', icon: '⚖️' },
    { to: '/historico', label: 'Histórico', icon: '📋' },
    { to: '/comparacao', label: 'Comparação', icon: '↔️' },
    { to: '/simulador-acordo', label: 'Simular Acordo', icon: '🤝' },
    { to: '/configuracoes', label: 'Configurações', icon: '⚙️' },
  ];

  return (
    <div className="sidebar flex flex-col p-4">
      <div className="mb-8 mt-2">
        <h1 className="font-titulo text-xl text-white font-bold leading-tight">
          CalcTrabalho
        </h1>
        <p className="text-xs text-blue-200 mt-1">Cálculos Trabalhistas</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-white/20">
        <p className="text-xs text-blue-200">
          Versão 1.0 · Uso interno
        </p>
        <p className="text-xs text-blue-300 mt-1">
          ⚠️ Ferramenta de simulação
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<CalculadoraPage />} />
            <Route path="/historico" element={<HistoricoPage />} />
            <Route path="/historico/:id" element={<HistoricoDetalhe />} />
            <Route path="/comparacao" element={<ComparacaoPage />} />
            <Route path="/comparacao/:id" element={<ComparacaoPainel />} />
            <Route path="/simulador-acordo" element={<SimuladorAcordoPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
