import { createContext } from "react";
import type { NostrEvent } from "nostr-tools";

export type ReactionEvent = NostrEvent;

export type WikidataReaction = {
	event: ReactionEvent;
	entityId: string;
	pubkey: string;
	content: string;
};

export type WikidataReactionsValue = {
	byEntityId: ReadonlyMap<string, WikidataReaction[]>;
};

export const WikidataReactionsContext = createContext<WikidataReactionsValue | null>(null);
