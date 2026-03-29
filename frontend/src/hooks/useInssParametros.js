import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = '/api/inss-parametros';

async function listar() {
  const resp = await fetch(BASE);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao listar parâmetros INSS');
  return json.vigencias;
}

async function obterPorData(data) {
  const resp = await fetch(`${BASE}/data/${data}`);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao buscar parâmetros INSS por data');
  return json;
}

async function salvarVigencia(dados) {
  const resp = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao salvar vigência INSS');
  return json;
}

async function removerVigencia(vigenciaInicio) {
  const resp = await fetch(`${BASE}/vigencia/${vigenciaInicio}`, { method: 'DELETE' });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao remover vigência INSS');
  return json;
}

export function useInssParametros() {
  return useQuery({ queryKey: ['inss-parametros'], queryFn: listar });
}

export function useInssParametrosPorData(data) {
  return useQuery({
    queryKey: ['inss-parametros', 'data', data],
    queryFn: () => obterPorData(data),
    enabled: Boolean(data),
  });
}

export function useSalvarInssVigencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarVigencia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inss-parametros'] }),
  });
}

export function useRemoverInssVigencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removerVigencia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inss-parametros'] }),
  });
}
