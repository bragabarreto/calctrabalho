import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

async function listarSimulacoes(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`/api/simulacoes?${qs}`);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro);
  return json;
}

async function obterSimulacao(id) {
  const resp = await fetch(`/api/simulacoes/${id}`);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro);
  return json;
}

async function excluirSimulacao(id) {
  const resp = await fetch(`/api/simulacoes/${id}`, { method: 'DELETE' });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro);
  return json;
}

export function useSimulacoes(params) {
  return useQuery({ queryKey: ['simulacoes', params], queryFn: () => listarSimulacoes(params) });
}

export function useSimulacao(id) {
  return useQuery({ queryKey: ['simulacao', id], queryFn: () => obterSimulacao(id), enabled: !!id });
}

export function useExcluirSimulacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: excluirSimulacao,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['simulacoes'] }),
  });
}
