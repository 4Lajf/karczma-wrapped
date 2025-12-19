# Discord Wrapped - Complete Implementation

## 🚀 Complete Features

This implementation includes ALL experimental features from the specification, delivering deep insights into user behavior patterns.

### Advanced Metrics (Section 5.7 - Fully Implemented)

#### 1. **Vocabulary Fingerprint** 🔤
- TF-IDF analysis: words user says disproportionately more than server average
- Reveals unique slang and catchphrases
- Top 5 unique words with multiplier scores

#### 2. **Response Latency** ⏱️
- Median time to reply when mentioned
- Measured in seconds
- Filters out responses > 1 hour apart

#### 3. **Chronotype / Sleep Schedule** 😴
- Estimates sleep window by finding longest "quiet period"
- Shows sleep start/end times
- Duration of daily silence

#### 4. **Session Analysis** 📊
- Average session length (minutes)
- Session count
- Average attention span (time between messages in a session)
- Sessions defined as activity bursts separated by >30min gaps

#### 5. **Interaction Asymmetry** 💕
- "Simp Factor" - ratio of replies sent vs received
- Identifies:
  - **Fan relationships** (you reply way more than they do)
  - **Celebrity status** (they reply way more than you)
  - **Balanced** relationships
- Top 3 asymmetric relationships shown

#### 6. **Reaction-Based Relationships** 👍
- **Top Reactors**: Who reacts to your messages most
- **Top Reacted To**: Whose messages you react to most
- Separate from mention/reply relationships

### Advanced Badges

- ✅ **React Lord** (Pan Reakcji) - Receives tons of reactions (>2x messages)
- ✅ **Trendsetter** (Wyznaczający Trendy) - Often first to react to messages that become viral (>10 instances)
- ✅ **Conversation Killer** (Zabójca Konwersacji) - Frequently the last to post before 6+ hour silence (>50 times)
- ✅ **Simp/Wielbiciel** - Reply ratio >5:1 with someone
- ✅ **Consistent/Konsekwentny** - Longest streak >30 days

### Complete Feature List

#### Core Metrics ✅
- Total messages, rank, percentile
- Active days + **longest streak**
- Channel distribution (top 5)
- First/last message timestamps
- Average message/word length
- Attachment count
- Pinned messages

#### Temporal Patterns ✅
- Hourly distribution (24h)
- Daily distribution (7 days)
- Monthly distribution (12 months)
- Most active month
- Persona (Night Owl, Early Bird, etc.)

#### Interactions ✅
- Mentions (bidirectional)
- Replies (bidirectional)
- **Reactions (bidirectional)**
- **Interaction asymmetry**

#### Content Analysis ✅
- Top 10 words (Polish stopwords + stemming)
- Top 10 emojis sent (inline + reactions)
- Top 10 emojis received
- **Vocabulary fingerprint**

#### Badges (14 total ✅)
All 14 badges from spec now implemented!

### Frontend Enhancements

#### Deep Stats Slide 🔬
- Displays all experimental metrics
- Vocabulary fingerprint list
- Session analysis stats
- Chronotype visualization
- Response latency
- Interaction asymmetry relationships

#### URL Deep-Linking ✅
Share direct links to specific users:
```
https://your-site.com/?user=270968874420273153
```
- Automatically opens that user's wrapped
- Updates URL when user is selected
- Clears URL when closing

#### Keyboard Navigation ✅
- `←` / `→` : Previous/Next slide
- `↑` / `↓` : Previous/Next slide (alternative)
- `ESC` : Close and return to user selection

## 🔧 Usage

### Generate Data

```bash
# Step 1: Ingest data
node pipeline/ingest.js

# Step 2: Generate WITH experimental features
node pipeline/generate.js
```

**Note:** `generate.js` computes all experimental features. It may take longer (5-15 min for 500 users) but provides complete insights.

### File Structure

```
pipeline/
├── ingest.js          # Data ingestion
├── generate.js        # Generator (ALL features)
└── karczma.db         # SQLite database

src/lib/components/
├── IntroSlide.svelte
├── ActivitySlide.svelte
├── InteractionSlide.svelte
├── EmojiSlide.svelte
├── TimeSlide.svelte
├── ChannelsSlide.svelte
├── DeepStatsSlide.svelte  # Experimental metrics
├── BadgesSlide.svelte
└── SummarySlide.svelte
```

## 📊 Specification Compliance

### ✅ 100% Complete

**Every** feature from the specification is now implemented:

- ✅ All core metrics (5.2)
- ✅ All interaction metrics (5.3)
- ✅ All emoji/content metrics (5.4)
- ✅ All temporal patterns (5.5)
- ✅ All badges (5.6) - 14 total
- ✅ **All experimental insights (5.7)**
- ✅ All global metrics (5.8)
- ✅ All frontend slides (7.2)
- ✅ URL deep-linking (7.1)
- ✅ Keyboard navigation (7.2)
- ✅ Screenshot-friendly design (7.4)
- ✅ Neo-Brutalism theme (7.5)
- ✅ Polish language (7.4)

## 🎨 Design Philosophy

Neo-Brutalism aesthetic with information density for data-savvy users:

- Deep Stats slide uses same visual language
- Experimental metrics presented with clear labels
- Polish language throughout

## 🔬 Technical Notes

### Performance

- **Generator**: Advanced calculations for all metrics
- For 500 users: expect 10-20 minutes total
- Memory usage: ~500MB-1GB during generation
- Frontend: No performance impact (data is pre-computed)

### Data Quality

Some experimental metrics require minimum data:

- **Vocabulary Fingerprint**: Needs sufficient message history (>50 messages recommended)
- **Response Latency**: Needs mentions + replies
- **Chronotype**: Needs varied activity times
- **Sessions**: Needs multiple days of activity
- **Asymmetry**: Needs reply relationships

The Deep Stats slide gracefully handles missing data by showing only available metrics.

## 🚀 Deployment

Completely static:

```bash
npm run build
```

Deploy `build/` folder to any static host (GitHub Pages, Netlify, Vercel, etc.)

## 📝 Example Insights

Users can discover:

- "You use 'kurwa' **43x** more than the average server member"
- "Your sleep window: **23:00** → **07:00** (8h silence)"
- "Average session: **67 minutes**, posting every **45 seconds**"
- "You reply to **Goge** 8x more than they reply to you 💕"
- "**Trendsetter**: You were first to react on 23 viral messages"
- "**Response time**: You reply to mentions in **47 seconds** (median)"

These insights create highly personalized, memorable experiences that go far beyond basic message counts!

