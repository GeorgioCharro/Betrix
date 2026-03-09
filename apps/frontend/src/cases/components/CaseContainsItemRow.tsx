import type { CaseItem } from '../data/cases';

/** Parse "Weapon Skin Name (Condition)" into parts; fallback for simple names. */
function parseItemName(name: string): { condition: string; weapon: string; skinName: string } {
  const match = name.match(/^(.+?)\s+(.+)\s+\((\w+)\)$/);
  if (match) {
    const [, weapon, skinName, condition] = match;
    return { condition, weapon: weapon ?? '', skinName: skinName ?? name };
  }
  return { condition: '', weapon: '', skinName: name };
}

export interface CaseContainsItemRowProps {
  item: CaseItem;
}

export function CaseContainsItemRow({ item }: CaseContainsItemRowProps): JSX.Element {
  const { condition, weapon, skinName } = parseItemName(item.name);
  const hasCondition = condition.length > 0;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-slate-900 px-4 py-3">
      {/* Item image */}
      <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-neutral-500 text-xs">—</div>
        )}
      </div>

      {/* Text: [Condition] Weapon, Skin name, Value */}
      <div className="min-w-0 flex-1 space-y-0.5">
        {hasCondition && (
          <div className="text-xs text-neutral-400">
            [{condition}] {weapon}
          </div>
        )}
        {!hasCondition && weapon && (
          <div className="text-xs text-neutral-400">{weapon}</div>
        )}
        <div className="font-semibold text-white truncate">{skinName}</div>
        <div className="text-xs text-amber-400/90">
          💲 {item.value.toFixed(2)}
        </div>
      </div>

      {/* Chance percentage in a pill */}
      <div className="shrink-0 rounded-md bg-slate-700/80 px-3 py-1.5 text-sm font-medium text-white">
        {item.chance.toFixed(4)}%
      </div>
    </div>
  );
}
