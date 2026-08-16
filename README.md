# animestr

animestr lists anime by broadcast season using Wikidata and shows Nostr reactions for works and related entities.

## Requirements

- [Bun](https://bun.sh/)

## Setup

```sh
bun install
bun run dev
```

The repository's `.env` contains the default public relays. To override them locally, create a Git-ignored `.env.local`. Relay variables accept comma-separated WebSocket URLs. The application still shows Wikidata data when no relays are configured.

```dotenv
VITE_PROFILE_RELAYS=wss://profile-relay.example
VITE_THINGSTR_RELAYS=wss://reaction-relay.example
```

## Commands

```sh
bun run build
bun run lint
bun run test
```

## Deployment

The application uses client-side routes such as `/seasons/2026Q3`, `/casts/Q123`, and `/companies/Q456`. Configure the web server to serve `index.html` for those paths.
