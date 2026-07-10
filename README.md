# pi-notify-on-finish

Pi package. Sends one compact desktop notification when top-level Pi run finishes.

Subtitle tries to stay tiny:

- `responded`
- `wants input`
- `error`
- `aborted`
- `truncated`
- `done`

Skips notifications for subagent child runs and incomplete `toolUse` states.

## Package layout

- `extensions/notify-on-finish.ts` — extension entry
- `package.json` — Pi package manifest for git or local installs

## Install

### Local path install

```bash
pi install ~/Downloads/pi-notify-on-finish
```

### Git install

After pushing repo to remote:

```bash
pi install git:https://github.com/<you>/pi-notify-on-finish
```

Pi package can also be loaded for one run only:

```bash
pi -e ~/Downloads/pi-notify-on-finish
```

Then run:

```text
/reload
```

Or restart Pi.

## Behavior

Extension listens on `agent_end`, then notifies only when run looks truly finished.

Guards:

- ignores subagent child processes via `PI_SUBAGENT_CHILD === "1"`
- ignores non-TUI modes
- ignores runs with pending follow-up messages
- ignores incomplete assistant state where `stopReason === "toolUse"`

Transport:

- Windows: native PowerShell toast
- Kitty: OSC 99
- other terminals: OSC 777

Title uses first user message from current session, trimmed to 60 chars.
Body uses short state label.

## Manual install without package manager

Copy extension file into Pi global extensions directory:

```bash
cp ~/Downloads/pi-notify-on-finish/extensions/notify-on-finish.ts ~/.pi/agent/extensions/
```

Then reload Pi.

## Distribute

```bash
git init
git add .
git commit -m "feat: add notify-on-finish pi package"
```

Push to remote git host. Others can then install with `pi install git:<repo-url>`.

## Security

Pi extensions run with full user permissions. Install only from trusted sources.
