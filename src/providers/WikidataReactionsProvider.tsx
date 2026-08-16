import { useEffect, useMemo, useState, type ReactNode } from "react";
import useEventStore from "../hooks/useEventStore";
import { WIKIDATA_REACTION_FILTER } from "../lib/reactionFilters";
import {
	buildDeletionAuthorsByEventId,
	getReactionDeletionEvents,
	isEventDeleted,
	subscribeReactionDeletionEvents,
} from "../lib/reactionEventStore";
import { stripWikidataPrefix } from "../lib/wikidata";
import {
	WikidataReactionsContext,
	type ReactionEvent,
	type WikidataReaction,
} from "./wikidataReactionsContext";

function storedReactions(eventStore: ReturnType<typeof useEventStore>): ReactionEvent[] {
	return eventStore.getByFilters(WIKIDATA_REACTION_FILTER);
}

function reactionFromEvent(event: ReactionEvent): WikidataReaction | null {
	const entityTag = event.tags.find(([key, value]) => key === "i" && typeof value === "string");
	const entityId = entityTag?.[1] ? stripWikidataPrefix(entityTag[1]) : "";
	if (!entityId) return null;
	return { event, entityId, pubkey: event.pubkey };
}

function WikidataReactionsProvider({ children }: { children: ReactNode }) {
	const eventStore = useEventStore();
	const [reactions, setReactions] = useState<ReactionEvent[]>(() =>
		storedReactions(eventStore),
	);
	const [deletions, setDeletions] = useState<ReactionEvent[]>(getReactionDeletionEvents);

	useEffect(() => {
		const subscription = eventStore.timeline(WIKIDATA_REACTION_FILTER).subscribe((events) => {
			setReactions(events ?? []);
		});
		return () => subscription.unsubscribe();
	}, [eventStore]);

	useEffect(() => {
		return subscribeReactionDeletionEvents((event) => {
			setDeletions((current) =>
				current.some(({ id }) => id === event.id) ? current : [...current, event],
			);
		});
	}, []);

	const value = useMemo(() => {
		const deletionAuthorsByEventId = buildDeletionAuthorsByEventId(deletions);
		const timeline = reactions
			.filter((event) => !isEventDeleted(event, deletionAuthorsByEventId))
			.map(reactionFromEvent)
			.filter((reaction): reaction is WikidataReaction => reaction !== null)
			.sort((a, b) => b.event.created_at - a.event.created_at);
		const byEntityId = new Map<string, WikidataReaction[]>();
		for (const reaction of timeline) {
			const entityReactions = byEntityId.get(reaction.entityId) ?? [];
			entityReactions.push(reaction);
			byEntityId.set(reaction.entityId, entityReactions);
		}
		return { byEntityId };
	}, [deletions, reactions]);

	return (
		<WikidataReactionsContext.Provider value={value}>
			{children}
		</WikidataReactionsContext.Provider>
	);
}

export default WikidataReactionsProvider;
