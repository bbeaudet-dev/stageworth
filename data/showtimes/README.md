# Broadway Weekly Showtimes

Automated weekly snapshots of the [Playbill Broadway schedule](https://playbill.com/article/weekly-schedule-of-current-broadway-shows).

## Files

| File | Description |
|---|---|
| `current.json` | Always the latest week. Overwritten each run. |
| `YYYY-MM-DD.json` | Immutable snapshot for that week (Monday date). |
| `diff-YYYY-MM-DD.json` | Machine-readable diff vs the previous week. |
| `diff-YYYY-MM-DD.md` | Human-readable diff — also used as the PR body. |

## Pipeline Schedule

The GitHub Actions workflow (`weekly-showtimes.yml`) runs at 1am ET on Mondays (6am UTC).

Playbill updates their schedule on Sunday evenings ET. If the 1am run finds the schedule hasn't updated yet (same `weekOf` as last week), the job waits 1 hour and tries again — up to 5 attempts before giving up. This covers any variation in when Playbill publishes.

**Freshness check:** if the scraped `weekOf` date matches `current.json`, the script exits with code 2 (soft skip). The workflow retries hourly. If all attempts are stale, the job completes without error and surfaces a warning in the GitHub Actions summary.

**Manual trigger:** Actions → "Weekly Broadway Showtimes" → Run workflow. Check "Force write" to bypass the freshness check.

## Data Schema

### `current.json`

```json
{
  "weekOf": "2026-04-06",
  "fetchedAt": "2026-04-07T15:00:00.000Z",
  "showCount": 41,
  "shows": [
    {
      "title": "& Juliet",
      "schedule": {
        "mon": [],
        "tue": ["19:00"],
        "wed": ["14:00", "19:00"],
        "thu": ["19:00"],
        "fri": ["20:00"],
        "sat": ["14:00", "20:00"],
        "sun": ["13:00", "18:30"]
      }
    }
  ]
}
```

### Schedule slot

Each day's value is an array of strings:

| Value | Meaning |
|---|---|
| `[]` | Show is dark that day |
| `["19:00"]` | One performance at 7pm (24-hour HH:MM) |
| `["14:00", "20:00"]` | Two performances (matinee + evening) |
| `["opening"]` | Official opening night — a performance IS happening, exact time not listed by Playbill |

### `diff-YYYY-MM-DD.json`

```json
{
  "prevWeekOf": "2026-03-30",
  "nextWeekOf": "2026-04-06",
  "added": ["Schmigadoon!"],
  "removed": ["The Outsiders"],
  "scheduleChanges": [
    {
      "title": "Chicago",
      "changes": [
        { "day": "Wed", "from": "2pm, 7:30pm", "to": "DARK" }
      ]
    }
  ],
  "openingNights": [
    { "title": "Cats: The Jellicle Ball", "day": "Tue" }
  ]
}
```

## Source

Playbill updates the schedule weekly. Data covers **Broadway only** (the 41 Broadway houses). No Off-Broadway, no rush/lottery info — those are separate concerns.

Coverage gaps:
- `OPENING` cells don't include the exact performance time
- Mid-week cancellations won't be reflected until the next Monday run
- Holiday schedule changes may appear in the Playbill article text, not the table

## Running locally

```bash
# Normal run (writes files, skips if same weekOf)
bun scripts/fetchWeeklyShowtimes.mjs

# Dry run (logs output, writes nothing)
bun scripts/fetchWeeklyShowtimes.mjs --dry-run

# Force write (ignores freshness check)
bun scripts/fetchWeeklyShowtimes.mjs --force
```
