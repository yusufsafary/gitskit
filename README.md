# GitSkit

**Cut. Clip. Command.**

GitSkit is a self-hosted video transcript supercut studio for creators and developers. Point it at a folder of videos, transcribe them with xAI's speech-to-text API, then search, remix, and render clips with surgical precision.

Built on top of Wes Bos's Syntax Supercut Studio with a complete rebrand, Solana wallet authentication, and a modern dark-mode design system.

## Features

- **Supercut** - Clip every match of a phrase, regex, or AI-generated pattern
- **Sentence builder** - Pick one clip per word and stitch anything together
- **Songify** - Detect pitch and arrange clips into a melody
- **Transcription** - Word-level transcription via xAI speech-to-text
- **Stats** - Top words, bigrams, trigrams across all buckets
- **Clip library** - Browse, preview, download every rendered output
- **Wallet auth** - Sign in with Phantom, Solflare, or Backpack

## Stack

- SvelteKit 2 + Svelte 5
- FFmpeg for video operations
- xAI speech-to-text for transcription
- aubiopitch for melody detection
- Solana Wallet Standard (ed25519 signature verification)
- Vercel for deployment

## Quick start

```bash
git clone https://github.com/yusufsafary/gitskit
cd gitskit
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

## Media structure

```
videos/                     <- root (configurable via SYNTAX_BUCKETS_DIR)
  my-podcast/                <- bucket name
    videos/                  <- source .mp4 / .mkv / .mov / .mp3 files
    transcripts/             <- auto-filled by GitSkit
    supercuts/               <- rendered outputs
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GITSKIT_PASSWORD` | No | Access password (empty = open in dev) |
| `GITSKIT_SECRET` | Yes | 32+ char secret for signing sessions |
| `XAI_API_KEY` | Yes for transcription | API key from x.ai |
| `SYNTAX_BUCKETS_DIR` | No | Absolute path to buckets root (default: `./videos`) |

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Set the environment variables in the Vercel dashboard or via `vercel env add`.

## Credits

Original concept by [Wes Bos](https://github.com/wesbos/syntax-supercut-studio). Rebranded and extended as GitSkit.

## License

MIT
