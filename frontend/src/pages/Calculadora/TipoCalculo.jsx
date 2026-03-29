import React from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { FileText, Layers, List } from 'lucide-react';

const OPCOES = [
  {
    value: 'verbas_rescisórias',
    icon: FileText,
    titulo: 'Apenas Verbas Rescisórias',
    descricao: 'Calcula automaticamente 3 cenários simultâneos: Dispensa sem Justa Causa, Pedido de Demissão e Culpa Recíproca.',
    badge: '3 simulações',
  },
  {
    value: 'verbas_e_parcelas',
    icon: Layers,
    titulo: 'Verbas Rescisórias + Parcelas',
    descricao: 'Inclui verbas rescisórias (3 cenários) acrescidas de parcelas personalizadas configuradas pelo usuário.',
    badge: '3 simulações + parcelas',
  },
  {
    value: 'apenas_parcelas',
    icon: List,
    titulo: 'Apenas Parcelas',
    descricao: 'Calcula exclusivamente as parcelas personalizadas selecionadas, sem verbas rescisórias.',
    badge: 'resultado único',
  },
];

export default function TipoCalculo() {
  const { tipoFluxo, setTipoFluxo, setStep } = useCalculoStore();

  function avancar() {
    // apenas_parcelas pula Verbas (3) e Adicionais (4) → vai para Parcelas (5)
    setStep(tipoFluxo === 'apenas_parcelas' ? 5 : 3);
  }

  return (
    <div className="max-w-3xl">
      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-2 text-primaria">Tipo de Cálculo</h3>
        <p className="text-sm text-gray-500 mb-6">Selecione o tipo de cálculo que deseja realizar.</p>

        <div className="space-y-4">
          {OPCOES.map(({ value, icon: Icon, titulo, descricao, badge }) => (
            <label
              key={value}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                tipoFluxo === value
                  ? 'border-primaria bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="tipoFluxo"
                value={value}
                checked={tipoFluxo === value}
                onChange={() => setTipoFluxo(value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={18} className={tipoFluxo === value ? 'text-primaria' : 'text-gray-400'} />
                  <span className="font-semibold text-sm">{titulo}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{badge}</span>
                </div>
                <p className="text-sm text-gray-500">{descricao}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="aviso-judicial mb-4">
        <strong>Nota:</strong> O cálculo de <em>Rescisão Indireta</em> e <em>Dispensa por Justa Causa</em> pode ser realizado através de simulação individual na etapa de resultado, ou utilizando a opção "Verbas Rescisórias" e selecionando a modalidade desejada.
      </div>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario" onClick={() => setStep(1)}>← Anterior</button>
        <button type="button" className="btn-primario" onClick={avancar}>Próximo →</button>
      </div>
    </div>
  );
}
