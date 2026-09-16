#!/usr/bin/env python3
"""OpenCode token-widget collector.

Reads local OpenCode history (WAL-safe) + optional Go quota API,
writes:
  ../data/usage.json                    full data for web preview
  ../skin/@Resources/values.inc         Rainmeter variables
  ../skin/@Resources/heatmap.png        pre-rendered activity heatmap
"""
from typing import Any
import datetime as dt
import json
import os
import sqlite3
import tempfile
import urllib.request

# ---------- config ----------
DISPLAY_NAME = "Benedict"
HANDLE = "@ThePeacemaker"
PLAN_LABEL = "Go"
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE, "data")
RES_DIR = os.path.join(BASE, "skin", "OpenCodeWidget", "@Resources")
DB_PATH = os.environ.get("OPENCODE_DB", r"C:\Users\bened\.local\share\opencode\opencode.db")
AUTH_PATH = os.environ.get("OPENCODE_AUTH", r"C:\Users\bened\.local\share\opencode\auth.json")
GO_USAGE_URL = "https://opencode.ai/zen/go/v1/usage"
# calendar-year heatmap (Jan -> Dec): grid starts on the Monday of the week
# containing Jan 1, one column per week, days past Dec 31 are not rendered
YEAR = dt.date.today().year
YEAR_START = dt.date(YEAR, 1, 1)
YEAR_END = dt.date(YEAR, 12, 31)
GRID_MONDAY = YEAR_START - dt.timedelta(days=YEAR_START.weekday())
GRID_COLS = ((YEAR_END - GRID_MONDAY).days + 1 + 6) // 7


def fmt_tokens(n):
    n = int(n or 0)
    if n >= 1e9:
        return f"{n / 1e9:.1f}bn"
    if n >= 1e6:
        return f"{n / 1e6:.1f}m"
    if n >= 1e3:
        return f"{n / 1e3:.0f}k"
    return str(n)


def load_db():
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    src = sqlite3.connect(DB_PATH)
    dst = sqlite3.connect(tmp.name)
    with dst:
        src.backup(dst)
    src.close()
    dst.close()
    con = sqlite3.connect(tmp.name)
    con.row_factory = sqlite3.Row
    return con, tmp.name


def streaks(days):
    """days: sorted list of date. longest + current (ending today/yesterday)."""
    if not days:
        return 0, 0
    longest = cur = 1
    for a, b in zip(days, days[1:]):
        if (b - a).days == 1:
            cur += 1
            longest = max(longest, cur)
        else:
            cur = 1
    today = dt.date.today()
    anchor = today if today in days else (today - dt.timedelta(days=1) if (today - dt.timedelta(days=1)) in days else None)
    current = 0
    if anchor is not None:
        s = set(days)
        d = anchor
        while d in s:
            current += 1
            d -= dt.timedelta(days=1)
    return current, longest


def top_models(cur):
    cur.execute("SELECT model, SUM(tokens_input+tokens_output+tokens_reasoning"
                "+tokens_cache_read+tokens_cache_write) t, COUNT(*) n FROM session GROUP BY model")
    rows = {}
    for r in cur.fetchall():
        mid, prov = "unknown", "?"
        if r["model"]:
            try:
                m = json.loads(r["model"])
                mid = m.get("id", "?")
                prov = m.get("providerID", "?")
            except Exception:
                pass
        key = f"{prov}/{mid}"
        agg = rows.setdefault(key, {"model": key, "tokens": 0, "sessions": 0})
        agg["tokens"] += r["t"] or 0
        agg["sessions"] += r["n"]
    rows = sorted(rows.values(), key=lambda x: -x["tokens"])
    return rows


def fetch_github(login="The-Peacemaker"):
    """Real GitHub contribution calendar via local Copilot OAuth token.

    Token is read from auth.json and only ever sent to api.github.com.
    Returns daily {date: contributions} + totals, or ok=False on any failure.
    """
    try:
        with open(AUTH_PATH) as f:
            tok = json.load(f).get("github-copilot", {}).get("access", "")
        if not tok:
            return {"ok": False, "error": "no github-copilot token in auth.json"}
        q = {"query": ("query($u:String!){user(login:$u){contributionsCollection{"
                       "totalCommitContributions totalPullRequestContributions "
                       "totalRepositoriesWithContributedCommits contributionCalendar{"
                       "totalContributions weeks{contributionDays{date contributionCount}}}}}}"),
             "variables": {"u": login}}
        req = urllib.request.Request(
            "https://api.github.com/graphql", data=json.dumps(q).encode(),
            headers={"Authorization": "Bearer " + tok, "User-Agent": "token-widget/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            cc = json.load(r)["data"]["user"]["contributionsCollection"]
        daily = {}
        for w in cc["contributionCalendar"]["weeks"]:
            for dd in w["contributionDays"]:
                daily[dd["date"]] = dd["contributionCount"]
        return {"ok": True, "daily": daily,
                "total": cc["contributionCalendar"]["totalContributions"],
                "commits": cc["totalCommitContributions"],
                "prs": cc["totalPullRequestContributions"],
                "repos": cc["totalRepositoriesWithContributedCommits"]}
    except Exception as e:
        return {"ok": False, "error": type(e).__name__}


def go_quota():
    try:
        with open(AUTH_PATH) as f:
            key = json.load(f).get("opencode-go", {}).get("key", "")
        if not key:
            return {"ok": False, "error": "no opencode-go key in auth.json"}
        req = urllib.request.Request(GO_USAGE_URL, headers={
            "Authorization": "Bearer " + key, "Accept": "application/json",
            "User-Agent": "token-widget/0.1"})
        with urllib.request.urlopen(req, timeout=3) as r:
            return {"ok": True, "windows": json.loads(r.read().decode()).get("usage", {})}
    except Exception as e:
        return {"ok": False, "error": type(e).__name__}


BLUE = ("#282828", "#458588", "#8ec07c", "#fabd2f", "#fe8019")
GREEN = ("#282828", "#505a23", "#98971a", "#b8bb26", "#dce682")


def render_heatmap(daily, path, palette=BLUE):
    from PIL import Image, ImageDraw, ImageFont
    start = GRID_MONDAY
    cells = {}
    for i in range(GRID_COLS * 7):
        d = start + dt.timedelta(days=i)
        if d > YEAR_END:
            continue
        iso = f"{d.year}-{d.month:02d}-{d.day:02d}"
        cells[d] = daily.get(iso, 0)
    months = {}
    for m in range(1, 13):
        first = dt.date(YEAR, m, 1)
        months[first.strftime("%b").upper()] = (first - start).days // 7
    vals = sorted(v for v in cells.values() if v > 0)
    if vals:
        q = lambda p: vals[min(len(vals) - 1, int(p * len(vals)))]
        t1, t2, t3 = q(0.25), q(0.55), q(0.85)
    else:
        t1 = t2 = t3 = 1
    EMPTY, L1, L2, L3, L4 = palette
    S, G, TOP = 12, 4, 22  # cell size, gap, label strip (2x for retina-crisp scaling)
    W, H = GRID_COLS * (S + G) - G, 7 * (S + G) - G + TOP
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("segoeui.ttf", 13)
    except Exception:
        font = ImageFont.load_default()
    for label, col in months.items():
        dr.text((col * (S + G), 0), label, fill="#7d8590", font=font)
    for i in range(GRID_COLS * 7):
        d = start + dt.timedelta(days=i)
        if d > YEAR_END:
            continue
        v = cells[d]
        c: str | Any = EMPTY if v <= 0 else L1 if v <= t1 else L2 if v <= t2 else L3 if v <= t3 else L4
        x, y = (i // 7) * (S + G), TOP + (i % 7) * (S + G)
        dr.rounded_rectangle([x, y, x + S, y + S], radius=3, fill=c)
    img.save(path)
    return start.isoformat(), YEAR_END.isoformat()


# ---- Rainmeter cell-grid contract (must match OpenCodeWidget.ini) ----
# Calendar-year grid: GRID_COLS Monday-start columns covering Jan 1..Dec 31;
# days past Dec 31 are not emitted. Included cells must be defined AFTER the
# background/panel (else they paint underneath it).
GRID_X, GRID_Y, CELL, GAP, LABEL_Y = 28, 172, 6, 2, 158
TOK_COLORS = [(40, 40, 40), (69, 133, 136), (142, 192, 124), (250, 189, 47), (254, 128, 25)]
GH_COLORS = [(40, 40, 40), (80, 85, 35), (152, 151, 26), (184, 187, 38), (220, 225, 130)]


def make_avatar():
    """Circular avatar.png from profile-image/git-dp.jpg (96px, idempotent)."""
    from PIL import Image, ImageDraw
    src = os.path.join(BASE, "profile-image", "git-dp.jpg")
    dst = os.path.join(RES_DIR, "avatar.png")
    try:
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            return True
        img = Image.open(src).convert("RGB")
        s = min(img.size)
        img = img.crop(((img.width - s) // 2, (img.height - s) // 2,
                        (img.width + s) // 2, (img.height + s) // 2)).resize((96, 96), Image.LANCZOS)
        mask = Image.new("L", (96, 96), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, 96, 96), fill=255)
        out = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        out.save(dst)
        return True
    except Exception:
        return False


def gen_cells_inc(per, gh_daily, path):
    """Pre-render all 52x7 cells for both views as Rainmeter meters.

    Each cell carries its own exact tooltip — this is what makes hover accurate.
    Coordinates follow the GRID_* contract above.
    """
    today = dt.date.today()
    start = GRID_MONDAY

    def qtier(vals):
        # equal-frequency quartiles so each lit tier gets ~25% of active days
        # (fixed thresholds collapse on skewed data and everything looks dark)
        vals = sorted(v for v in vals if v > 0)
        if not vals:
            return [1, 1, 1]
        q = lambda p: vals[min(len(vals) - 1, int(p * len(vals)))]
        return [q(0.25), q(0.50), q(0.75)]

    tT = qtier([v["tokens"] for v in per.values()])
    tG = qtier(list(gh_daily.values()))

    def tier(v, t):
        return 0 if v <= 0 else 1 if v <= t[0] else 2 if v <= t[1] else 3 if v <= t[2] else 4

    def iso(d):
        return f"{d.year}-{d.month:02d}-{d.day:02d}"

    def dstr(d):
        return f"{d:%a}, {d:%b} {d.day}, {d:%Y}"

    L = []
    idx = 0
    for m in range(1, 13):
        first = dt.date(YEAR, m, 1)
        col = (first - start).days // 7
        L.append(f"[MH{m:02d}]\nMeter=String\nX={GRID_X + col * (CELL + GAP)}\n"
                 f"Y={LABEL_Y}\nFontFace=Consolas\nFontSize=8\nFontColor=146,131,116\n"
                 f"AntiAlias=1\nText={first:%b}\n")
    for col in range(GRID_COLS):
        for row in range(7):
            d = start + dt.timedelta(days=col * 7 + row)
            if d > YEAR_END:
                continue
            x = GRID_X + col * (CELL + GAP)
            y = GRID_Y + row * (CELL + GAP)
            future = d > today
            e = per.get(iso(d))
            tok, ses = (0, 0) if (future or not e) else (e["tokens"], e["sessions"])
            n = 0 if future else gh_daily.get(iso(d), 0)
            tc = TOK_COLORS[tier(tok, tT)]
            gc = GH_COLORS[tier(n, tG)]
            if future:
                tt = f"{dstr(d)}#CRLF#--"
                tg = tt
            elif tok > 0:
                tt = (f"{dstr(d)}#CRLF#{fmt_tokens(tok)} tokens ({tok:,})"
                      f"#CRLF#{ses} session{'s' if ses != 1 else ''}")
            else:
                tt = f"{dstr(d)}#CRLF#No activity"
            tg = tt if future else (f"{dstr(d)}#CRLF#{n} contribution{'s' if n != 1 else ''}"
                                    if n > 0 else f"{dstr(d)}#CRLF#No activity")
            L.append(
                f"[CellT{idx}]\nMeter=Shape\nGroup=TokCells\nX={x}\nY={y}\n"
                f"Shape=Rectangle 0,0,{CELL},{CELL},2 | Fill Color {tc[0]},{tc[1]},{tc[2]},255 | StrokeWidth 0\n"
                f"ToolTipText={tt}\n")
            L.append(
                f"[CellG{idx}]\nMeter=Shape\nGroup=GhCells\nHidden=1\nX={x}\nY={y}\n"
                f"Shape=Rectangle 0,0,{CELL},{CELL},2 | Fill Color {gc[0]},{gc[1]},{gc[2]},255 | StrokeWidth 0\n"
                f"ToolTipText={tg}\n")
            idx += 1
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    return idx


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(RES_DIR, exist_ok=True)
    con, tmp = load_db()
    try:
        cur = con.cursor()
        cur.execute("SELECT SUM(tokens_input) i, SUM(tokens_output) o, SUM(tokens_reasoning) r,"
                    " SUM(tokens_cache_read) cr, SUM(tokens_cache_write) cw,"
                    " SUM(cost) c, COUNT(*) n FROM session")
        t = dict(cur.fetchone())
        lifetime = sum(v or 0 for v in (t["i"], t["o"], t["r"], t["cr"], t["cw"]))
        cur.execute("SELECT COUNT(*) n FROM message")
        messages = cur.fetchone()["n"]
        # ---- TRUE per-day ledger from messages (exact: msg total == session
        # total). Session time_created misattributes long-running sessions to
        # their start day, so daily/streak/today figures come from here. ----
        per = {}
        cur.execute("SELECT session_id, time_created, data FROM message")
        for r in cur.fetchall():
            try:
                m = json.loads(r["data"])
            except Exception:
                continue
            tk = m.get("tokens") or {}
            cc = tk.get("cache") or {}
            mt = ((tk.get("input") or 0) + (tk.get("output") or 0)
                  + (tk.get("reasoning") or 0) + (cc.get("read") or 0) + (cc.get("write") or 0))
            d = dt.datetime.fromtimestamp(r["time_created"] / 1000).date().isoformat()
            e = per.setdefault(d, {"tokens": 0, "cost": 0.0, "sessions": set(), "models": {}})
            e["tokens"] += mt
            e["sessions"].add(r["session_id"])
            mid = f"{m.get('providerID') or '?'}/{m.get('modelID') or '?'}"
            e["models"][mid] = e["models"].get(mid, 0) + mt
        # session cost, split pro-rata across the days each session was active
        cur.execute("SELECT id, date(time_created/1000,'unixepoch') d, cost FROM session")
        sesrows = cur.fetchall()
        cur.execute("SELECT session_id, time_created, data FROM message")
        sesdays = {}
        for r in cur.fetchall():
            try:
                tk = (json.loads(r["data"]).get("tokens") or {})
                cc = tk.get("cache") or {}
                mt = ((tk.get("input") or 0) + (tk.get("output") or 0)
                      + (tk.get("reasoning") or 0) + (cc.get("read") or 0) + (cc.get("write") or 0))
            except Exception:
                mt = 0
            dd = dt.datetime.fromtimestamp(r["time_created"] / 1000).date().isoformat()
            sd = sesdays.setdefault(r["session_id"], {})
            sd[dd] = sd.get(dd, 0) + mt
        for s in sesrows:
            c = s["cost"] or 0.0
            if not c:
                continue
            dd = sesdays.get(s["id"], {})
            tot = sum(dd.values())
            if tot > 0:
                for day, mt in dd.items():
                    if day in per:
                        per[day]["cost"] += c * mt / tot
            elif s["d"] in per:
                per[s["d"]]["cost"] += c
        for v in per.values():
            v["sessions"] = len(v["sessions"])
        days = sorted(dt.date.fromisoformat(d) for d, v in per.items() if v["tokens"] > 0)
        current_streak, longest_streak = streaks(days)
        peak_day = max(per.items(), key=lambda kv: kv[1]["tokens"]) if per else ("-", {"tokens": 0})
        today_s = dt.date.today().isoformat()
        today = per.get(today_s, {"tokens": 0, "cost": 0.0, "sessions": 0, "models": {}})
        last7 = sum(v["tokens"] for k, v in per.items()
                    if (dt.date.today() - dt.date.fromisoformat(k)).days < 7)
        last30 = sum(v["tokens"] for k, v in per.items()
                     if (dt.date.today() - dt.date.fromisoformat(k)).days < 30)
        models = top_models(cur)
        tmods = today.get("models", {})
        if tmods:
            today_model, today_model_tok = max(tmods.items(), key=lambda kv: kv[1])
        else:
            today_model, today_model_tok = None, 0
    finally:
        con.close()
        os.unlink(tmp)

    quota = go_quota()
    heat_start, heat_end = render_heatmap({k: v["tokens"] for k, v in per.items()},
                                          os.path.join(RES_DIR, "heatmap.png"), BLUE)
    render_heatmap({k: v["sessions"] for k, v in per.items()},
                   os.path.join(RES_DIR, "heatmap_gh.png"), GREEN)

    # session-based aggregates for the GitHub-style view
    year_sessions = sum(v["sessions"] for v in per.values())
    last7_sessions = sum(v["sessions"] for k, v in per.items()
                         if (dt.date.today() - dt.date.fromisoformat(k)).days < 7)
    peak_sessions = max((v["sessions"] for v in per.values()), default=0)

    # ---- real GitHub contributions (local token, api.github.com only) ----
    gh = fetch_github()
    if gh.get("ok"):
        gh_daily = {k: int(v) for k, v in gh["daily"].items()}
        gh_source = "api"
    else:  # offline fallback: session activity as contribution intensity
        gh_daily = {k: v["sessions"] for k, v in per.items()}
        gh_source = f"sessions_fallback ({gh.get('error')})"
    gh_days = sorted(dt.date.fromisoformat(d) for d, n in gh_daily.items() if n > 0)
    gh_current, gh_longest = streaks(gh_days)
    gh_today_n = gh_daily.get(today_s, 0)
    gh_7 = sum(n for k, n in gh_daily.items()
               if (dt.date.today() - dt.date.fromisoformat(k)).days < 7)
    gh_peak = max(gh_daily.values(), default=0)
    gh_total = sum(gh_daily.values())

    gen_cells_inc(per, gh_daily, os.path.join(RES_DIR, "cells.inc"))
    avatar_ok = make_avatar()

    data = {
        "profile": {"name": DISPLAY_NAME, "handle": HANDLE, "plan": PLAN_LABEL},
        "lifetimeTokens": lifetime, "lifetimeFmt": fmt_tokens(lifetime),
        "totalCost": round(t["c"] or 0.0, 2), "sessions": t["n"], "messages": messages,
        "activeDays": len(days),
        "peakDay": {"date": peak_day[0], "tokens": peak_day[1]["tokens"],
                    "fmt": fmt_tokens(peak_day[1]["tokens"])},
        "today": {"date": today_s, "tokens": today["tokens"], "fmt": fmt_tokens(today["tokens"]),
                  "sessions": today["sessions"]},
        "last7Tokens": last7, "last7Fmt": fmt_tokens(last7),
        "last30Tokens": last30, "last30Fmt": fmt_tokens(last30),
        "currentStreak": current_streak, "longestStreak": longest_streak,
        "github": {"source": gh_source, "daily": gh_daily,
                   "total": gh_total, "today": gh_today_n, "last7": gh_7,
                   "peak": gh_peak, "currentStreak": gh_current,
                   "longestStreak": gh_longest,
                   "commits": gh.get("commits"), "prs": gh.get("prs"),
                   "repos": gh.get("repos")},
        "topModel": models[0] if models else None,
        "models": models[:8],
        "daily": [{"date": k, "tokens": v["tokens"], "sessions": v["sessions"],
                   "cost": round(v["cost"], 2)} for k, v in sorted(per.items())],
        "heatmap": {"start": heat_start, "end": heat_end, "weeks": GRID_COLS},
        "goQuota": quota,
        "updatedAt": dt.datetime.now().isoformat(timespec="seconds"),
    }
    with open(os.path.join(DATA_DIR, "usage.json"), "w") as f:
        json.dump(data, f, indent=1)

    # publish to the React widget so its Refresh button picks up live data.
    # First path covers this repo layout (desktop/ is a subfolder of the repo
    # root); second covers the original workspace layout. Missing dirs skip
    # silently.
    for pub in (os.path.join(os.path.dirname(BASE), "public", "usage.json"),
                os.path.join(BASE, "what-i-want", "CodeTracker-Widget", "public", "usage.json")):
        try:
            with open(pub, "w") as f:
                json.dump(data, f, indent=1)
        except OSError:
            pass

    # single-file widget: embed data so it works by double-click (no server)
    tpl_path = os.path.join(BASE, "web", "template.html")
    if os.path.exists(tpl_path):
        with open(tpl_path, encoding="utf-8") as f:
            tpl = f.read()
        html = tpl.replace("/*__DATA__*/null", json.dumps(data),
                           1).replace("__NAME__", DISPLAY_NAME)
        with open(os.path.join(BASE, "widget.html"), "w", encoding="utf-8") as f:
            f.write(html)

    top = models[0]["model"] if models else "-"
    full = lambda n: f"{int(n or 0):,}"
    inc = f"""[Variables]
Name={DISPLAY_NAME}
Initial={DISPLAY_NAME[0]}
Handle={HANDLE}
Plan={PLAN_LABEL}
LifetimeTokens={fmt_tokens(lifetime)}
LifetimeFull={full(lifetime)}
PeakTokens={fmt_tokens(peak_day[1]['tokens'])}
PeakFull={full(peak_day[1]['tokens'])}
PeakDate={peak_day[0]}
TodayTokens={fmt_tokens(today['tokens'])}
TodayFull={full(today['tokens'])}
TodayDate={today_s}
TodaySessions={today['sessions']}
WeekTokens={fmt_tokens(last7)}
WeekFull={full(last7)}
GhToday={gh_today_n}
Gh7={gh_7}
GhPeak={gh_peak}
GhYear={gh_total}
GhStreak={gh_longest}
GhSource={gh_source}
CurrentStreak={current_streak}
LongestStreak={longest_streak}
ActiveDays={len(days)}
Sessions={t['n']}
TopModel={top}
TodayModel={today_model or top}
TodayModelFmt={fmt_tokens(today_model_tok) if today_model else (fmt_tokens(models[0]['tokens']) if models else '0')}
UpdatedAt={data['updatedAt']}
UpdatedTime={dt.datetime.now().strftime('%H:%M')}
TotalCost={(t['c'] or 0.0):.2f}
"""
    with open(os.path.join(RES_DIR, "values.inc"), "w") as f:
        f.write(inc)
    # single combined include (Rainmeter reliably loads one @Include;
    # a second @Include2 left the grid blank, so variables + cells ship together)
    with open(os.path.join(RES_DIR, "cells.inc"), encoding="utf-8") as f:
        cells = f.read()
    with open(os.path.join(RES_DIR, "data.inc"), "w", encoding="utf-8") as f:
        f.write(inc + "\n" + cells)
    print(f"lifetime={fmt_tokens(lifetime)} sessions={t['n']} days={len(days)} "
          f"streak={current_streak}/{longest_streak} quota_ok={quota.get('ok')}")


if __name__ == "__main__":
    main()
