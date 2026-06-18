# TVChat AI

AI chat for Samsung Tizen TVs, powered by the Claude API. **BYOK** (bring your own key),
no accounts — your phone acts as the remote keyboard for the TV.

## How it works

1. The TV renders a QR code and joins a relay room.
2. You scan it with your phone to pair (the phone joins the same room).
3. On the phone you paste your Claude API key, then type messages.
4. The TV calls `api.anthropic.com` **directly** from the browser and streams the reply.

The relay only does blind room-based fanout between TV and phone — it never sees your API
key or chat content. See [DESIGN.md](DESIGN.md) for the full architecture and message
protocol.

## Packages

This is an npm-workspaces monorepo with three deployable units:

| Package | What it is |
|---------|------------|
| `packages/tv-app` | React SPA packaged as a Tizen `.wgt`. Targets **Chromium M47** (Tizen 3.0). |
| `packages/companion` | React SPA run in a phone browser: API-key entry + chat keyboard. |
| `packages/relay` | Stateless Node.js `ws` server doing room-based fanout between TV and phone. |

## Quick start

```bash
npm install              # install all workspaces

npm run dev:relay        # relay on :3001 (GET /health → ok)
npm run dev:tv           # tv-app on Vite :5173 (host:true)
npm run dev:companion    # companion on Vite :5174 (host:true)
```

The dev servers bind to `0.0.0.0` (`host:true`) so a phone on the **same WiFi** can reach
them. Open the tv-app, scan the QR with your phone, and pair.

## Build & deploy

```bash
npm run build:tv         # → packages/tv-app/dist
npm run build:companion  # → packages/companion/dist
npm run package:tizen    # builds tv-app and stages it into packages/tv-app/tizen/
```

Signing and installing the `.wgt` onto a TV is done through the **VS Code Tizen TV
extension** (not a CLI build). Full walkthrough: [docs/tizen-sideload.md](docs/tizen-sideload.md).
The companion and relay deploy as an ordinary static site and Node service respectively.

## Configuration

Build-time env vars (Vite, baked into the bundle). See each package's
`.env.local.example`:

| Var | Used by | Purpose |
|-----|---------|---------|
| `VITE_RELAY_URL` | tv-app, companion | WebSocket relay endpoint |
| `VITE_COMPANION_URL` | tv-app | Base URL used to build the pairing QR |

## Documentation

- **[docs/](docs/README.md)** — documentation index
- **[DESIGN.md](DESIGN.md)** — full system design, data flow, and WebSocket protocol
- **[CLAUDE.md](CLAUDE.md)** — guidance for Claude Code agents, incl. the Chromium M47
  constraints that apply when editing `tv-app`
- **[docs/tizen-sideload.md](docs/tizen-sideload.md)** — sideloading to a Samsung TV
