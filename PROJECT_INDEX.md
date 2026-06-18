# Project Index: TVChat AI

A compact map of the repository — entry points, source modules, exports, and where
things live — so an agent can jump straight to the right file without reading the tree.
For *what the project is* and how to run it, see [README.md](README.md).

> Regenerate with `/sc:index-repo`. Keep in sync when adding/removing source modules.

## 📁 Project structure

```
tvchat-ai/
├── packages/
│   ├── tv-app/                 # React SPA → Tizen .wgt (Chromium M47, ES5 style)
│   │   ├── src/
│   │   │   ├── main.jsx            # bootstrap
│   │   │   ├── App.jsx             # root component
│   │   │   ├── context/AppContext.jsx
│   │   │   ├── hooks/              # useRelay, useClaudeAPI
│   │   │   ├── utils/              # token, storage, conversations
│   │   │   ├── screens/           # SetupScreen, ChatScreen, SettingsPanel
│   │   │   └── components/        # Sidebar, InputBar, MessageList
│   │   ├── tizen/config.xml       # Tizen widget manifest
│   │   ├── vite.config.js
│   │   └── .env.local.example
│   ├── companion/              # React SPA in phone browser (modern, no M47 burden)
│   │   ├── src/
│   │   │   ├── main.jsx            # bootstrap
│   │   │   ├── App.jsx             # URL parse + screen router
│   │   │   ├── hooks/useRelay.js
│   │   │   └── screens/           # SetupKeyScreen, ChatInputScreen, ConnectingScreen, ErrorScreen
│   │   ├── vite.config.js
│   │   ├── vercel.json
│   │   └── .env.local.example
│   └── relay/                  # stateless Node.js ws fanout
│       └── src/server.js          # the entire relay server
├── scripts/                    # generate-icon.js, package-tizen.js
├── docs/                       # README.md (index), tizen-sideload.md
├── DESIGN.md                   # full system design + WS protocol
├── CLAUDE.md                   # agent guidance + M47 constraints
└── tvchat-ai.code-workspace    # tizen folder listed first (build ordering)
```

## 🚀 Entry points

| Path | Role |
|------|------|
| `packages/relay/src/server.js` | Relay server. `npm run dev:relay` / `npm start -w packages/relay`. Node >=18. |
| `packages/tv-app/src/main.jsx` → `src/App.jsx` | TV SPA. Vite dev on :5173 (`host:true`). |
| `packages/companion/src/main.jsx` → `src/App.jsx` | Phone SPA. Vite dev on :5174 (`host:true`). |
| `scripts/package-tizen.js` | `build:tv` then stage `dist/` into `packages/tv-app/tizen/`. |
| `scripts/generate-icon.js` | Regenerate `packages/tv-app/public/icon.png`. |

## 📦 Core modules

### tv-app (`packages/tv-app/src/`) — Chromium M47 / ES5 style
| Module | Exports | Purpose |
|--------|---------|---------|
| `context/AppContext.jsx` | `AppProvider`, `useApp` | Single `useReducer` store; holds `MODELS` and `SYSTEM_PROMPT_PRESETS` constants. |
| `hooks/useRelay.js` | `useRelay(onMessage)` | WebSocket client to the relay. |
| `hooks/useClaudeAPI.js` | `useClaudeAPI()` | Calls `api.anthropic.com`; streams via `ReadableStream` with M47 non-streaming fallback; 60s hard timeout. |
| `utils/token.js` | `generateToken(length)` | 8-char session/pairing token. |
| `utils/storage.js` | `getApiKey`/`setApiKey`/`clearApiKey`, `getModel`/`setModel`, `getConversations`/`saveConversations`, `getSystemPrompt`/`setSystemPrompt`, `getActiveConversationId`/`setActiveConversationId` | localStorage persistence (keys prefixed `tvchat_`). |
| `utils/conversations.js` | `createConversation`, `addMessage`, `toApiMessages` | Conversation model + mapping to Claude API message shape. |
| `screens/` | `SetupScreen`, `ChatScreen`, `SettingsPanel` (default) | Pairing/QR, chat view, settings. |
| `components/` | `Sidebar`, `InputBar`, `MessageList` (default) | Chat UI pieces. |

### companion (`packages/companion/src/`) — modern runtime
| Module | Exports | Purpose |
|--------|---------|---------|
| `App.jsx` | `App` (default) | Parses `roomId` + `?ctx=setup\|chat` from URL; routes screens on relay status. |
| `hooks/useRelay.js` | `useRelay(roomId, onMessage)` | WebSocket client to the relay. |
| `screens/` | `SetupKeyScreen`, `ChatInputScreen`, `ConnectingScreen`, `ErrorScreen` (default) | API-key entry, chat keyboard, connecting/error states. |

### relay (`packages/relay/src/`)
| Module | Purpose |
|--------|---------|
| `server.js` | Entire stateless server: room-based fanout between TV and phone. Reads only `room`/`role` on `join`; never sees API key or chat content. Max 2 peers/room, 5 MB max message, 30s ping keepalive. |

## 🔧 Configuration

- **Root `package.json` scripts:** `dev:relay`, `dev:tv`, `dev:companion`, `build:tv`, `build:companion`, `generate:icon`, `package:tizen`. Private, workspaces `["packages/*"]`. No test/lint scripts.
- **Vite:** `packages/tv-app/vite.config.js` (with `@vitejs/plugin-legacy`, `chrome >= 47`), `packages/companion/vite.config.js`.
- **Tizen manifest:** `packages/tv-app/tizen/config.xml` (app id `tvchatai.app`, required_version 3.0, `<access origin="*">`, internet/network privileges).
- **Deploy:** `packages/companion/vercel.json`, `packages/companion/.vercel/project.json`.
- **Env vars** (Vite, baked at build time; see each package's `.env.local.example`):
  | Var | Used by | Purpose |
  |-----|---------|---------|
  | `VITE_RELAY_URL` | tv-app, companion | WebSocket relay endpoint |
  | `VITE_COMPANION_URL` | tv-app | Base URL for the pairing QR |
- **Workspace ordering:** `tvchat-ai.code-workspace` lists `packages/tv-app/tizen` **first** so the VS Code Tizen extension targets it. Do not reorder — "Build Signed Package" silently does nothing otherwise.

## 📚 Documentation

| Doc | Topic |
|-----|-------|
| [README.md](README.md) | Project overview & quick start |
| [docs/README.md](docs/README.md) | Documentation index hub |
| [DESIGN.md](DESIGN.md) | Full system design, data flow, WebSocket protocol (§5), CSS architecture (§10) |
| [CLAUDE.md](CLAUDE.md) | Agent guidance + Chromium M47 constraints for tv-app |
| [docs/tizen-sideload.md](docs/tizen-sideload.md) | Build, sign, and sideload the `.wgt` to a Samsung TV |

## 🔗 Dependencies

| Package | Runtime | Notes |
|---------|---------|-------|
| tv-app | `react`/`react-dom` 18, `qrcode.react`, `@noriginmedia/norigin-spatial-navigation` | Remote D-pad spatial navigation + QR pairing. |
| companion | `react`/`react-dom` 18 | — |
| relay | `ws` 8 | Node >=18. |

Build tooling (devDeps): `vite` 6, `@vitejs/plugin-legacy` (chrome>=47), `@vitejs/plugin-react`, `terser`.

## 📝 Quick start

```bash
npm install              # install all workspaces
npm run dev:relay        # relay on :3001 (GET /health → ok)
npm run dev:tv           # tv-app on Vite :5173 (host:true)
npm run dev:companion    # companion on Vite :5174 (host:true)

npm run build:tv         # → packages/tv-app/dist
npm run build:companion  # → packages/companion/dist
npm run package:tizen    # build tv-app + stage into packages/tv-app/tizen/
```

Sign/install the `.wgt` via the VS Code Tizen TV extension — see [docs/tizen-sideload.md](docs/tizen-sideload.md).

## Notes

- **No test runner, no linter** configured — don't go looking for one.
- **BYOK:** the TV calls `api.anthropic.com` directly from the browser; the relay never sees the API key or chat content.
- **tv-app only** must respect Chromium M47 limits (ES5 style, Flexbox-only CSS, feature-detected DOM APIs). Full rules in [CLAUDE.md](CLAUDE.md). `companion` and `relay` carry no M47 burden.
- Build artifacts (`.wgt`, signature files) are git-ignored — never commit them.
