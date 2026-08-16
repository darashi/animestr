import type { EventTemplate, NostrEvent } from "nostr-tools/pure";

declare global {
	interface Window {
		nostr?: {
			getPublicKey?: () => Promise<string>;
			signEvent?: (event: EventTemplate) => Promise<NostrEvent>;
		};
	}
}

export {};
