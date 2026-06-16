# clautv-ai — System Design

## 1. System Overview

Three deployable units, zero accounts required:

```
┌───────────────────────────────────────────────────────────┐
│                  Samsung Tizen TV                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           tv-app  (React, .wgt package)              │  │
│  │  • Chat UI          • D-pad navigation               │  │
│  │  • QR display       • localStorage persistence       │  │
│  └───────────────────────┬─────────────────────────────┘  │
└──────────────────────────│────────────────────────────────┘
                           │ HTTPS (direct, no proxy)
                           ▼
              ┌────────────────────────┐
              │   api.anthropic.com    │
              │   Claude Messages API  │
              └────────────────────────┘

  WebSocket (wss://)        WebSocket (wss://)
TV ◄───────────────────────────────────────────► Phone

              ┌────────────────────────┐
              │   relay  (Node.js/ws)  │
              │   • Room-based fanout  │
              │   • Stateless          │
              │   • Deploy: Render.com │
              └────────────────────────┘

┌─────────────────────────────────┐
│  Phone (any mobile browser)     │
│  ┌───────────────────────────┐  │
│  │  companion  (React SPA)   │  │
│  │  • API key entry          │  │
│  │  • Chat keyboard          │  │
│  │  • Image picker           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## 2. Repository Structure (Monorepo)

```
clautv-ai/
├── packages/
│   ├── tv-app/           # Tizen TV React app
│   ├── companion/        # Phone companion React SPA
│   └── relay/            # WebSocket relay server
├── package.json          # Workspace root (npm workspaces)
└── DESIGN.md
```

---

## 3. TV App — Component Tree

```
<App>
 ├── <AppProvider>           context: apiKey, model, sessions, relay state
 │
 ├── <SetupScreen>           shown when no apiKey in localStorage
 │    ├── <Logo>
 │    ├── <QRCode value={pairingUrl} />
 │    ├── <PairingStatus />  "Waiting for phone…" / "Connected" / "Key accepted"
 │    └── <ManualEntry />    fallback text input via on-screen keyboard
 │
 ├── <ChatScreen>            main screen once apiKey exists
 │    ├── <Sidebar>
 │    │    ├── <NewChatButton />
 │    │    └── <ConversationList>
 │    │         └── <ConversationItem /> ×N  (focusable)
 │    │
 │    ├── <ChatArea>
 │    │    ├── <MessageList>
 │    │    │    ├── <UserMessage>
 │    │    │    │    ├── <TextBlock />
 │    │    │    │    └── <ImageBlock />   (thumbnail)
 │    │    │    └── <AssistantMessage>
 │    │    │         ├── <StreamingText /> (token-by-token)
 │    │    │         └── <ThinkingDots />  (while streaming)
 │    │    └── <InputBar>
 │    │         ├── <ComposePreview />    live text from phone
 │    │         ├── <QRPairingBadge />   small QR + "Use phone keyboard"
 │    │         └── <SendButton />        remote OK = send
 │    │
 │    └── <TopBar>
 │         ├── <ModelBadge />            "Sonnet 4.6"
 │         └── <SettingsButton />
 │
 └── <SettingsPanel>         overlay, focus-trapped
      ├── <ModelSelector>    Haiku / Sonnet / Opus (radio-style)
      ├── <ResetKeyButton>
      └── <CloseButton>
```

### Screen State Machine

```
            ┌──────────────┐
     start  │              │  apiKey found in localStorage
  ──────────► SetupScreen  ├──────────────────────────────► ChatScreen
             │              │◄──────────────────────────────
             └──────────────┘       "Reset API Key" pressed
                   │
                   │ phone sends valid key via relay
                   ▼
              ChatScreen
```

---

## 4. Phone Companion — Screens

```
<CompanionApp>
 ├── <ConnectingScreen>      while WebSocket handshake in progress
 ├── <SetupKeyScreen>        ctx=setup  — API key entry
 │    ├── <PasswordInput />  shows/hides key
 │    └── <SendButton />
 ├── <ChatInputScreen>       ctx=chat   — keyboard for messages
 │    ├── <TextArea />       multiline, auto-grow
 │    ├── <ImagePickerButton />
 │    └── <SendButton />
 └── <ErrorScreen>           session expired or relay unreachable
```

**Companion URL pattern:**
```
https://companion.clautv.ai/{sessionToken}?ctx=setup|chat
```

---

## 5. WebSocket Message Protocol

All messages are UTF-8 JSON. The relay server never interprets payloads — it only reads the `room` and `role` fields in the `join` message.

### Phase 1 — Join Handshake (client → relay)
```json
{ "type": "join", "room": "a1b2c3d4", "role": "tv" }
{ "type": "join", "room": "a1b2c3d4", "role": "phone" }
```

### Phase 2 — Relay Events (relay → client)
```json
{ "type": "peer_joined" }
{ "type": "peer_left" }
{ "type": "error", "message": "room full" }
```

### Phase 3 — Application Messages (phone → TV, relayed)
```json
{ "type": "api_key",      "value": "sk-ant-api03-..." }
{ "type": "chat_message", "text": "What is the meaning of life?" }
{ "type": "image_message","text": "What's in this?", "base64": "...", "mimeType": "image/jpeg" }
{ "type": "input_preview","text": "What is the m" }
```

### Phase 4 — Acknowledgements (TV → phone, relayed)
```json
{ "type": "context",       "value": "setup" | "chat" }
{ "type": "key_accepted" }
{ "type": "key_rejected",  "error": "401 Unauthorized" }
{ "type": "message_queued" }
{ "type": "heartbeat" }
```

### Session Token
- Generated by TV app: 8 random alphanumeric characters
- Source: `crypto.getRandomValues(new Uint8Array(6))` → base36 encode  
- Fallback for M47 (no crypto API): `Math.random().toString(36).slice(2, 10)`
- New token generated each time QR is rendered (navigation to setup/chat)
- Relay removes room after 30 min of inactivity

---

## 6. Relay Server Design

**~50 lines of Node.js — no framework, no database.**

```
relay/
├── src/
│   └── server.js     # ws + http
├── package.json
└── render.yaml       # Render.com deploy config
```

**Core logic:**
```
rooms = Map<roomId → Map<role → WebSocket>>

on "join" message:
  add socket to rooms[room][role]
  if both tv + phone present: send "peer_joined" to each

on any other message:
  fanout to all other sockets in the room

on disconnect:
  remove from room, send "peer_left" to remaining peers
  if room empty: delete from map
```

**Limits:**
- Max 2 peers per room (1 TV, 1 phone)
- Max message size: 5 MB (for base64 images)
- Ping/pong keepalive every 30s

---

## 7. Data Models

### localStorage Schema (TV App)

| Key | Type | Description |
|-----|------|-------------|
| `clautv_api_key` | `string` | Anthropic API key, plaintext |
| `clautv_model` | `string` | Active model ID |
| `clautv_conversations` | `string` (JSON) | Array of `Conversation` objects |
| `clautv_active_id` | `string` | ID of currently open conversation |

**Conversation:**
```
{
  id:         string,           // crypto random or Math.random fallback
  title:      string,           // first 60 chars of first user message
  createdAt:  number,           // Date.now()
  messages:   Message[]
}
```

**Message:**
```
{
  role:      "user" | "assistant",
  content:   ContentBlock[],
  timestamp: number
}
```

**ContentBlock (mirrors Anthropic API):**
```
{ type: "text",  text: string }
{ type: "image", source: { type: "base64", media_type: string, data: string } }
```

**localStorage budget:** Max 20 conversations × ~200KB each = 4 MB. When cap is hit, prune oldest conversation automatically.

---

## 8. Claude API Integration

Direct browser → `api.anthropic.com/v1/messages` (CORS is supported).

**Request shape:**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 4096,
  "stream": true,
  "messages": [ ... ]
}
```

**Streaming:** Use `fetch` + `response.body.getReader()` (ReadableStream). Chromium M47 has limited ReadableStream support — implement a non-streaming fallback (set `stream: false`, wait for full response) that activates on M47 detection.

**M47 detection:**
```js
const supportsStreaming = typeof ReadableStream !== 'undefined' &&
  typeof Response.prototype.body !== 'undefined';
```

---

## 9. Spatial Navigation (D-pad)

Use `@noriginmedia/norigin-spatial-navigation`.

**Key mapping:**

| Remote Key | KeyCode | Action |
|------------|---------|--------|
| Up / Down / Left / Right | 38/40/37/39 | Move focus |
| OK / Enter | 13 | Activate focused element |
| Back | 10009 | Close panel / go back |
| Menu | — | Not used |

**Focus zones:**
- `Sidebar` (focusable list)
- `MessageList` (scrollable, focusable for copy)
- `InputBar` (always one item: QR badge or send button)
- `SettingsPanel` (focus-trapped when open)

---

## 10. CSS Architecture (Chromium M47 Compatible)

No CSS Grid. No CSS custom properties. Flexbox only.

```
Layout primitives:
  .flex-col  { display: flex; flex-direction: column; }
  .flex-row  { display: flex; flex-direction: row; }
  .flex-1    { flex: 1; }

TV-specific sizes:
  Base font:    28px
  Headings:     40px – 56px
  Line height:  1.6
  Focus ring:   outline: 4px solid #FFD700; outline-offset: 4px;

Color palette (hardcoded, no variables):
  Background:   #0a0a0a
  Surface:      #1a1a1a
  Surface2:     #2a2a2a
  Text:         #f0f0f0
  Accent:       #a855f7   (Claude purple)
  Focus:        #FFD700
  Error:        #ef4444
  Success:      #22c55e
```

---

## 11. Build Configuration

### tv-app (Tizen 3.0 / Chromium M47 target)

```json
// .browserslistrc
"Chrome >= 47"
```

```js
// babel.config.js
{
  presets: [["@babel/preset-env", { targets: "chrome 47", useBuiltIns: "usage", corejs: 3 }]],
  plugins: ["@babel/plugin-transform-runtime"]
}
```

**Polyfills required:** `Promise`, `fetch`, `Array.from`, `Object.assign`, `Symbol`

**Bundle target:** Single JS file under 3 MB (no dynamic imports on M47).

**Tizen packaging:**
```
tv-app/
├── tizen/
│   ├── config.xml          # <access origin="*" subdomains="true">
│   └── icon.png
└── build/ → copy into tizen/ after `npm run build`
```

### companion (modern browsers — no polyfill burden)

Vite + React, targets last 2 Chrome/Safari/Firefox versions.

### relay (Node.js 18+)

`ws` package only. No framework.

---

## 12. Deployment Plan

| Unit | Host | Cost |
|------|------|------|
| `tv-app` | Sideloaded `.wgt` on TV (or Samsung Content Manager) | Free |
| `companion` | Vercel / Netlify static | Free |
| `relay` | Render.com free tier (750 hrs/month) | Free |

**Environment variable the companion needs:**
```
VITE_RELAY_URL=wss://clautv-relay.onrender.com
```

**Environment variable the TV app needs** (baked at build time):
```
REACT_APP_RELAY_URL=wss://clautv-relay.onrender.com
REACT_APP_COMPANION_URL=https://companion.clautv.ai
```

---

## 13. Sequence Diagrams

### First-Time Setup Flow
```
TV App          Relay           Phone Companion     Anthropic
  │                │                   │                │
  │ generate token │                   │                │
  │ show QR        │                   │                │
  │                │                   │                │
  │──join(tv)─────►│                   │                │
  │                │                   │                │
  │    (user scans QR, opens companion URL)             │
  │                │                   │                │
  │                │◄──join(phone)─────│                │
  │◄──peer_joined──┤                   │                │
  │──context(setup)►──────────────────►│                │
  │                │                   │                │
  │    (user types API key on phone, taps Send)         │
  │                │                   │                │
  │◄──api_key─────────────────────────►│                │
  │                │                   │                │
  │──POST /v1/messages (validate key)──────────────────►│
  │                │                   │                │
  │◄──200 OK───────────────────────────────────────────│
  │                │                   │                │
  │ store key in localStorage          │                │
  │──key_accepted──────────────────────►               │
  │ navigate to ChatScreen             │                │
```

### Chat Message Flow
```
TV App          Relay           Phone Companion     Anthropic
  │                │                   │                │
  │ show InputBar + QR badge           │                │
  │                │                   │                │
  │    (user scans QR, companion opens in chat ctx)     │
  │                │                   │                │
  │──context(chat)─────────────────────►               │
  │                │                   │                │
  │    (user types message)            │                │
  │◄──input_preview────────────────────│                │
  │ show preview in ComposeArea        │                │
  │                │                   │                │
  │    (user taps Send on phone)       │                │
  │◄──chat_message─────────────────────│                │
  │──message_queued────────────────────►               │
  │                │                   │                │
  │──stream POST /v1/messages──────────────────────────►│
  │◄──SSE chunks (or full response)────────────────────│
  │ render tokens as they arrive       │                │
```

---

## Next Step

Run `/sc:implement` to scaffold the monorepo, install dependencies, and generate initial source files for all three packages.
