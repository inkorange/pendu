# @inkorange/pendu

An organic gallery layout engine for React. Algorithmically arranges images of varying aspect ratios into tight, hand-curated collages with consistent spacing and no visible grid structure.

> **Status:** In Development — targeting npm publish

## Quick Start

```tsx
'use client';
import { Pendu } from '@inkorange/pendu';

<Pendu gap={16}>
  <Pendu.Image src="/photo1.jpg" width={800} height={600} alt="Sunset" />
  <Pendu.Image src="/photo2.jpg" width={600} height={900} alt="Portrait" />
  <Pendu.Image src="/photo3.jpg" width={1200} height={800} alt="Landscape" />
</Pendu>
```

## Features

- **Organic layouts** — No rows or columns; images arranged via center-out growth algorithm
- **Compound component API** — `<Pendu>` + `<Pendu.Image>`, zero config required
- **Dynamic add/remove** — Incremental layout updates with built-in FLIP animation
- **CSS variable theming** — Customize via `--pendu-*` variables, no className needed
- **Skeleton loading** — Placeholder frames while images load
- **Responsive** — Fills parent container, reflows on resize
- **TypeScript** — Full type safety with exported interfaces
- **SSR ready** — `'use client'` directive for Next.js App Router / RSC

## Documentation

- [PROJECT.md](./PROJECT.md) — Design goals, algorithm overview, component API reference
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) — Development roadmap and implementation phases

## License

MIT
