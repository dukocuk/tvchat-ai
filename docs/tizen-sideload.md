# Sideloading to a Samsung Tizen TV

This guide covers how to build, sign, and install the `.wgt` package on a Samsung TV in Developer Mode.

## Prerequisites

- **VS Code** with the [Tizen TV extension](https://marketplace.visualstudio.com/items?itemName=tizen.vscode-tizentv) installed
- A **Samsung developer account** (developer.samsung.com)
- A **physical Samsung TV** with Developer Mode enabled (see below)
- Node.js and dependencies installed (`npm install` from the repo root)

### Enable Developer Mode on your TV

1. TV Settings → Support → About This TV
2. Tap the **model number** 5 times rapidly
3. Toggle **Developer Mode** ON
4. Enter your PC's local IP address when prompted
5. Reboot the TV

## Step 1 — Create an author certificate

Every developer needs their own author certificate tied to their Samsung account. The certificate stays on your machine and is never committed to the repo.

1. Open VS Code Command Palette (`Ctrl+Shift+P`)
2. Run **Tizen TV: Run Certificate Manager**
3. Create a new profile → choose **Samsung** certificate type
4. Sign in with your Samsung developer account when prompted
5. Complete the flow — this generates an `.author.p12` stored in `~/tizen-studio-data/keystore/`

The **distributor certificate** (required for signing) is bundled with the extension automatically — no extra steps.

## Step 2 — Register your TV's DUID

Your TV must be registered on your Samsung developer account before it will accept sideloaded apps.

1. Connect your TV to the same network as your PC
2. In VS Code Command Palette → **Tizen TV: Open Device Manager**
3. Add your TV's IP address and connect
4. Note the DUID shown in Device Manager
5. Log in to [developer.samsung.com](https://developer.samsung.com) → My page → Add device → enter the DUID

## Step 3 — Build the TV app

```bash
npm run package:tizen
```

This runs the production build and copies all output into `packages/tv-app/tizen/`, ready for packaging.

## Step 4 — Sign and package the .wgt

> **Important — workspace root:** the Tizen TV extension builds the **first
> folder of the workspace** (internally it uses `vscode.workspace.rootPath`) and
> needs `config.xml` directly at that folder's root. If the first folder has no
> `config.xml`, **Build Signed Package** silently does nothing. Use one of these:
>
> - **Recommended (keeps all packages visible):** File → *Open Workspace from
>   File…* → `clautv-ai.code-workspace`. In that file, `packages/tv-app/tizen`
>   is deliberately listed **first** (shown as **tizen-package**), so the
>   extension targets it; the whole monorepo is the second folder and stays
>   visible. The folder order matters — tizen must be first.
> - **Guaranteed fallback:** File → *Open Folder* → `packages/tv-app/tizen/`.

1. Open the workspace as above (reload VS Code if you changed the folder order)
2. VS Code Command Palette → **Tizen TV: Build Signed Package**
3. Select the certificate profile you created in Step 1
4. A signed `clautv-ai.wgt` file is generated in the project folder

The `.wgt` file is git-ignored — don't commit it.

## Step 5 — Install to TV

**Via Device Manager (GUI):**
1. VS Code Command Palette → **Tizen TV: Open Device Manager**
2. Connect to your TV's IP
3. Right-click the TV → **Install App** → select `clautv-ai.wgt`

**Via CLI (if `sdb` is in your PATH):**
```bash
sdb connect <TV_IP>
tizen install -n clautv-ai.wgt -t <device_serial>
```

The app appears in your TV's app list. Re-install after each build.

## Notes

- **Signature files** (`author-signature.xml`, `signature1.xml`) are build artifacts generated when you sign. They're git-ignored — each developer gets their own when they sign.
- **The distributor test certificate** (used for Developer Mode sideloading) is bundled in the extension. A different distributor cert is only needed for Samsung app store submission.
- **No emulator needed** — the Tizen TV emulator runs generic Tizen, not Samsung's SmartTV fork. Sideloading to a real TV is the standard development workflow.
