# Contributing to CodeTracker Widget

Thanks for stopping by — PRs, issues and ideas are all welcome.

## Ground rules

1. **Every number must be traceable to a real source.** No invented stats,
   no placeholder data in the default path. Mock data exists only as an
   offline fallback in the web app (`src/data/mockData.ts`) and must stay
   clearly labeled as such.
2. Keep the desktop skin compact (~470px side-widget) and the web app
   dependency-light.

## Dev setup

```sh
npm install
npm run dev      # web widget at http://localhost:3000
npm run lint     # tsc --noEmit, must pass
npm run build    # production build, must pass
```

Python side needs nothing beyond the standard library + Pillow:

```sh
python desktop/collector/collect_opencode.py
```

Point it at test data with `OPENCODE_DB` / `OPENCODE_AUTH` env vars —
never commit real credentials (`auth.json` stays local, always).

## Pull requests

- One logical change per PR, with a clear title (`feat:`, `fix:`, `docs:`).
- If you touch the collector, include before/after numbers proving no
  regression (message totals must still equal session totals exactly).
- If you touch the skin, attach a screenshot.
- CI runs `npm run lint` and `npm run build` — green before merge.

## Reporting bugs

Include: what you clicked, what you expected, what the widget showed, and
the relevant lines from `%APPDATA%\Rainmeter\Rainmeter.log` (desktop) or
the browser console (web).
