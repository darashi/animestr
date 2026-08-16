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

To save reactions, use a browser with a [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) signer. The application stores only the public key in local storage; event signing remains in the signer. Reaction avatars use a primary ring for the logged-in user and a secondary ring for users in the logged-in user's NIP-02 follow list.

## Commands

```sh
bun run build
bun run lint
bun run test
```

## Deployment

The application is configured for deployment to Cloudflare Workers with Static Assets.

Authenticate Wrangler once, then deploy:

```sh
bunx wrangler login
bun run deploy
```

Wrangler prints the deployed `workers.dev` URL after a successful deployment. The configuration serves `index.html` for client-side routes such as `/seasons/2026Q3`, `/casts/Q123`, and `/companies/Q456`.

To deploy from the Cloudflare dashboard, connect the repository to a Workers Builds project and use these settings:

- Build command: `bun run build`
- Deploy command: `bunx wrangler deploy`

The public relay defaults are compiled into the build from `.env`. Override them in Cloudflare's build variables with `VITE_PROFILE_RELAYS` and `VITE_THINGSTR_RELAYS` when needed.
