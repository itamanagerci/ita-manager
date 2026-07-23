"use client";

interface CheckboxListeProps {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}

/**
 * Groupe de cases à cocher pour un champ String[] (vocabulaire fixe d'un
 * formulaire papier — EPI reçus, sujets abordés, causes identifiées...),
 * même primitive `<input type="checkbox">` que acces-individuels-form.tsx,
 * pas le composant shadcn Checkbox (réservé à l'écran de confirmation
 * Wave, Lot 8) — un simple groupe de cases n'a pas besoin d'un composant
 * Radix ici.
 */
export function CheckboxListe({ label, options, values, onChange }: CheckboxListeProps) {
  function toggle(option: string) {
    if (values.includes(option)) onChange(values.filter((v) => v !== option));
    else onChange([...values, option]);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label key={option} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={() => toggle(option)}
              className="mt-0.5 size-4 shrink-0 rounded border-input"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}
