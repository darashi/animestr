import type { EventStore } from "applesauce-core";
import type { ReactionEvent } from "../providers/wikidataReactionsContext";
import { isVerifiedNostrEvent } from "./nostr";

type DeletionListener = (event: ReactionEvent) => void;

const deletionEvents = new Map<string, ReactionEvent>();
const deletionListeners = new Set<DeletionListener>();

function publishDeletionEvent(event: ReactionEvent) {
	if (deletionEvents.has(event.id)) return;
	deletionEvents.set(event.id, event);
	deletionListeners.forEach((listener) => listener(event));
}

export function ingestRelayEvent(
	eventStore: EventStore,
	event: unknown,
): ReactionEvent | null {
	if (!isVerifiedNostrEvent(event)) return null;
	if (event.kind === 5) {
		publishDeletionEvent(event);
		return event;
	}
	eventStore.add(event);
	return event;
}

export function getReactionDeletionEvents(): ReactionEvent[] {
	return [...deletionEvents.values()];
}

export function subscribeReactionDeletionEvents(listener: DeletionListener) {
	deletionEvents.forEach(listener);
	deletionListeners.add(listener);
	return () => {
		deletionListeners.delete(listener);
	};
}

export function buildDeletionAuthorsByEventId(
	events: ReactionEvent[],
): Map<string, Set<string>> {
	const authorsByEventId = new Map<string, Set<string>>();
	for (const event of events) {
		for (const [key, value] of event.tags) {
			if (key !== "e" || typeof value !== "string") continue;
			const authors = authorsByEventId.get(value) ?? new Set<string>();
			authors.add(event.pubkey);
			authorsByEventId.set(value, authors);
		}
	}
	return authorsByEventId;
}

export function isEventDeleted(
	event: ReactionEvent,
	deletionAuthorsByEventId: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
	return deletionAuthorsByEventId.get(event.id)?.has(event.pubkey) ?? false;
}
