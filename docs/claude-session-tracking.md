# Claude Session Tracking

ტრეკავს რამდენ დროს მუშაობს Claude Code ამ პროექტზე. მონაცემები ჩანს
`/admin/claude-sessions`-ზე.

## არქიტექტურა

- **Append-only event log** (`claude_session_events`). hook აგზავნის `start`-ს
  სესიის დასაწყისში და `end`/`stop`-ს დასასრულს.
- **Server clock = source of truth.** `event_at = now()` ჩაიწერება server-ზე.
  client-ის საათი (`client_at`) შეინახება შესადარებლად, მაგრამ aggregate-ებში
  არ გამოიყენება.
- **Bearer-token auth** (`CLAUDE_HOOK_SECRET`). endpoint დაცულია.
- **View `claude_sessions`** აჯამებს `start`/`end`-ს per `session_id`-ზე.

### რატომ რთულია გაყალბება

- დეველოპერი **ვერ წაშლის ან შეცვლის** server-side timestamp-ებს — მხოლოდ
  service-role key-ით არის შესაძლებელი, key-ს კი მხოლოდ შენ ფლობ.
- თუ developer hook-ს გათიშავს → `/admin/claude-sessions`-ზე event-ები
  **გაჩერდება**, გამოჩნდება რომ მუშაობდა ამ პერიოდში.
- ყალბი `start` ყოველდღე ერთი საათით — შესაძლებელია, მაგრამ shape-ი
  აშკარაა (100% regular bursts, არა real IDE use pattern). ცდუნების შემთხვევაში
  cross-check Anthropic API billing console-თან (token usage).

### ნამდვილად tamper-proof ვარიანტი (არასავალდებულო upgrade)

თუ ზუსტი billing გინდა, გამოიყენე [console.anthropic.com](https://console.anthropic.com)
Usage tab — მისცი developer-ს შენი API key-ი, billing შენი account-იდან
ჩანს, developer ვერაფრით ვერ შეცვლის. hook-ი UI გამოცდილებისთვის დატოვე.

---

## Setup

### 1. Env var

`.env.local` + Vercel:

```bash
CLAUDE_HOOK_SECRET=<random 32+ char string>
```

Generate: `openssl rand -hex 32`.

### 2. Migration

Supabase SQL Editor → Run:
`supabase/migrations/0014_claude_sessions.sql`

### 3. Hook script

შექმენი `~/.claude/hooks/claude-session-log.sh`:

```bash
#!/usr/bin/env bash
# Claude Code hook → engineers.ge /api/claude-sessions
# Receives hook JSON on stdin; forwards start/end events to server.

set -u

INGEST_URL="${CLAUDE_INGEST_URL:-https://engineers.ge/api/claude-sessions}"
SECRET="${CLAUDE_HOOK_SECRET:-}"
KIND="${1:-}"  # "start" | "end" | "stop"

if [[ -z "$SECRET" ]]; then
  exit 0  # fail silently if not configured
fi
if [[ -z "$KIND" ]]; then
  exit 0
fi

# Read hook payload from stdin (Claude Code pipes JSON here).
PAYLOAD=$(cat || echo '{}')

# Extract fields with jq (fall back to empty if jq missing or field absent).
SESSION_ID=$(echo "$PAYLOAD" | jq -r '.session_id // empty' 2>/dev/null)
CWD=$(echo "$PAYLOAD" | jq -r '.cwd // empty' 2>/dev/null)
MODEL=$(echo "$PAYLOAD" | jq -r '.model.id // .model // empty' 2>/dev/null)

# Fallbacks
[[ -z "$SESSION_ID" ]] && SESSION_ID="unknown-$(date +%s)-$$"
[[ -z "$CWD" ]] && CWD="$(pwd)"
PROJECT=$(basename "$CWD")
CLIENT_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

BODY=$(jq -n \
  --arg sid "$SESSION_ID" \
  --arg k "$KIND" \
  --arg at "$CLIENT_AT" \
  --arg p "$PROJECT" \
  --arg c "$CWD" \
  --arg m "$MODEL" \
  '{session_id:$sid, kind:$k, client_at:$at, project:$p, cwd:$c, model:$m}')

curl -sS -m 5 -X POST "$INGEST_URL" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d "$BODY" >/dev/null 2>&1 &

disown || true
exit 0
```

გახადე executable:

```bash
chmod +x ~/.claude/hooks/claude-session-log.sh
```

### 4. `~/.claude/settings.json` hooks

```json
{
  "env": {
    "CLAUDE_HOOK_SECRET": "paste-same-secret-here",
    "CLAUDE_INGEST_URL": "https://engineers.ge/api/claude-sessions"
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/claude-session-log.sh start"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/claude-session-log.sh end"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/claude-session-log.sh stop"
          }
        ]
      }
    ]
  }
}
```

- `SessionStart` → ფიქსირდება სესიის დაწყება.
- `SessionEnd` → ფიქსირდება სუფთა დახურვა (`/exit`, window close).
- `Stop` → fallback თუ `SessionEnd` არ გამოიძახება (crash, kill). aggregate
  იყენებს `max(event_at)` სადაც `kind in ('end','stop')`.

### 5. Test

ახალი Claude სესია გაუშვი → `/admin/claude-sessions` → უნდა გამოჩნდეს
active row `started_at` stamp-ით. დახურე სესია → row დახურდება
`duration_seconds`-ით.
