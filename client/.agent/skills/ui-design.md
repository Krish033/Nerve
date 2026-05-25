# UI Design System — Nurve Frontend

This is the permanent source of truth for all frontend UI decisions. Every new page, component, and edit MUST follow these rules. Do not deviate without explicit instruction.

---

## Design Philosophy

Inspired by: **Vercel, Stripe, Linear, GitHub, AWS Console, Google Cloud Console**

- Minimal, calm, and professional
- Flat surfaces — no heavy gradients, no glassmorphism abuse
- Strong visual hierarchy through typography and spacing, not decoration
- Neutral palette with a single accent color
- Data-heavy pages must remain readable at all times
- No visual noise: remove scanline overlays, glow effects, crypto-scam aesthetics
- No thematic naming: use plain English (not "Operation Matrix", "Deploy", "Vectors")

---

## Color System

### Tokens (CSS variables in `globals.css`)
All colors use `oklch` for consistent lightness/chroma.

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(0.99 0 0)` | `oklch(0.10 0 0)` |
| `--foreground` | `oklch(0.13 0 0)` | `oklch(0.97 0 0)` |
| `--card` | `oklch(1 0 0)` | `oklch(0.13 0 0)` |
| `--border` | `oklch(0.91 0 0)` | `oklch(0.22 0 0)` |
| `--muted` | `oklch(0.96 0 0)` | `oklch(0.18 0 0)` |
| `--muted-foreground` | `oklch(0.50 0 0)` | `oklch(0.60 0 0)` |
| `--primary` | `oklch(0.18 0 0)` | `oklch(0.97 0 0)` |
| `--destructive` | red | red |

### Semantic Status Colors
Use ONLY for state indication, not decoration:
- **Success**: `emerald-500 / emerald-700`
- **Warning**: `amber-500 / amber-700`
- **Error**: `red-500 / red-700`
- **Info**: `blue-500 / blue-700`
- **Neutral**: `muted / muted-foreground`

### Rules
- One accent color only — do not introduce purple, indigo, pink, etc. as accent colors
- Never use `primary/60`, `primary/10` for random decoration
- Never hardcode hex or rgb values — use CSS tokens or Tailwind's semantic classes
- Avoid oversaturated colors in dark mode

---

## Typography

### Scale
| Role | Class |
|---|---|
| Page title | `text-xl font-semibold tracking-tight` |
| Section title | `text-sm font-semibold` |
| Body | `text-sm` |
| Caption / metadata | `text-xs text-muted-foreground` |
| Monospace data | `font-mono tabular-nums` |

### Rules
- No `uppercase tracking-widest font-black` for body content — reserved for special labels only
- No `text-4xl font-black uppercase` page titles
- No random font sizes like `text-[10px]`, `text-[11px]` — use the scale above
- No `tracking-[0.3em]` everywhere — only where intentional
- `font-black` is for emphasis only, not default text

---

## Spacing System

Use Tailwind's 4px base spacing scale consistently:

| Purpose | Value |
|---|---|
| Component internal padding | `p-4` or `p-5` |
| Card padding | `p-5` |
| Section gaps | `gap-4` or `gap-6` |
| Stack spacing | `space-y-4` or `space-y-6` |
| Page-level spacing | `space-y-6` |
| Inline icon gap | `gap-2` or `gap-2.5` |
| Tight inline gap | `gap-1.5` |

- No `p-8`, `p-12`, `mb-12` random values
- No `space-y-8` unless truly needed for section separation
- Consistent `px-4 py-3` for rows, `px-5 py-4` for card headers

---

## Layout

### Page Structure
- Fixed sidebar (`w-14`) on the left
- Optional secondary sidebar (`w-56`) for sub-navigation
- Navbar: `h-14`, sticky top, `border-b border-border bg-background/95`
- Main content: `max-w-5xl mx-auto` with `p-6 md:p-8`
- Breadcrumbs: simple slash-separated, `text-sm`, directly above page content

### Grid
- Dashboard stat rows: `grid grid-cols-2 sm:grid-cols-4 gap-4`
- Two-column layout: `grid lg:grid-cols-2 gap-4`
- Three-column with sidebar: `grid lg:grid-cols-3 gap-6` (main = `lg:col-span-2`)

---

## Component Rules

### Card
- Base: `rounded-xl border border-border bg-card`
- Header padding: `p-5`
- Content padding: `p-5 pt-0`
- No `shadow-sm` by default — flat surface
- Use `SectionCard` for content sections with optional title/actions header

### Button
| Variant | Usage |
|---|---|
| `default` | Primary action |
| `outline` | Secondary action |
| `ghost` | Tertiary/icon buttons |
| `destructive` | Dangerous actions only |
| `secondary` | Toggle states |

- Sizes: `xs` (h-7), `sm` (h-8), `default` (h-9), `lg` (h-10), `icon` (h-9 w-9)
- No pill buttons (`rounded-full`) except for badges
- No `font-black uppercase tracking-widest` on buttons
- Destructive text buttons: `text-destructive hover:bg-destructive/10`

### Input / TextInput
- Height: `h-9` everywhere
- Border: `border-border`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring`
- Placeholder: `text-muted-foreground/50`
- No hardcoded `border-indigo-500` focus colors

### Select
```tsx
className="h-9 rounded-md border border-border bg-background text-sm px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Checkbox / Radio
- `h-4 w-4 rounded border border-border`
- Checked: `bg-foreground border-foreground text-background`

---

## Shared Components

Always use these — never rebuild inline:

| Component | File | Usage |
|---|---|---|
| `PageHeader` | `components/shared/PageHeader.tsx` | Top of every page |
| `SectionCard` | `components/shared/SectionCard.tsx` | Content sections |
| `StatusBadge` | `components/shared/StatusBadge.tsx` | Status indicators |
| `EmptyState` | `components/shared/EmptyState.tsx` | Empty list/table states |
| `Skeleton` / `SkeletonCard` / `SkeletonTable` | `components/shared/LoadingSkeleton.tsx` | Loading states |

---

## Tables

- Outer: `rounded-xl border border-border overflow-hidden`
- Header row: `bg-muted/40 border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground`
- Data rows: `px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-accent/30 transition-colors`
- Empty state: use `EmptyState` component centered inside table
- Sticky header: `sticky top-0 z-10`
- No zebra striping with saturated colors

---

## Forms

- All inputs `h-9` with consistent border and focus ring
- Labels: `text-sm font-medium text-foreground`
- Error messages: `text-xs text-destructive mt-1`
- Spacing between fields: `space-y-4`
- Submit button: `Button` default variant, `h-9` or `h-10` for primary forms
- No inline label/value pairs with bold italic colored text

---

## Sidebar

### Primary (Icon rail)
- Width: **`w-12`** — narrower than before, no brand logo (moved to navbar)
- Padding: `py-3 px-1`
- Items: `h-8 w-8 rounded-md`
- Active: `bg-accent text-foreground` + left `h-3.5 w-0.5 bg-foreground rounded-r-full` indicator
- Inactive: `text-muted-foreground hover:bg-accent hover:text-foreground`
- Icon size: `h-4 w-4`
- Tooltip: `bg-popover border border-border text-xs font-medium rounded-md shadow-md`
- **Contains only primary workspace destinations** — no utilities (search, notifications, logout, profile, settings)
- No brand logo — identity lives in the Navbar
- No `rounded-[2px]`, glassmorphism floating modes

### Secondary (Sub-navigation)
- Width: `w-56`
- Section label: `text-xs font-semibold text-muted-foreground uppercase tracking-wider`
- Item: `text-sm rounded-md py-1.5 px-2`
- Active: `bg-accent text-foreground font-medium`
- Separator: `h-px bg-border my-2`

---

## Navbar

### Spec
- Height: **`h-11`** — deliberately thin and dense
- `bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-[100]`
- Spans **full width above the sidebar** — not inside the sidebar/content column

### Layout zones
| Zone | Content |
|---|---|
| Left (`flex-1`) | Brand name `font-semibold` + `/`-separated breadcrumb |
| Center (hidden on mobile) | Search trigger button `h-7 px-3 border border-border bg-muted/30` + `⌘K` hint |
| Right (`flex-1 justify-end`) | Tasks · GitHub · Notifications bell · divider · Avatar |

### Right-side utility icons
- Size: `h-7 w-7` icon buttons
- Style: `rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors`
- Active: `bg-accent text-foreground`
- Badge: `h-3.5 w-3.5 bg-foreground text-background text-[9px] font-bold rounded-full ring-1 ring-background`
- Divider before avatar: `w-px h-4 bg-border`

### Notifications panel (dropdown from navbar)
- Opens as floating `rounded-xl bg-popover border border-border shadow-lg`
- Max height `480px` with internal scroll
- Unread indicator: `w-0.5 h-6 bg-primary` left edge bar
- Footer: "View all" link to `/notifications`

### User menu (dropdown from avatar)
- Width `w-52`, identity header (name + email), nav items, sign out at bottom
- Sign out: `text-muted-foreground hover:text-destructive hover:bg-destructive/5`

### Rules
- Path display: `text-sm`, last segment `font-medium text-foreground`, others `text-muted-foreground`
- Use `segmentLabel()` map — no raw URL segment display
- No "Node Path", "Access Level", "Query Matrix" labels
- No scanline overlays or glow effects
- Never use `h-14` or taller — the navbar must be unobtrusive

---

## Breadcrumbs

- Style: inline, `text-sm`, slash (`/`) separators
- Home: icon-only `<Home h-3.5 w-3.5 />`
- Path segments: `text-muted-foreground hover:text-foreground`
- Current page: `text-foreground font-medium`
- Margin bottom: `mb-6`
- No pill badges, no glow shadows, no uppercase

---

## Dark Mode

- Background: near-black `oklch(0.10)`, not pure black
- Card: slightly lighter `oklch(0.13)`
- Border: `oklch(0.22)` — visible but subtle
- Text: near-white `oklch(0.97)`
- Muted text: `oklch(0.60)` — readable contrast
- No pure white cards on pure black background
- Status badges: use `/950` backgrounds with `/400` text in dark mode
- Test every new component in both light and dark mode

---

## Interactions & Animation

- Use `transition-colors` for color changes
- Use `transition-opacity` for fade in/out
- Hover states: `hover:bg-accent` (not custom colors)
- Active states: `active:scale-[0.98]` only on primary action buttons
- Loading spinners: `animate-spin rounded-full border-2 border-current border-t-transparent`
- Skeleton loaders: `animate-pulse bg-muted rounded-md`
- No layout shift during loading
- No janky `transition: none !important` overrides in global CSS
- No `group-hover:scale-110` on icon containers

---

## Accessibility

- All interactive elements must have visible focus rings
- Use `aria-label` on icon-only buttons
- Color must not be the only differentiator (use text + icon + color)
- Maintain minimum contrast ratio of 4.5:1 for body text
- Keyboard navigation must work for all modals and dropdowns

---

---

## Navigation Hierarchy

The navigation system has three layers. Each layer has a strict responsibility:

| Layer | Component | Responsibility |
|---|---|---|
| **L1 — Operational** | `Navbar` | Breadcrumb context, global search, utility actions (tasks, github, notifications, account) |
| **L2 — Workspace** | `Sidebar` | Primary workspace destinations only |
| **L3 — Contextual** | `SecondarySidebar` | Sub-pages within the current module |

### Rules
- Utilities (search, notifications, profile, settings, sign-out) live **only in Navbar**
- Primary destinations (Dashboard, Marketplace, etc.) live **only in Sidebar**
- Sub-pages live **only in SecondarySidebar**
- Nothing appears in two layers simultaneously
- Adding a new module: register in `lib/modules/registry.ts`, add to Sidebar if `inSidebar: true`, add submenu to SecondarySidebar if it has sub-pages

---

## Command Palette UX

- Trigger: `⌘K` globally, or search button in Navbar center
- Modal: `max-w-[560px]`, `rounded-xl`, `bg-card`, `shadow-xl`, `backdrop-blur-sm` backdrop
- Opens at `pt-[18vh]` — not dead center, slightly above center
- Input: `text-sm`, placeholder `"Search or jump to..."`
- Results grouped by category with `text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider` headers
- Selected item: `bg-accent` — hover syncs selectedIndex
- Supports both `href` navigation and `action` callback items
- Footer: `↑↓ navigate · ⏎ open · ESC close` keyboard hints
- No `rounded-[4px]`, no `font-black uppercase` category labels
- Animation: `animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150`

---

## Utility Placement Standards

| Utility | Location | Implementation |
|---|---|---|
| Global search | Navbar center + `⌘K` | `CommandPalette` component |
| Notifications | Navbar right | Inline panel from `NavIconBtn`, not a separate page trigger |
| Tasks | Navbar right | `NavIconLink` to `/tasks` |
| GitHub | Navbar right | `NavIconLink` to `/github` |
| Profile | Navbar right | Avatar button → `UserMenu` panel |
| Settings | Navbar right | Inside `UserMenu` panel |
| Sign out | Navbar right | Inside `UserMenu` panel |

Nothing from this table belongs in the sidebar icon rail.

---

## Enterprise Shell Architecture

### Layout composition order
```
<ProtectedRoute>
  <div flex-col h-screen>           ← root shell
    <Navbar />                       ← h-11, full width, z-[100]
    <div flex-1 flex-row>           ← body row
      <Sidebar />                    ← w-12, workspace nav only
      <div flex-1 flex-row>         ← content area
        <SecondarySidebar />         ← w-56, contextual
        <main overflow-y-auto />     ← page content
      </div>
    </div>
    <TodoList />                     ← floating overlay
    <CommandPalette />               ← fixed overlay, z-[200]
  </div>
</ProtectedRoute>
```

### Z-index stack
| Layer | z-index |
|---|---|
| Sidebar/SecondarySidebar | `z-50` |
| Navbar | `z-[100]` |
| Floating panels (NavPanel) | `z-[200]` |
| CommandPalette | `z-[200]` |
| Toast notifications | `z-[300]` |

### Performance rules for the shell
- Navbar re-renders only when `pathname` changes or panel state changes — never on scroll
- Sidebar is fully static (no subscriptions to unread counts or heavy stores)
- Notification data lives in `useNotifications` provider — panel reads it, doesn't fetch on open
- CommandPalette is unmounted when closed (`if (!isOpen) return null`)
- No `useEffect` polling in layout components

### Expandability
- New module: register in `lib/modules/registry.ts`
- New utility action: add `NavIconLink` or `NavIconBtn` in Navbar right zone only
- New workspace section: add to `Sidebar` NAV_ITEMS array
- New submenu: add key to `SecondarySidebar` submenus map
- Feature-gated modules: check `useFeatureFlags().isEnabled(flag)` before rendering

---

## Expandable Workspace Navigation Conventions

- Sidebar item groups separated by a subtle `h-px bg-border mx-2 my-1` divider
- Future: support for pinned workflows — items marked `pinned: true` in registry render above a separator
- Future: collapsible sidebar (width toggles `w-12` ↔ `w-48`) — label appears next to icon when expanded
- Future: workspace switcher in Navbar left (between brand and breadcrumb) — `w-32` dropdown
- Keyboard nav in sidebar: `Tab` cycles items, `Enter` navigates

---

## Anti-patterns — Never Do These

- `font-black uppercase tracking-widest` on body text or buttons
- `text-[9px]`, `text-[10px]`, `text-[11px]` font sizes
- Thematic names: "Matrix", "Vectors", "Deploy", "Neutralized", "Emergency Flush"
- `shadow-[0_0_8px_rgba(var(--primary),0.5)]` glow effects
- `bg-scanlines`, `clip-path` polygon shapes on inputs
- Random `primary/5`, `primary/10` backgrounds for decoration
- `rounded-[2px]` mixed with `rounded-xl` in the same component
- `backdrop-blur-2xl` glassmorphism sidebars
- Multiple accent colors in the same view
- `transition: none !important` in global CSS
- Hardcoded colors (`#fff`, `rgba(var(--primary), 0.5)`)
- `p-8 border-2 border-dashed rounded-3xl` dashed placeholder boxes
- Decorative dots, lines, or corner markers as visual flair
