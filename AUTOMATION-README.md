# DESH INVESTIGATION — REAL DAILY AUTOMATION

This package includes the website frontend plus a production-oriented automation blueprint.

## Goal
Every day:
1. Collect current news from permitted RSS/news APIs.
2. Deduplicate stories.
3. Research each story against multiple sources.
4. Generate a Hindi article + source list + YouTube title/description/script.
5. Put low-confidence items into a review queue.
6. Publish only verified/approved stories.
7. Generate/render the video.
8. Upload/schedule the video to the connected YouTube channel through the official YouTube API.
9. Add the article/video URL back to the website.

## Important
A website cannot safely or reliably publish “everything automatically” without source/API credentials and a publishing connection. The recommended production workflow is AI-assisted + automatic scheduling with a verification gate for high-risk stories.

## Suggested production stack
- Frontend: Next.js
- Database: PostgreSQL/Supabase
- Automation: n8n/cron
- News: official RSS/APIs + trusted sources
- AI: OpenAI API or another permitted model API
- Video: FFmpeg + TTS + image/video assets
- YouTube: YouTube Data API OAuth
- Hosting: Vercel/Cloudflare + managed database

## YouTube automation
Use YouTube Data API OAuth. Never hard-code a Google password or upload token into the website.
The channel owner must authorize the YouTube connection.

## Schedule example
06:00 — collect overnight news
08:00 — research/score
10:00 — publish first verified article/video
14:00 — second batch
18:00 — evening roundup
21:00 — final daily report

## Safety/quality gate
For crime, politics, elections, public safety, deaths, allegations, and breaking news:
- require source verification;
- label allegations;
- avoid unsupported numbers;
- preserve publication dates;
- show source links;
- do not auto-publish low-confidence stories.

## Environment variables
NEWS_API_KEY=
OPENAI_API_KEY=
DATABASE_URL=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
SITE_URL=
TTS_API_KEY=

Do not commit .env to Git.
