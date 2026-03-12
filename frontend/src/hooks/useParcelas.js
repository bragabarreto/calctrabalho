import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = '/api/parcelas-personalizadas';

async function listarParcelas() {
  const resp = await fetch(BASE);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao listar parcelas');
  return json.parcelas;
}

async function criarParcela(dados) {
  const resp = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao criar parcela');
  return json.parcela;
}

async function atualizarParcela({ id, ...dados }) {
  const resp = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao atualizar parcela');
  return json.parcela;
}

async function excluirParcela(id) {
  const resp = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao excluir parcela');
  return json;
}

export function useParcelas() {
  return useQuery({ queryKey: ['parcelas'], queryFn: listarParcelas });
}

export function useCriarParcela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: criarParcela,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcelas'] }),
  });
}

export function useAtualizarParcela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: atualizarParcela,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcelas'] }),
  });
}

export function useExcluirParcela() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: excluirParcela,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcelas'] }),
  });
}
