import React, { useState } from 'react';
import { Download, Save, FileText } from 'lucide-react';

export default function ExportBar({ simulacaoId, onSalvar, salvoId }) {
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    if (!onSalvar) return null;
    setSalvando(true);
    try {
      const id = await onSalvar();
      return id;
    } finally {
      setSalvando(false);
    }
  }

  async function gerarPdf() {
    let id = salvoId || simulacaoId;
    if (!id) {
      if (onSalvar) {
        id = await handleSalvar();
        if (!id) { alert('Erro ao salvar antes de gerar PDF.'); return; }
      } else {
        alert('Salve a simulação antes de gerar o PDF.');
        return;
      }
    }
    setGerando(true);
    try {
      const resp = await fetch(`/api/pdf/gerar/${id}`, { method: 'POST' });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        alert('Erro ao gerar PDF: ' + (json.erro || resp.statusText));
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calculo-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex gap-3 items-center no-print">
      {onSalvar && !salvoId && (
        <button className="btn-secundario flex items-center gap-2" onClick={handleSalvar} disabled={salvando}>
          <Save size={16} />
          {salvando ? 'Salvando...' : 'Salvar Simulação'}
        </button>
      )}
      {salvoId && (
        <span className="text-xs text-green-600 flex items-center gap-1">
          <Save size={14} /> Salvo
        </span>
      )}
      <button
        className="btn-primario flex items-center gap-2"
        onClick={gerarPdf}
        disabled={gerando || salvando}
      >
        <FileText size={16} />
        {gerando ? 'Gerando PDF...' : 'Exportar PDF'}
      </button>
    </div>
  );
}
