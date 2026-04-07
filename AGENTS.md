## Development Workflow

This project uses a structured Claude + Codex collaboration loop. All participants must follow this workflow.

### Roles

- **Claude:** planning, code review, committing
- **Codex:** implementation, execution summary

### Parallelism

Both Claude and Codex should maximize use of parallel agents whenever tasks are independent. Do not execute sequentially what can be done concurrently — spawn multiple agents in parallel for exploration, implementation, or review sub-tasks where there are no dependencies between them.

### Loop

```
Claude → PLAN.md → Codex → SUMMARY.md → Claude → REVIEW.md → Codex (fix) → Claude (verify) → commit
```

### Step-by-step

1. **Claude writes `PLAN.md`** to the project root before any implementation begins.
   - Must include: context, goal, file-level change list, verification steps.
   - Describe **intent and constraints**, not implementation details. Do not paste code snippets into the plan — let Codex decide how to implement. Overly prescriptive plans cause Codex to copy-paste rather than reason.

2. **Codex implements** according to `PLAN.md`, then writes `SUMMARY.md` to the project root.
   - `SUMMARY.md` must cover: what was done, what was verified, any blockers or deviations from the plan.

3. **Claude reviews** the implementation against `PLAN.md` and `SUMMARY.md`, then writes `REVIEW.md` to the project root.
   - `REVIEW.md` must include: verdict (LGTM / issues found), what Codex did well, and each issue with file + line reference and a concrete fix.

4. **If issues exist:** Codex reads `REVIEW.md` and fixes all items. Return to step 3.

5. **If LGTM:** Claude verifies the final state, deletes `PLAN.md`, `REVIEW.md`, and `SUMMARY.md`, then creates a conventional commit.

### Commit convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(scope):` new feature
- `fix(scope):` bug fix
- `chore:` tooling, config, dependencies
- `docs:` documentation only

Do not commit intermediate files (`PLAN.md`, `REVIEW.md`, `SUMMARY.md`).

---

## Project Overview

This project is a mobile app for quantitative strategy research and paper trading.  
It is built with **React Native** for the frontend and **Python + FastAPI** for the backend.

The app does **not** support real trading or brokerage integration.  
Its main goal is to help users understand quantitative strategies, monitor market signals, simulate trades, and review performance.

## Core Features

- **Home Dashboard**  
  Shows strategy highlights, recent signals, and paper trading performance.

- **Market Page**  
  Displays watchlists, stock details, price charts, technical indicators, and strategy signal markers.

- **Strategy Center**  
  Provides strategy descriptions, use cases, parameter settings, and backtest results.

- **Paper Trading**  
  Allows users to simulate buy/sell actions with virtual capital, and track positions, returns, and trading history.

## Scope Boundaries

- No real-money trading
- No live brokerage account connection
- No automatic order execution
- No personalized financial advice

---

## Tech Stack

### Frontend

- **Framework:** React Native + Expo (managed workflow)
- **Navigation:** Expo Router (file-based)
- **UI / Styling:** NativeWind (Tailwind CSS syntax for React Native)
  - Do NOT use plain `StyleSheet.create` for new UI work
  - Do NOT introduce other component libraries (e.g. Tamagui, NativeBase, Expo UI)
- **i18n:** i18next + react-i18next
  - Supported languages: Simplified Chinese (`zh-CN`) and English (`en`)
  - Default language: follows device locale, fallback to `en` if unsupported
  - All user-facing strings must go through i18next — no hardcoded UI text
- **Package manager:** pnpm

### Backend

- **Framework:** Python + FastAPI (async)
- **Database:** PostgreSQL, launched via `docker-compose.yml`
- **ORM:** SQLAlchemy (async) + Alembic for migrations
- **Market data:** akshare (A-share focused, free, no token required)
- **Package manager:** uv

---

## UI Design Guidelines

**Target:** Dark modern financial style — similar to Robinhood / Trade Republic. Professional but clean, not Bloomberg-dense.

### Color Palette

| Role | Value | Usage |
|------|-------|-------|
| Background | `#0F0F14` | Page / screen base (deep blue-black, not pure black) |
| Surface | `#1A1A24` | Cards, rows, modals |
| Text primary | `#FFFFFF` | Core numbers, titles |
| Text secondary | `#8B8B9E` | Stock names, codes, labels |
| Divider | `rgba(255,255,255,0.08)` | Row separators, 1px |
| Up / positive | `#FF4D4D` | Price up, positive change (A-share convention: red) |
| Down / negative | `#00C48C` | Price down, negative change (A-share convention: green) |
| Neutral / flat | `#8B8B9E` | Zero change, unavailable |
| Accent | `#5E6AD2` | Buttons, active tab, highlights, refresh indicator |

### Typography

- **Prices and percentages:** tabular figures (`font-variant-numeric: tabular-nums`) so columns align
- **Core price:** large, white, visually dominant
- **Change %:** medium, colored (red/green), always prefixed with `+` or `-`
- **Stock name / code:** small, `#8B8B9E`, visually recessive

### Layout

- Full-bleed lists — no heavy card borders or large border-radius
- Row separators: single `1px` line at `rgba(255,255,255,0.08)`, not full cards
- Prices right-aligned, stock info left-aligned
- On press: row background lightens slightly (do NOT darken)

### Interactive Elements

- Primary button: `#5E6AD2`, rounded (`rounded-full` for icon buttons, `rounded-xl` for text buttons)
- Avoid: pastel colors, warm accent colors, heavy shadows, large rounded white cards, excessive whitespace

### Color Conventions (A-share standard)

- Up / positive: Red (`#FF4D4D`)
- Down / negative: Green (`#00C48C`)
- Flat / neutral: Gray (`#8B8B9E`)

---

## Market Scope

- **Target market:** China A-shares only (Shanghai + Shenzhen)
- **Stock symbol format:** 6-digit numeric codes (e.g. `600519`, `000001`)
- **Currency:** CNY (¥)
- **Trading hours:** CST (UTC+8), 09:30–11:30 and 13:00–15:00 on trading days