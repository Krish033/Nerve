# Theme — See ui-design.md

The canonical design system has moved to `.agent/skills/ui-design.md`.

All frontend UI rules, color tokens, typography, spacing, component standards, and dark mode rules are documented there.

The previous "Industrial Matrix" aesthetic has been deprecated. Do not reference it.

## CSS Variable Notes
- Colors use `oklch` in `globals.css`
- `--primary` is the single accent; do not introduce additional accent colors
- Theme provider at `lib/providers/theme-provider.tsx` handles light/dark switching

## Zustand Theme Store (`useThemeStore`)
```typescript
interface ThemeState {
  accentColor: string;
  setAccentColor: (color: string) => void;
}
```

## Performance
- Memoize heavy list renders (`ChatList`, `LogStream`)
- Avoid `backdrop-blur` on large surfaces
