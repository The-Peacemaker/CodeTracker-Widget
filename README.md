# ⚡ CodeTracker Widget

Developer-activity widget that surfaces your **real OpenCode** usage and
**real GitHub** contributions — as a desktop nightly-widget and as a web
widget.

## Two widgets, one dataset

| Piece       | Where                                                    | What it is                                 |
| ----------- | -------------------------------------------------------- | ------------------------------------------ |
| **Web app** | root of this repo (`src/`, `package.json`)               | Liquid-glass React widget (tokens + GitHub views, heatmaps, hover details) |
| **Desktop** | [`desktop/`](desktop/README.md)                          | Native Rainmeter homescreen widget         |
| **Data**    | [`desktop/collector/`](desktop/collector/)               | Python collector → `usage.json` + skin files |

## Web app

Wired to your **real** OpenCode history (not mock) via `src/data/realData.ts`
which re-fetches `public/usage.json`.

```sh
npm install
npm run dev      # http://localhost:3000
npm run build   # production build in dist/
```

- Tokens view: tokens/day, sessions, current + longest streaks, peak day, top model
- GitHub view: real contribution calendar via GitHub GraphQL
- Refresh button re-loads the data from `public/usage.json`
- Falls back to mock data when the file is missing (offline demo)

## Desktop widget

Native Rainmeter skin — glass card with Tokens/GitHub tabs, 4 stat cards,
a 52-week heatmap, and a footer with the active model + last sync time.
Click **⟳** to re-run the collector and refresh live data.

Detailed setup, paths and environment variables:
**[`desktop/README.md`](desktop/README.md)**

## Data pipeline

```
opencode.db ──┐
              ├─► desktop/collector/collect_opencode.py ─► usage.json
github API ───┘        │                                   └─► web widget
                       └─► skin files (values.inc, cells.inc, heatmaps)
```

The collector reads a WAL-safe snapshot of your OpenCode SQLite database
and the GitHub contribution calendar (via a local Copilot OAuth token that
is **only** ever sent to `api.github.com`). Run it with:

```sh
python desktop/collector/collect_opencode.py
```

## License

MIT