# Implementation Roadmap

Development phases for `@inkorange/pendu` — from proof of concept to published npm package.

---

## Phase 1: Core Algorithm Extraction

Extract the POC layout algorithm into a clean, testable TypeScript module. The core must have **zero DOM/React dependencies** — pure algorithm that can be consumed by the React layer or used standalone.

### Types (`src/types.ts`)

```typescript
// Internal type — consumer never sees this directly
export interface PenduImageData {
  width: number;
  height: number;
}

export interface FrameLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface LayoutOptions {
  gap?: number;          // default: 16
  minScale?: number;     // default: 0.45
  padding?: number;      // default: 10
  seed?: number;         // optional — randomized internally if omitted
  containerWidth?: number;
  containerHeight?: number;
}

export interface LayoutResult {
  frames: Array<PenduImageData & FrameLayout>;
  bounds: { width: number; height: number; minX: number; minY: number; maxX: number; maxY: number };
  stats: { placed: number; failed: number; avgScale: number };
}
```

### Layout Modes

The core algorithm must support three modes of operation:

1. **Full layout** — initial render or seed change. Place all frames using center-out growth.
2. **Incremental add** — place a single new frame into an existing layout using the scoring function. Existing frames stay in place; only minor neighbor adjustments allowed.
3. **Incremental remove** — remove a frame and run a local compaction pass. Pull nearby frames toward the gap; frames far from the removed frame don't move.

```typescript
// Full layout
computeLayout(images: PenduImageData[], options?: LayoutOptions): LayoutResult;

// Incremental updates
addToLayout(existing: LayoutResult, newImage: PenduImageData, options?: LayoutOptions): LayoutResult;
removeFromLayout(existing: LayoutResult, removeIndex: number, options?: LayoutOptions): LayoutResult;
```

### Tasks
- [ ] Define types in `src/types.ts`
- [ ] Create `src/layout.ts` — export `computeLayout` for full layout
- [ ] Implement `addToLayout` — score best position for new frame among existing placed frames
- [ ] Implement `removeFromLayout` — remove frame, run local compaction on neighbors
- [ ] Extract helpers into `src/utils.ts` (edge contact detection, candidate generation, scoring, compaction)
- [ ] Implement seeded PRNG for deterministic layouts (randomized if no seed provided)
- [ ] Ensure zero DOM/React dependencies in the core module

---

## Phase 2: React Component Wrapper

Build the `<Pendu>` compound component on top of the core algorithm.

### Compound Component Pattern

```tsx
import { Pendu } from '@inkorange/pendu';

// Static children
<Pendu gap={16}>
  <Pendu.Image src="/photo1.jpg" width={800} height={600} alt="Sunset" />
  <Pendu.Image src="/photo2.jpg" width={600} height={900} alt="Portrait" />
</Pendu>

// Optional: pass seed for deterministic layouts (randomized internally if omitted)
<Pendu gap={16} seed={42}>
  <Pendu.Image src="/photo1.jpg" width={800} height={600} />
</Pendu>

// Dynamic children — add/remove via standard React state
const [images, setImages] = useState(initialImages);

<Pendu gap={16}>
  {images.map(img => (
    <Pendu.Image key={img.id} src={img.src} width={img.width} height={img.height} />
  ))}
</Pendu>

// Add:    setImages(prev => [...prev, newImage])
// Remove: setImages(prev => prev.filter(img => img.id !== removeId))
```

### How it works internally

1. `<Pendu>` iterates children via `React.Children`, extracts `width`/`height` props from each `<Pendu.Image>`
2. Feeds dimensions into `computeLayout()` to produce frame positions
3. If no `seed` prop is provided, generates a random seed internally (stored in `useRef` so it persists across re-renders)
4. Clones each `<Pendu.Image>` child with computed `style` (absolute position, dimensions)
5. `<Pendu.Image>` renders an `<img>` tag inside its positioned wrapper

No data arrays, no hooks, no render functions exposed to the consumer — just nest `<Pendu.Image>` components and go.

### Internal Styling: CSS Modules + SCSS + CSS Variables

The component uses **CSS Modules with SCSS** for scoped, collision-free styles internally, and exposes **CSS custom properties** on the root element so consumers can theme without writing selectors or passing a className.

#### SCSS Module Structure

```
src/
├── styles/
│   ├── Pendu.module.scss        # Container styles
│   ├── PenduImage.module.scss   # Frame wrapper + img styles
│   └── _variables.scss          # Default CSS variable values + SCSS mixins
```

#### `_variables.scss` — Default Variable Definitions

```scss
// Default CSS custom property values
// Consumers override these on the .pendu root element or via inline style

$pendu-defaults: (
  --pendu-bg: transparent,
  --pendu-gap: 16px,
  --pendu-padding: 10px,
  --pendu-frame-radius: 0,
  --pendu-frame-shadow: none,
  --pendu-frame-border: none,
  --pendu-frame-overflow: visible,
  --pendu-transition-duration: 300ms,
  --pendu-transition-easing: ease-out,
);

@mixin pendu-defaults {
  @each $var, $value in $pendu-defaults {
    #{$var}: #{$value};
  }
}
```

#### `Pendu.module.scss` — Container

```scss
@use 'variables' as *;

.root {
  @include pendu-defaults;

  position: relative;
  background: var(--pendu-bg);
  padding: var(--pendu-padding);
}
```

#### `PenduImage.module.scss` — Frame Wrapper

```scss
.frame {
  position: absolute;
  border-radius: var(--pendu-frame-radius);
  box-shadow: var(--pendu-frame-shadow);
  border: var(--pendu-frame-border);
  overflow: var(--pendu-frame-overflow);
  transition: transform var(--pendu-transition-duration) var(--pendu-transition-easing),
              opacity var(--pendu-transition-duration) var(--pendu-transition-easing);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
```

#### How it works

1. CSS Modules compile `.root` / `.frame` into unique hashed class names (e.g., `_pendu_root_x3k2`) — no consumer class name collisions
2. CSS variables are set on the root `.pendu` element with defaults from `_variables.scss`
3. Consumers override variables via inline `style` prop or CSS targeting `.pendu` — **no className required**
4. Consumer's `className` prop is merged alongside the CSS Module class: `class="pendu _pendu_root_x3k2 my-gallery"`
5. The non-hashed `.pendu` and `.pendu-frame` class names are applied in addition to CSS Module classes for consumer CSS targeting

### FLIP Animation (built-in, zero dependencies)

When children change, the component animates frames from old positions to new positions using the FLIP technique:

1. **First** — `useLayoutEffect` captures current frame positions (from previous render) via `useRef`
2. **Last** — new layout is computed (incremental add/remove, not full recompute)
3. **Invert** — apply `transform: translate()` to move each frame back to its old visual position
4. **Play** — remove the transform with a CSS transition, animating to the new position

```typescript
// Entering frames: scale/fade in from 0
// Exiting frames: scale/fade out to 0
// Moving frames: translate from old position to new position via CSS transform
// All GPU-accelerated — no layout thrashing
```

The `<Pendu>` component decides which layout function to call by diffing the previous and current children keys:
- Keys added → `addToLayout()` + enter animation
- Keys removed → exit animation + `removeFromLayout()`
- Keys unchanged → no layout change (frames stay put)
- Multiple changes at once → batch into a single incremental update pass

### Performance internals
- Incremental layout — only computes positions for changed frames, not the entire gallery
- `React.memo` on `Pendu.Image` — unchanged frames skip re-rendering
- Stable `key` props for efficient React reconciliation during add/remove
- `transform: translate()` for animations — GPU-accelerated, no reflows
- Position cache in `useRef` — avoids `getBoundingClientRect()` on every frame

### Tasks

#### Component structure
- [ ] Create `src/index.ts` — barrel export: `export { Pendu } from './Pendu'` + exported types
- [ ] Create `src/Pendu.tsx` — container component with `'use client'` directive, reads children props, runs layout
- [ ] Create `src/PenduImage.tsx` — `Pendu.Image` sub-component, renders `<img>` with computed positioning
- [ ] Attach `PenduImage` as `Pendu.Image` static property
- [ ] Absolute-positioned div layout for frame placement
- [ ] `React.Children` traversal to extract dimensions from `<Pendu.Image>` props
- [ ] Random seed generation via `useRef` when no `seed` prop provided
- [ ] Container fills parent width via `ResizeObserver`, height auto-computed from layout bounds

#### Styling (CSS Modules + SCSS + CSS Variables)
- [ ] Create `src/styles/_variables.scss` — CSS variable defaults + SCSS mixin
- [ ] Create `src/styles/Pendu.module.scss` — container styles consuming CSS vars
- [ ] Create `src/styles/PenduImage.module.scss` — frame wrapper + img styles consuming CSS vars
- [ ] Apply CSS Module classes + static `.pendu` / `.pendu-frame` class names for consumer targeting
- [ ] Merge consumer `className` prop alongside CSS Module classes on root element
- [ ] Set CSS variable defaults on root element via `@include pendu-defaults`
- [ ] Sync `gap` / `animationDuration` props to corresponding CSS variables at render time
- [ ] Add `--pendu-skeleton-bg` CSS variable (default: `#e0e0e0`) for skeleton placeholder color

#### Skeleton loading
- [ ] `<Pendu.Image>` renders a skeleton placeholder matching frame dimensions while image loads
- [ ] Track load state via `onLoad` / `onError` on the `<img>` element
- [ ] Fade in the image over the skeleton when loaded
- [ ] Skeleton styled via CSS variable `--pendu-skeleton-bg`

#### Layout updates & animation
- [ ] Diff previous/current children keys to detect adds, removes, unchanged
- [ ] Call `addToLayout` / `removeFromLayout` for incremental updates (not full recompute)
- [ ] Implement FLIP animation via `useLayoutEffect` + `useRef` position cache
- [ ] Enter animation (scale/fade in) for new frames
- [ ] Exit animation (scale/fade out) for removed frames
- [ ] `animate` and `animationDuration` props (default: `true`, `300ms`)
- [ ] Animation driven by CSS vars (`--pendu-transition-duration`, `--pendu-transition-easing`)
- [ ] Respect `prefers-reduced-motion` — disable FLIP animations when user prefers reduced motion
- [ ] Add `@media (prefers-reduced-motion: reduce)` rule to SCSS that sets `transition: none`

#### Performance
- [ ] Wrap `Pendu.Image` in `React.memo`
- [ ] Handle container resizing via `ResizeObserver`
- [ ] Peer dependency on React 18+

---

## Phase 3: Testing & Demo

Validate the algorithm and component with tests and a visual demo. **Target: 90% code coverage minimum**, enforced in CI and pre-commit.

### Coverage Enforcement

Coverage threshold is configured in the test config and enforced at three levels:

1. **Pre-commit hook** — runs `npm test` (fails the commit if tests fail)
2. **CI (`ci.yml`)** — runs `npm run test:coverage` with `--coverageThreshold` (fails the build if below 90%)
3. **PR checks** — coverage report posted to PR via CI

```json
// jest.config.js (or vitest equivalent)
{
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  },
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/types.ts",
    "!src/styles/**"
  ]
}
```

### Test Plan by Module

#### `src/layout.ts` — Core Algorithm

The pure algorithm is the most critical and most testable module (no DOM, no React).

| Test | What it validates |
|------|-------------------|
| Empty input | `computeLayout([])` returns empty frames, zero bounds |
| Single frame | Placed at center, scale 1.0 |
| 2 frames | Adjacent with correct gap, no overlap |
| N frames (3–20) | All placed, no overlaps, all within bounds |
| All portrait | Handles uniform aspect ratio |
| All landscape | Handles uniform aspect ratio |
| Mixed aspect ratios | Layout accommodates both types |
| Deterministic (seeded) | Same seed + same input = identical output |
| Random (no seed) | Produces valid layout, different seeds produce different layouts |
| Min scale enforcement | No frame scaled below `minScale` |
| Gap enforcement | All adjacent frames separated by exactly `gap` pixels |
| Bounds accuracy | `bounds` output matches actual frame positions |
| Stats accuracy | `placed`, `failed`, `avgScale` reflect actual results |

#### `src/layout.ts` — Incremental Operations

| Test | What it validates |
|------|-------------------|
| `addToLayout` — single add | New frame placed without moving distant frames |
| `addToLayout` — position quality | New frame scores well (multi-edge contact, near center) |
| `addToLayout` — no overlaps | No frame-to-frame overlaps after add |
| `removeFromLayout` — single remove | Removed frame gone, neighbors compacted |
| `removeFromLayout` — stability | Frames far from removed frame don't move |
| `removeFromLayout` — no overlaps | No frame-to-frame overlaps after compaction |
| Add then remove | Round-trip produces valid layout |
| Multiple sequential adds | Layout remains valid after each add |
| Multiple sequential removes | Layout remains valid after each remove |

#### `src/utils.ts` — Helper Functions

| Test | What it validates |
|------|-------------------|
| `getEdgeContact` — no contact | Returns 0 contacts for distant frames |
| `getEdgeContact` — single edge | Detects adjacency on one edge |
| `getEdgeContact` — multi edge | Detects adjacency on 2+ edges (corner position) |
| `getEdgeContact` — contact length | Measures overlap length accurately |
| `scorePosition` — center bias | Closer positions score higher (distance penalty) |
| `scorePosition` — contact reward | More contacts = higher score |
| `generateCandidates` — output | Generates valid snap positions along all edges |
| `generateCandidates` — gap respect | All candidates maintain gap distance |
| PRNG — seeded | Same seed produces same sequence |
| PRNG — distribution | Output is reasonably uniform |

#### `src/Pendu.tsx` — Container Component (React Testing Library)

| Test | What it validates |
|------|-------------------|
| Renders children | `<Pendu.Image>` elements appear in DOM |
| Positions frames | Each frame has computed absolute position styles |
| Responds to add | Adding a child triggers layout update, new frame appears |
| Responds to remove | Removing a child triggers layout update, frame disappears |
| Gap prop | Changing `gap` recomputes layout with new spacing |
| Seed prop | Providing `seed` produces deterministic layout |
| No seed | Omitting `seed` still produces valid layout |
| className/style pass-through | Container receives custom className and style |
| Empty children | Renders empty container without error |
| Single child | Handles single `<Pendu.Image>` |

#### `src/PenduImage.tsx` — Image Component (React Testing Library)

| Test | What it validates |
|------|-------------------|
| Renders `<img>` | Outputs `<img>` with correct `src` and `alt` |
| Merges styles | Consumer `style` prop merges with computed position styles |
| className pass-through | Custom `className` applied to frame wrapper |
| onClick handler | Click event fires consumer's `onClick` callback |
| React.memo | Unchanged props don't trigger re-render (verify with render count) |

#### `src/Pendu.tsx` — FLIP Animation

| Test | What it validates |
|------|-------------------|
| Enter animation | New frames receive enter transition (opacity 0→1, scale) |
| Exit animation | Removed frames receive exit transition before unmount |
| Move animation | Repositioned frames animate via `transform: translate()` |
| `animate={false}` | Disables all transition animations |
| `animationDuration` | Custom duration applied to transitions |

### Test File Structure

```
src/
├── __tests__/
│   ├── layout.test.ts           # computeLayout, addToLayout, removeFromLayout
│   ├── utils.test.ts            # Scoring, edge contact, candidates, PRNG
│   ├── Pendu.test.tsx           # Container component rendering + layout behavior
│   ├── PenduImage.test.tsx      # Image component rendering + props
│   └── animation.test.tsx       # FLIP animation behavior
```

### Demo

Demo and test images are stored in `resources/demo/`. All are dark gray placeholder rectangles suitable for layout testing.

#### Image Reference Table

| File | Type | Width | Height | Aspect Ratio | Notes |
|------|------|------:|-------:|-------------:|-------|
| `landscape-1.jpg` | Landscape | 1200 | 800 | 3:2 | Standard photo ratio |
| `landscape-2.jpg` | Landscape | 1600 | 1000 | 16:10 | Widest landscape |
| `landscape-3.jpg` | Landscape | 1400 | 800 | 7:4 | Wide/cinematic |
| `landscape-4.jpg` | Landscape | 900 | 600 | 3:2 | Smallest landscape |
| `portrait-1.jpg` | Portrait | 800 | 1200 | 2:3 | Standard portrait |
| `portrait-2.jpg` | Square | 800 | 800 | 1:1 | Square — edge case for layout |
| `portrait-3.jpg` | Portrait | 1200 | 1800 | 2:3 | Tallest image |
| `portrait-4.jpg` | Portrait | 1200 | 1600 | 3:4 | Standard portrait |

- [ ] Interactive demo page (`demo/index.html` or Storybook)
- [ ] Frame count slider (as shown in POC screenshots)
- [ ] "New layout" button for re-randomizing
- [ ] Add/remove image buttons to demonstrate incremental layout + animation
- [ ] Display real images from `resources/demo/` in frames
- [ ] Show placement stats (placed count, cluster size, avg scale)

### Tasks
- [ ] Configure test framework with 90% coverage threshold (branches, functions, lines, statements)
- [ ] Write `layout.test.ts` — full layout tests (empty, single, N frames, deterministic, bounds, stats)
- [ ] Write `layout.test.ts` — incremental add/remove tests (stability, no overlaps, round-trip)
- [ ] Write `utils.test.ts` — edge contact, scoring, candidate generation, PRNG
- [ ] Write `Pendu.test.tsx` — component rendering, dynamic children, prop changes
- [ ] Write `PenduImage.test.tsx` — img output, style merging, className, onClick, memo
- [ ] Write `animation.test.tsx` — enter/exit/move transitions, animate prop, duration
- [ ] Add `test:coverage` script: `jest --coverage --watchAll=false`
- [ ] Verify 90% threshold passes before merging Phase 3

---

## Phase 4: npm Publish & CI

Package configuration, build pipeline, and publish workflow. Mirrors the pipeline from [docspark](https://github.com/inkorange/docspark).

### Pre-commit Hooks (Husky)

Husky pre-commit hook ensures code quality before any commit reaches the repo:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run TypeScript type checking
echo "🔍 Running TypeScript type checking..."
npx tsc --noEmit || {
  echo "❌ TypeScript errors found. Please fix them before committing."
  exit 1
}

# Run unit tests with coverage check
echo "🧪 Running unit tests..."
npm run test:coverage -- --passWithNoTests || {
  echo "❌ Tests failed or coverage below 90%. Please fix before committing."
  exit 1
}

echo "✅ All checks passed!"
```

### Changesets

Versioning managed via `@changesets/cli`. Config:

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.2/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### GitHub Actions

Three workflows, same pattern as docspark:

**1. CI (`ci.yml`)** — runs on every push/PR to `main`:
- Install dependencies
- TypeScript type check (`npx tsc --noEmit`)
- Run tests with coverage (`npm run test:coverage`) — **fails if below 90%**
- Build package

**2. Release (`release.yml`)** — runs on push to `main`:
- Uses `changesets/action@v1` to create a version PR
- PR title: `"VERSIONCHANGE - Pendu Release"`
- Runs `npm run version` (changeset version)

**3. Publish (`publish.yml`)** — manual trigger via `workflow_dispatch`:
- Optional git tag input for publishing specific releases
- Builds the package
- Runs `npm run release` (changeset publish)
- Creates a GitHub Release with the version tag
- Requires `NPM_TOKEN` secret in repo settings

### package.json Scripts

```json
{
  "scripts": {
    "build": "tsup",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --watchAll=false --coverageThreshold='{\"global\":{\"branches\":90,\"functions\":90,\"lines\":90,\"statements\":90}}'",
    "typecheck": "tsc --noEmit",
    "changeset": "changeset",
    "changeset:add": "changeset add",
    "version": "changeset version",
    "release": "npm run build && changeset publish",
    "size": "size-limit",
    "prepublishOnly": "npm run build",
    "prepare": "husky"
  }
}
```

### Tasks

#### Package setup
- [ ] Initialize `package.json` — name: `@inkorange/pendu`, license: MIT, version: `0.1.0`
- [ ] Configure `tsconfig.json` — strict, React 18+, declaration files
- [ ] Set up bundler (tsup or Rollup) for ESM + CJS output to `dist/`
- [ ] Configure bundler to compile SCSS → CSS and bundle CSS Modules (hashed class names in production)
- [ ] Install `sass` as devDependency for SCSS compilation
- [ ] Ensure compiled CSS is included in `dist/` and importable by consumers
- [ ] Configure `exports`, `main`, `module`, `types`, `style` fields in package.json
- [ ] Add `files` whitelist — ship `dist/` only (exclude `resources/`, `demo/`, `src/`)
- [ ] Add `peerDependencies`: `react` >= 18, `react-dom` >= 18

#### Pre-commit hooks
- [ ] Install husky (`npm i -D husky`)
- [ ] Add `"prepare": "husky"` script
- [ ] Create `.husky/pre-commit` — runs `tsc --noEmit` + `npm test`

#### Changesets
- [ ] Install `@changesets/cli` (`npm i -D @changesets/cli`)
- [ ] Initialize changesets (`npx changeset init`)
- [ ] Configure `.changeset/config.json` — public access, base branch `main`
- [ ] Add changeset scripts to package.json

#### GitHub Actions
- [ ] Create `.github/workflows/ci.yml` — typecheck + test + build on push/PR
- [ ] Create `.github/workflows/release.yml` — changesets version PR on push to `main`
- [ ] Create `.github/workflows/publish.yml` — manual workflow_dispatch to npm publish
- [ ] Add `NPM_TOKEN` secret to GitHub repo settings

#### Bundle size enforcement
- [ ] Install `size-limit` (`npm i -D size-limit @size-limit/preset-small-lib`)
- [ ] Configure 20KB gzipped threshold in package.json or `.size-limit.json`
- [ ] Add `size` script to package.json: `"size": "size-limit"`
- [ ] Run `size-limit` in CI alongside tests

#### Documentation
- [ ] Add `README.md` for npm (derive from PROJECT.md — usage examples, props, installation)
- [ ] Semantic versioning — start at `0.1.0`

---

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Bundler | **tsup** — esbuild-based, zero-config ESM + CJS + declarations |
| Test framework | **Jest** — matches docspark setup, battle-tested |
| Demo hosting | TBD — not blocking for v0.1.0 |
| Bundle size | **< 20KB gzipped** — enforced via `size-limit` in CI |
