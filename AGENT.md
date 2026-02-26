# AGENT.md — Cerebro Life Dashboard

## Stack
React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + Sass

## Architecture
- **Tailwind** → layout only (flex, positioning, spacing, responsive)
- **Design system** → all semantic visuals (colors, typography, elevation, borders, opacity)
- Design system lives in `src/design-system/`

## Design System Files

| File | Purpose |
|---|---|
| `_fonts.scss` | Font family mixin. Change `$font-family-primary` to swap everywhere. |
| `_colors.scss` | CSS custom properties for all colors. Sass `hue-color($n)` and `hue-color-log($n)` functions (0=alert, 100=calm). |
| `_typography.scss` | Mixins: `heading-lg`, `heading-md`, `heading-sm`, `body-primary`, `body-secondary`, `label-emphasis`, `label-primary`, `label-secondary`, `data($size)` |
| `_elevation.scss` | Opacity, blur, shadow, glow tokens. Mixins: `blur-surface`, `blur-overlay` |
| `_borders.scss` | Border color/radius/width tokens. Mixins: `border-surface`, `border-alert`, `border-warning` |
| `_components.scss` | Composition mixins: `surface($variant)`, `ribbon`, `pill($position, $status)`, `panel` |
| `canvas.ts` | Raw values + functions for `<canvas>` rendering: `stressColor()`, `hue()`, `hueLog()`, `canvasColors` |

## Layers

Three visual layers, each with its own opacity/shadow/blur tier:

- **Base** — flat background (`--bg-base`), orbital chart canvas
- **Surface** — translucent panels (Focus panel, Timeline ribbon)
- **Overlay** — floating elements (pills, future dynamic island)

## Token Naming Convention

`property-layer-intensity`

Intensities: **emphasis → primary → secondary → tertiary**

Examples:
- `--opacity-surface-primary` (standard panel transparency)
- `--shadow-overlay-emphasis` (prominent floating shadow)
- `--border-alert` (status-colored border)

## Styling a New Component

**For CSS-rendered components** — use design system mixins + CSS vars:
```scss
.my-panel {
  @include panel;                    // composition mixin
  color: var(--text-primary);        // token reference
}

.my-pill {
  @include pill('overlay', 'alert'); // position + status params
}

.my-pill-inline {
  @include pill('inline');           // embedded variant
}
```

**For canvas-rendered components** — import from `design-system/canvas`:
```ts
import { canvasColors, stressColor, hue, hueLog } from '@/design-system';
ctx.fillStyle = stressColor(daysAway);
ctx.strokeStyle = hue(45, 0.3); // hue value 45, alpha 0.3
```

## Status System

| Token | Hex | Condition |
|---|---|---|
| `--status-alert` | `#e85d35` | ≤3 days |
| `--status-warning` | `#e8a735` | ≤7 days |
| `--status-primary` | `#2ecc71` | 7-30 days |
| `--status-secondary` | `#1a8a4a` | 30+ days |

## Category Colors

| Category | Emphasis | Primary | Secondary |
|---|---|---|---|
| Travel | `#00e5ff` | `#0097a7` | `#004d5a` |
| Personal | `#ce93d8` | `#8e4a9e` | `#4a2558` |
| Project | `#cfd8dc` | `#78909c` | `#37474f` |
| Admin | `#90a4ae` | `#546e7a` | `#263238` |

## Pill Component

Single component, behavior driven by `position` param:
- `pill('overlay')` → floating notification, capsule radius, shadow, blur
- `pill('inline')` → embedded bar (gantt), subtle radius, no shadow, no blur

## Key Rules

1. Never use Tailwind for colors, shadows, borders, or typography — use design system tokens
2. Tailwind is only for: `flex`, `grid`, `absolute`, `relative`, `gap-*`, `w-*`, `h-*`, `p-*`, `m-*`, `overflow-*`, `rounded-*` (layout radius only)
3. Canvas components cannot read CSS vars — use `canvas.ts` exports
4. All surfaces must include `-webkit-backdrop-filter` alongside `backdrop-filter`
5. Font swap: change `$font-family-primary` in `_fonts.scss`, everything updates