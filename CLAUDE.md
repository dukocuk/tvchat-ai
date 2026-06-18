# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TVChat AI is AI chat for Samsung Tizen TVs powered by the Claude API. It is **BYOK** (bring
your own key) with no accounts. The phone acts as a remote keyboard. It is an npm-workspaces
monorepo with three deployable units:

- `packages/tv-app` — React SPA packaged as a Tizen `.wgt`. Targets **Chromium M47** (Tizen 3.0).
- `packages/companion` — React SPA run in a phone browser; used for API-key entry and as the chat keyboard.
- `packages/relay` — small stateless Node.js `ws` server doing room-based fanout between TV and phone.

## Commands

Run from the repo root (npm workspaces):

- `npm install` — install all workspaces
- `npm run dev:relay` — relay with `node --watch` (port 3001, `GET /health` returns `ok`)
- `npm run dev:tv` — tv-app dev server (Vite, port 5173, `host:true` so a phone on the same WiFi can reach it)
- `npm run dev:companion` — companion dev server (Vite, port 5174, `host:true`)
- `npm run build:tv` — production build → `packages/tv-app/dist`
- `npm run build:companion` — production build of companion
- `npm run generate:icon` — regenerate `packages/tv-app/public/icon.png`
- `npm run package:tizen` — runs `build:tv`, then copies `dist/` into `packages/tv-app/tizen/` (preserving `config.xml` and `icon.png`), ready for Tizen Studio / the VS Code Tizen extension

There is **no test runner and no linter configured** — don't go looking for one.

Signing and installing the `.wgt` on a TV is done through the **VS Code Tizen TV extension**
(not a CLI build). See `docs/tizen-sideload.md` for the full walkthrough.

## Architecture

**Data flow.** The tv-app calls `https://api.anthropic.com/v1/messages` **directly from the
browser** (header `anthropic-dangerous-direct-browser-access: true`). The relay never sees the
API key or chat content beyond blind fanout — it only reads `room` and `role` on the `join`
message.

**Pairing.** The TV generates an 8-char session token (`tv-app/src/utils/token.js`) and renders
a QR pointing at the companion URL `<companion>/<token>?ctx=setup|chat`. The TV joins the relay
as `role:tv`, the phone as `role:phone`; the relay emits `peer_joined` once both are present.
Limits: max 2 peers per room, 5 MB max message (for base64 images), 30s ping keepalive.

**WebSocket protocol.** UTF-8 JSON messages, fully documented in `DESIGN.md` §5. Key types:
`api_key`, `chat_message`, `image_message`, `input_preview` (phone→TV); `context`,
`key_accepted`, `key_rejected`, `message_queued` (TV→phone).

**TV app state.** `tv-app/src/context/AppContext.jsx` is a single `useReducer` store.
Persistence lives in `tv-app/src/utils/storage.js` (localStorage keys prefixed `tvchat_`).
The model list and system-prompt presets are
constants in `AppContext.jsx`.

**Streaming.** `tv-app/src/hooks/useClaudeAPI.js` streams the response via `ReadableStream` when
available and falls back to a non-streaming JSON request on M47 (feature-detected). It enforces
a 60-second hard timeout.

## Critical constraints

**Chromium M47 compatibility — tv-app only.** This is the single most important thing to respect
when editing the TV app:

- Source is written in ES5 style: `var` and function expressions, `Object.assign` instead of
  object spread, no optional chaining / nullish coalescing. **Match this style in tv-app.**
  Vite's `@vitejs/plugin-legacy` (`chrome >= 47`) plus terser handle transpilation and core-js polyfills.
- CSS: **Flexbox only — no CSS Grid and no CSS custom properties** (see `DESIGN.md` §10). Colors
  and sizes are hardcoded.
- DOM APIs that core-js does **not** polyfill (e.g. `AbortController`, `ReadableStream`) are
  feature-detected and guarded, never assumed present. Follow that pattern for new browser APIs.
- `companion` and `relay` run in modern environments and carry no M47 burden.

**Tizen workspace ordering.** The VS Code Tizen extension builds the **first folder** of the
workspace and needs `config.xml` at that folder's root. `tvchat-ai.code-workspace` deliberately
lists `packages/tv-app/tizen` first. **Do not reorder it** or "Build Signed Package" silently
does nothing.

**Build artifacts.** `.wgt` files and signature files (`author-signature.xml`, `signature1.xml`)
are git-ignored build outputs — never commit them.

**Sideload-only.** This app is sideloaded onto TVs in Developer Mode and is **not** published to
the Samsung store; ignore store-submission / production distributor-cert concerns.

**Env vars** (Vite, baked in at build time; defaults fall back to placeholder URLs in code):
- `VITE_RELAY_URL` — used by both tv-app and companion
- `VITE_COMPANION_URL` — used by tv-app to build the pairing QR URL

**Claude model IDs** are listed in `AppContext.jsx` (`claude-opus-4-8`, `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`). Keep these current when touching that file.

## Key files

- `packages/relay/src/server.js` — the entire relay server
- `packages/tv-app/src/context/AppContext.jsx` — reducer store, model list, prompt presets
- `packages/tv-app/src/hooks/useClaudeAPI.js` — Claude API call with streaming + M47 fallback
- `packages/tv-app/src/hooks/useRelay.js` and `packages/companion/src/hooks/useRelay.js` — WebSocket clients
- `packages/tv-app/tizen/config.xml` — Tizen widget manifest (privileges, `<access origin="*">`)
- `scripts/package-tizen.js` — the `build:tv` → `tizen/` packaging step
- `DESIGN.md` — full system design and message protocol; `docs/tizen-sideload.md` — sideload walkthrough
