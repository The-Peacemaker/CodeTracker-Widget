# CodeTracker Widget — Desktop (Rainmeter)

Native Rainmeter homescreen widget showing your **real** OpenCode usage
(tokens, sessions, streaks, spend) and **real** GitHub contributions —
in a gruvbox-dark glass card.

![widget](../assets/widget.png)

## What's inside

```
desktop/
├── README.md                  this file
├── Start-Widget.bat           launch the web widget as a chromeless app
├── collector/
│   └── collect_opencode.py    reads OpenCode DB + GitHub API, writes
│                              usage.json + all skin data files
├── data/
│   └── usage.json             latest snapshot of your real stats
├── profile-image/
│   └── git-dp.jpg             avatar source used by the skin
└── skin/
    └── OpenCodeWidget/
        ├── OpenCodeWidget.ini the Rainmeter skin
        └── @Resources/        generated files (see below)
```

## Features

- **Tokens / GitHub tabs** — one click swaps the whole widget: stat cards,
  heatmap, legend and title all follow the active view
- **Jan–Dec heatmap** — a full calendar-year grid (53 Monday-start columns)
  with per-cell hover tooltips showing exact tokens, sessions or
  contributions for that day
- **Click any stat card to copy** its exact value to the clipboard
- **Footer with live spend** — today's top model plus total session cost,
  hover for the all-time leader
- **One-click refresh** — the ⟳ button re-runs the collector and reloads
  live data (button dims while collecting)
- **Gruvbox-dark theme** — warm background, yellow accents, blue→orange
  token ramp and green GitHub ramp

## Install

1. Install [Rainmeter](https://www.rainmeter.net/).
2. Copy `skin/OpenCodeWidget` into `Documents\Rainmeter\Skins\`.
3. Right-click the Rainmeter tray icon → Skins → Refresh all, then
   activate **OpenCodeWidget**.
4. Drag it anywhere; right-click → Settings for opacity, position,
   always-on-top.

## Refresh the data

Click **⟳** in the widget, or run the collector by hand:

```sh
python collector/collect_opencode.py
```

### How the collector works

1. Takes a WAL-safe snapshot copy of your OpenCode SQLite database
   (the live DB is never locked).
2. Rebuilds the **true per-day ledger from the message table** — every
   message's token usage lands on the day it actually happened (verified:
   message totals equal session totals to the exact token). Session costs
   are split pro-rata across the days each session was active.
3. Queries the GitHub contribution calendar via the GraphQL API using a
   local Copilot OAuth token — sent **only** to `api.github.com`.
4. Writes `data/usage.json`, the skin variables + 736 heatmap cell meters
   (`@Resources/data.inc`), heatmap PNGs and the avatar.

### Configuration

| Variable      | Default                                 | Purpose                        |
| ------------- | --------------------------------------- | ------------------------------ |
| `OPENCODE_DB` | `~/.local/share/opencode/opencode.db`  | OpenCode SQLite database       |
| `OPENCODE_AUTH` | `~/.local/share/opencode/auth.json`  | Copilot OAuth token (GitHub)   |

**Never commit your `auth.json`.** The web app never reads it.

## Generated files

Everything under `skin/OpenCodeWidget/@Resources/` except
`refresh_icon.png` is produced by the collector — re-run it any time to
regenerate. They are committed so the skin works out of the box.
