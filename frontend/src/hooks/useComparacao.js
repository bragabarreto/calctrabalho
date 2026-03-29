import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

async function criarComparacao(payload) {
  const resp = await fetch('/api/comparacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro);
  return json;
}

async function obterComparacao(id) {
  const resp = await fetch(`/api/comparacoes/${id}`);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro);
  return json;
}

async function listarComparacoes() {
  const resp = await fetch('/api/comparacoes');
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro);
  return json;
}

export function useComparacoes() {
  return useQuery({ queryKey: ['comparacoes'], queryFn: listarComparacoes });
}

export function useComparacao(id) {
  return useQuery({ queryKey: ['comparacao', id], queryFn: () => obterComparacao(id), enabled: !!id });
}

export function useCriarComparacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: criarComparacao,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comparacoes'] }),
  });
}
