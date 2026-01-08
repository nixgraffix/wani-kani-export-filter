# WaniKani Export Filter

A local React app for browsing and exporting WaniKani data with SQLite caching.

## Prerequisites

- Node.js (v18 or higher)
- WaniKani API token (get it from https://www.wanikani.com/settings/personal_access_tokens)
- **Linux/WSL users**: Build tools for native modules
  ```bash
  sudo apt update && sudo apt install -y build-essential
  ```

## Setup

1. Install dependencies for all packages (root, server, and client):
   ```bash
   npm run install:all
   ```

2. Create the server environment file:
   ```bash
   cp server/.env.example server/.env
   ```

3. Edit `server/.env` and add your WaniKani API token:
   ```
   WANIKANI_API_TOKEN=your_token_here
   ```

## Running

Start both the client and server:
```bash
npm run dev
```

This runs:
- React frontend at http://localhost:5173
- Express API server at http://localhost:3001

## Features

- View user info and pending reviews
- Browse subjects by level range and type (radical, kanji, vocabulary)
- Filter by SRS stage and parts of speech
- Export filtered subjects to CSV with the following columns:
  - Characters
  - Readings
  - Meanings
  - Parts of Speech
  - Transitivity (transitive verb or intransitive verb, if applicable)
  - Dan (ichidan verb or godan verb, if applicable)
  - Type
  - Level
  - SRS Stage
- Export context sentences to CSV
- Export character list to text file
- Local SQLite caching to reduce API calls
