import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = '/api/ipca-e';

async function listar() {
  const resp = await fetch(BASE);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao listar IPCA-E');
  return json.valores; // [{ mes_ano: 'YYYY-MM', valor }]
}

async function salvar(dados) {
  const resp = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao salvar');
  return json;
}

async function remover(mesAno) {
  const resp = await fetch(`${BASE}/${mesAno}`, { method: 'DELETE' });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao remover');
  return json;
}

async function bacenSync() {
  const resp = await fetch(`${BASE}/bacen-sync`, { method: 'POST' });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao sincronizar com BACEN');
  return json;
}

export function useIpcaE() {
  return useQuery({ queryKey: ['ipca-e'], queryFn: listar });
}

export function useSalvarIpcaE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipca-e'] }),
  });
}

export function useRemoverIpcaE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: remover,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipca-e'] }),
  });
}

export function useBacenSyncIpcaE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bacenSync,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipca-e'] }),
  });
}
