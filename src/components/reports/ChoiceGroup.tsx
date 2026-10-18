'use client'

type Base = { legend?: string; hint?: string; srOnlyLegend?: boolean; columns?: 2 | 3 }
type Props =
  | (Base & { options: Record<string, string>; multiple: true; value: string[]; onChange: (v: string[]) => void; exclusive?: string[] })
  | (Base & { options: Record<string, string>; multiple?: false; value: string; onChange: (v: string) => void; exclusive?: never })

// Large tap targets for checkbox / radio choices. Rendered as a <fieldset> so a screen reader announces the question.
// The selected state shows a filled control + heavier border (see .chip in globals.css), never colour alone.
export default function ChoiceGroup(props: Props) {
  const { options, columns = 2, legend, hint, srOnlyLegend } = props
  const selected = props.multiple ? props.value : [props.value]

  const toggle = (key: string) => {
    if (!props.multiple) return props.onChange(props.value === key ? '' : key)
    const { value, onChange, exclusive = [] } = props
    if (value.includes(key)) return onChange(value.filter((k) => k !== key))
    // Exclusive options (like "No immediate danger") clear the others, and vice versa.
    if (exclusive.includes(key)) return onChange([key])
    onChange([...value.filter((k) => !exclusive.includes(k)), key])
  }

  return (
    <fieldset className="min-w-0">
      {legend && <legend className={srOnlyLegend ? 'sr-only' : 'label'}>{legend}</legend>}
      {hint && <p className="hint mb-2 mt-[-4px]">{hint}</p>}
      <div className={`grid gap-2.5 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {Object.entries(options).map(([key, label]) => {
          const on = selected.includes(key)
          return (
            <label key={key} className="chip">
              <input type={props.multiple ? 'checkbox' : 'radio'} name={props.multiple ? undefined : legend || 'choice'} checked={on} onChange={() => toggle(key)} />
              <span>{label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
