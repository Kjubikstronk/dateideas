import { THEMES } from '../lib/themes'
import { useTheme } from '../lib/useTheme'

/**
 * Swatches take their colour from the theme they represent: `data-theme` on
 * the swatch itself scopes that palette to the element, so this component
 * never names a colour and cannot drift from theme.css.
 *
 * Renders nothing while only one theme is registered — one option is not a
 * choice, and an empty row of controls is worse than no row.
 */
export default function ThemePicker() {
  const { theme, setTheme } = useTheme()
  if (THEMES.length < 2) return null

  return (
    <div className="border-t-[3px] border-[var(--color-line)] pt-4">
      <p className="legend mb-2 text-[var(--color-text)]/60">look</p>
      <div className="flex gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            data-theme={t.id}
            onClick={() => setTheme(t.id)}
            aria-pressed={theme === t.id}
            aria-label={t.name}
            className={[
              'pixel-btn flex h-11 w-11 items-center justify-center p-0',
              theme === t.id ? 'pixel-btn-primary' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span
              aria-hidden="true"
              className="block h-5 w-5 border-2 border-[var(--color-line)] bg-[var(--color-hot)]"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
