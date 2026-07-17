# pi-notify-extension

Notifies when a pi agent has finished executing, including the conversation topic and a concise summary of the conversation state:
- `responded`
- `wants input`
- `error`
- `truncated`
- `done`

Skips notifications for subagent child runs, aborted runs, and incomplete `toolUse` states.

## Install

```bash
pi install git:https://github.com/softlink-ic/pi-notify
```

## License

Package is licensed under the GNU LGPL 2.1.