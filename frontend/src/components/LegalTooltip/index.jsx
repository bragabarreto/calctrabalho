import { Scale } from 'lucide-react';
import { REFERENCIAS_LEGAIS } from '../../data/referenciasLegais';

export default function LegalTooltip({ codigo }) {
  const ref = REFERENCIAS_LEGAIS[codigo];
  if (!ref) return null;

  return (
    <span className="relative inline-block group ml-1">
      <Scale className="inline w-3.5 h-3.5 text-secondary/60 group-hover:text-secondary cursor-help" />
      <span className="absolute z-50 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-64 p-2 bg-white border border-gray-200 rounded shadow-lg text-xs text-gray-700">
        <span className="font-semibold text-primary block">{ref.artigo}</span>
        <span className="mt-0.5 block">{ref.descricao}</span>
      </span>
    </span>
  );
}
