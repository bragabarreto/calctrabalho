import React, { useState } from 'react';
import { Download, Save, FileText } from 'lucide-react';

export default function ExportBar({ simulacaoId, onSalvar, salvoId }) {
  const [gerando, setGerando] = useState(false);

  async function gerarPdf() {
    const id = salvoId || simulacaoId;
    if (!id) { alert('Salve a simulação antes de gerar o PDF.'); return; }
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
      {onSalvar && (
        <button className="btn-secundario flex items-center gap-2" onClick={onSalvar}>
          <Save size={16} />
          Salvar Simulação
        </button>
      )}
      <button
        className="btn-primario flex items-center gap-2"
        onClick={gerarPdf}
        disabled={gerando}
      >
        <FileText size={16} />
        {gerando ? 'Gerando PDF...' : 'Exportar PDF'}
      </button>
    </div>
  );
}
