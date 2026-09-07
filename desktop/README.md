# ⚡ CodeTracker Widget — Desktop (Rainmeter)

Native Rainmeter desktop widget that shows your **real** OpenCode usage
(tokens, sessions, streaks) and **real** GitHub contribution activity
on your homescreen.

## What's inside

```
desktop/
├── README.md                        this file
├── Start-Widget.bat                 launch the web widget as a chromeless app
├── collector/
│   └── collect_opencode.py          reads OpenCode DB + GitHub GraphQL API,
│                                    writes usage.json + skin data files
├── data/
│   └── usage.json                   latest snapshot of your real stats
├── profile-image/
│   └── git-dp.jpg                   avatar source used by the skin
└── skin/
    └── OpenCodeWidget/
        ├── OpenCodeWidget.ini       the Rainmeter skin
        └── @Resources/
            ├── values.inc           skin variables (stats, labels)
            ├── cells.inc            pre-rendered heatmap cell meters
            ├── data.inc             values + cells bundled for one @Include
            ├── heatmap.png          token-activity heatmap (blue)
            ├── heatmap_gh.png       GitHub-activity heatmap (green)
            ├── refresh_icon.png     refresh button icon
            └── avatar.png           circular avatar (generated)
```

## Install the desktop widget

1. Install [Rainmeter](https://www.rainmeter.net/).
2. Copy `skin/OpenCodeWidget` into `Documents\Rainmeter\Skins\`.
3. Right-click the Rainmeter tray icon → *Skins* → refresh all, then activate
   **OpenCodeWidget**.
4. Right-click the widget → *Settings* to adjust opacity / position /
   always-on-top.

> Tip: the collector writes straight into `@Resources/`, so if you keep the
> skin folder and the collector in sync, hover any card for exact full
> numbers and the heatmap regenerates on every refresh.

## Refresh the data

Click the **⟳** button in the widget (or run the collector manually):

```
python collector/collect_opencode.py
```

This opens a WAL-safe copy of your OpenCode SQLite database, reads the
last 52 weeks of token activity, queries the GitHub contribution calendar
via your local Copilot OAuth token, and rewrites `@Resources/*` + `data/usage.json`.

### Configuration

The collector reads two paths; override them with environment variables
when your OpenCode data lives elsewhere:

| Variable        | Default                                      |
| --------------- | -------------------------------------------- |
| `OPENCODE_DB`   | `~/.local/share/opencode/opencode.db`        |
| `OPENCODE_AUTH` | `~/.local/share/opencode/auth.json`          |

Sensitive files (`auth.json`) are never read by the web app — the token is
only sent to `api.github.com`. **Never commit your `auth.json`.**

## Web widget

The React version of this widget lives at the repo root. The collector
publishes `public/usage.json`, and the web widget fetches it on refresh.
See the root `README.md` for the web app.