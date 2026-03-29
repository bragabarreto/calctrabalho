import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = '/api/selic';

async function listar() {
  const resp = await fetch(BASE);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao listar Selic');
  return json.valores; // [{ mes_ano: 'YYYY-MM', taxa_anual, taxa_mensal }]
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

export function useSelic() {
  return useQuery({ queryKey: ['selic'], queryFn: listar });
}

export function useSalvarSelic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['selic'] }),
  });
}

export function useRemoverSelic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: remover,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['selic'] }),
  });
}

export function useBacenSyncSelic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bacenSync,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['selic'] }),
  });
}
