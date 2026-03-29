import React from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import DadosContrato from './DadosContrato.jsx';
import TipoCalculo from './TipoCalculo.jsx';
import Verbas from './Verbas.jsx';
import ParcelasPersonalizadas from './ParcelasPersonalizadas.jsx';
import ConfigurarParcelas from './ConfigurarParcelas.jsx';
import HorarioTrabalho from './HorarioTrabalho.jsx';
import Deducoes from './Deducoes.jsx';
import MutasEDespesas from './MutasEDespesas.jsx';
import Resultado from './Resultado.jsx';
import ResultadoTriplo from './ResultadoTriplo.jsx';

/**
 * Step mapping:
 *   1  = DadosContrato
 *   2  = TipoCalculo
 *   3  = Verbas/Férias/13o       (verbas_rescisórias, verbas_e_parcelas)
 *   5  = Parcelas                (verbas_e_parcelas, apenas_parcelas)
 *   11 = ConfigurarParcelas      (verbas_e_parcelas, apenas_parcelas)
 *   6  = Jornada/HE              (condicional — apenas se parcelas de jornada selecionadas)
 *   7  = Deduções                (todos os fluxos)
 *   8  = Multas e Despesas       (todos os fluxos)
 *   9  = Resultado               (todos os fluxos)
 *
 * Navegação por fluxo:
 *   verbas_rescisórias:  1→2→3→7→8→9
 *   verbas_e_parcelas:   1→2→3→5→11→[6]→7→8→9
 *   apenas_parcelas:     1→2→5→11→[6]→7→8→9
 *
 * [6] = somente se alguma parcela requer jornada (tpl_horas_extras, tpl_noturno, tpl_intervalo)
 */

const PARCELAS_JORNADA_IDS = ['tpl_horas_extras', 'tpl_noturno', 'tpl_intervalo'];

function getStepsPorFluxo(tipoFluxo, precisaJornada) {
  const jornadaStep = { num: 6, label: 'Jornada' };
  const base = {
    'verbas_rescisórias': [
      { num: 1, label: 'Contrato' },
      { num: 2, label: 'Tipo' },
      { num: 3, label: 'Verbas' },
      { num: 7, label: 'Deduções' },
      { num: 8, label: 'Despesas' },
      { num: 9, label: 'Resultado' },
    ],
    'verbas_e_parcelas': [
      { num: 1, label: 'Contrato' },
      { num: 2, label: 'Tipo' },
      { num: 3, label: 'Verbas' },
      { num: 5, label: 'Parcelas' },
      { num: 11, label: 'Configurar' },
      ...(precisaJornada ? [jornadaStep] : []),
      { num: 7, label: 'Deduções' },
      { num: 8, label: 'Despesas' },
      { num: 9, label: 'Resultado' },
    ],
    'apenas_parcelas': [
      { num: 1, label: 'Contrato' },
      { num: 2, label: 'Tipo' },
      { num: 5, label: 'Parcelas' },
      { num: 11, label: 'Configurar' },
      ...(precisaJornada ? [jornadaStep] : []),
      { num: 7, label: 'Deduções' },
      { num: 8, label: 'Despesas' },
      { num: 9, label: 'Resultado' },
    ],
  };
  return base[tipoFluxo] || base['verbas_rescisórias'];
}

function StepIndicator({ step, tipoFluxo, precisaJornada }) {
  const steps = getStepsPorFluxo(tipoFluxo, precisaJornada);
  const stepNums = steps.map((s) => s.num);
  const stepAtualIdx = stepNums.indexOf(step);

  return (
    <div className="flex items-center gap-1 py-4 px-6 bg-white border-b border-gray-200 overflow-x-auto">
      {steps.map((s, i) => {
        const concluido = stepAtualIdx > i;
        const ativo = step === s.num;
        return (
          <React.Fragment key={s.num}>
            <div className={`step-dot flex-shrink-0 ${ativo ? 'ativo' : concluido ? 'concluido' : ''}`}>
              {concluido ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block flex-shrink-0 ${ativo ? 'font-semibold text-primaria' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px min-w-4 ${concluido ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function CalculadoraPage() {
  const { step, tipoFluxo, dados } = useCalculoStore();

  const precisaJornada = (dados.parcelasPersonalizadas || [])
    .some(p => PARCELAS_JORNADA_IDS.includes(p._templateId));

  const mostrarResultadoTriplo =
    step === 9 && (tipoFluxo === 'verbas_rescisórias' || tipoFluxo === 'verbas_e_parcelas');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--fundo-pagina)' }}>
      <div className="bg-primaria text-white px-6 py-4">
        <h2 className="font-titulo text-2xl">Simulação de Cálculos Trabalhistas</h2>
        <p className="text-blue-200 text-sm mt-1">Preencha os dados do contrato para calcular as verbas rescisórias</p>
      </div>

      <StepIndicator step={step} tipoFluxo={tipoFluxo} precisaJornada={precisaJornada} />

      <div className="p-6">
        {step === 1 && <DadosContrato />}
        {step === 2 && <TipoCalculo />}
        {step === 3 && <Verbas />}
        {step === 5 && <ParcelasPersonalizadas />}
        {step === 11 && <ConfigurarParcelas />}
        {step === 6 && <HorarioTrabalho />}
        {step === 7 && <Deducoes />}
        {step === 8 && <MutasEDespesas />}
        {step === 9 && mostrarResultadoTriplo && <ResultadoTriplo />}
        {step === 9 && !mostrarResultadoTriplo && <Resultado />}
      </div>
    </div>
  );
}
