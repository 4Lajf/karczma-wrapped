# Discord Wrapped Pipeline (SQLite-Based)

This pipeline processes Discord chat exports and generates comprehensive yearly wrapped statistics using SQLite for robust data storage and querying.

## Architecture

The pipeline consists of three main scripts:

1. **`db.js`** - Database schema and initialization
2. **`ingest.js`** - Streams JSON exports into SQLite database
3. **`generate.js`** - Queries database and generates final wrapped JSON

## Workflow

### Step 1: Place Your Data

Put all your DiscordChatExporter JSON exports in `pipeline/input/`:

```bash
pipeline/input/
  ├── Fantastyczna Karczma - channel-1 [1234567] (after 2025-01-01).json
  ├── Fantastyczna Karczma - channel-2 [7654321] (after 2025-01-01).json
  └── ...
```

### Step 2: Ingest Data

Run the ingestion script to populate the SQLite database:

```bash
node pipeline/ingest.js
```

This will:
- Create `pipeline/karczma.db` (SQLite database)
- Stream all JSON files and insert messages, users, channels, reactions, mentions
- Show real-time progress for each file
- Skip already-processed files (resumable)
- Handle large files (3.5GB+) efficiently

**Features:**
- Batched transactions (1000 messages per commit)
- Progress tracking with percentage
- Automatic filename parsing for metadata
- Deduplication via INSERT OR IGNORE
- All relationships preserved (mentions, reactions, replies)

### Step 3: Generate Wrapped

After ingestion is complete, run the generation script:

```bash
node pipeline/generate.js
```

This will:
- Query the database for comprehensive user statistics
- Calculate ALL metrics without performance limits
- Generate `static/wrap-2025.json` for the frontend

**Metrics Computed:**
- Core: Messages, rank, percentile, active days, longest streak
- Temporal: Hourly/daily/monthly distributions, chronotype, sleep schedule
- Channels: Top channels with percentages
- Interactions: Mentions, replies (bidirectional), reactions, interaction asymmetry
- Content: Top words (Polish stopwords + stemming), TF-IDF vocabulary fingerprint
- Emojis: Sent (inline + reactions), received
- Advanced: Edit rate, attachment count, pinned messages, burst messaging, session analysis, response latency
- Badges: 14 dynamic badges based on behavior patterns

### Step 4: View in Frontend

The Svelte app automatically loads `static/wrap-2025.json`:

```bash
npm run dev
```

Open http://localhost:5173 and select a user to see their wrapped!

## Database Schema

```sql
users (id, name, nickname, avatar_url, discriminator, is_bot)
channels (id, name, guild_id, guild_name)
messages (id, channel_id, author_id, content, timestamp, timestamp_edited, type, is_pinned, reply_to_msg_id, word_count, char_count, has_attachments)
mentions (message_id, mentioned_user_id)
reactions (message_id, emoji_id, emoji_name, user_id, count)
processed_files (filename, processed_at)
```

## Configuration

### Target Year

Edit `pipeline/generate.js`:

```javascript
const TARGET_YEAR = 2025; // Currently set for 2025
```

### Input Directory

Edit `pipeline/ingest.js`:

```javascript
const INPUT_DIR = './pipeline/input';
```

### Stopwords & Stemming

Polish language processing is built-in. To customize stopwords, edit the `STOPWORDS` set in `pipeline/generate.js`.

## Utilities

### Merge Multiple Files (Optional)

If you want to merge channel exports into a single file first:

```bash
node pipeline/merge.js
```

Output: `pipeline/merged-output.json`

### Reset Database

To start fresh:

```bash
del pipeline\karczma.db          # Windows
rm pipeline/karczma.db           # Unix
```

Then re-run `node pipeline/ingest.js`.

## Performance Notes

- **Ingestion**: ~10-50MB/s depending on hardware (SSD recommended)
- **Generation**: Scales linearly with user count (~1-5 seconds per user for full analysis)
- **Database Size**: Roughly 20-30% of original JSON size (indexes included)

For a 3.5GB JSON dump:
- Database: ~1GB
- Ingestion time: 2-5 minutes
- Generation time: 5-15 minutes (for 100-500 users)

## Troubleshooting

**Error: "unable to open database file"**
- Ensure `pipeline/` directory exists
- Check file permissions
- Kill any lingering Node processes: `taskkill /F /IM node.exe` (Windows)

**Progress stuck at X%**
- Check for JSON syntax errors in the input file
- Ensure file ends with proper `}` or `]`
- Try a different file to isolate the issue

**Missing metrics in output**
- Verify data was ingested: `sqlite3 pipeline/karczma.db "SELECT COUNT(*) FROM messages;"`
- Check target year matches your data

## Additional Documentation

- See `FEATURES.md` for complete list of all implemented features and metrics
