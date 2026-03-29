import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = '/api/salario-minimo';

async function listar() {
  const resp = await fetch(BASE);
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao listar salário mínimo');
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

export function useSalarioMinimo() {
  return useQuery({ queryKey: ['salario-minimo'], queryFn: listar });
}

export function useSalvarSalarioMinimo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salario-minimo'] }),
  });
}

export function useRemoverSalarioMinimo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: remover,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salario-minimo'] }),
  });
}
