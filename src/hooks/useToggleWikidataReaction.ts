import { useCallback, useMemo, useState } from "react";
import { THINGSTR_RELAYS } from "../config/relays";
import { signEventWithNip07 } from "../lib/nip07";
import { normalizePubkey } from "../lib/nostr";
import {
	buildReactionDeletionTemplate,
	buildWikidataReactionTemplate,
} from "../lib/reactionEvents";
import { ingestRelayEvent } from "../lib/reactionEventStore";
import { normalizeReactionContent } from "../lib/reactions";
import useEventStore from "./useEventStore";
import useNip07Auth from "./useNip07Auth";
import useRelayPool from "./useRelayPool";
import { useWikidataReactionsForEntity } from "./useWikidataReactions";

function useToggleWikidataReaction(entityId: string) {
	const eventStore = useEventStore();
	const relayPool = useRelayPool();
	const { session } = useNip07Auth();
	const reactions = useWikidataReactionsForEntity(entityId);
	const [savingContent, setSavingContent] = useState<string | null>(null);
	const isSaving = savingContent !== null;

	const ownReactionEventIdsByContent = useMemo(() => {
		const byContent = new Map<string, string[]>();
		if (!session?.pubkey) return byContent;
		reactions.forEach((reaction) => {
			const pubkey = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
			if (pubkey !== session.pubkey) return;
			const content = normalizeReactionContent(reaction.content);
			const ids = byContent.get(content) ?? [];
			ids.push(reaction.event.id);
			byContent.set(content, ids);
		});
		return byContent;
	}, [reactions, session?.pubkey]);
	const ownReactionContents = useMemo(
		() => [...ownReactionEventIdsByContent.keys()],
		[ownReactionEventIdsByContent],
	);
	const hasReaction = useCallback(
		(content: string) =>
			ownReactionEventIdsByContent.has(normalizeReactionContent(content)),
		[ownReactionEventIdsByContent],
	);
	const toggle = useCallback(async (content = "+") => {
		if (!session?.pubkey) throw new Error("Nostr login is required");
		if (THINGSTR_RELAYS.length === 0) {
			throw new Error("No reaction relay is configured");
		}
		if (isSaving) return;

		const normalizedContent = normalizeReactionContent(content);
		setSavingContent(normalizedContent);
		try {
			const ownReactionEventIds =
				ownReactionEventIdsByContent.get(normalizedContent) ?? [];
			const template = ownReactionEventIds.length > 0
				? buildReactionDeletionTemplate(ownReactionEventIds)
				: buildWikidataReactionTemplate(entityId, normalizedContent);
			const event = await signEventWithNip07(template, session.pubkey);
			const responses = await relayPool.publish(THINGSTR_RELAYS, event, {
				timeout: 15_000,
			});
			if (!responses.some((response) => response.ok)) {
				const message = responses.map((response) => response.message).find(Boolean);
				throw new Error(message ?? "All reaction relays rejected the event");
			}
			ingestRelayEvent(eventStore, event);
		} finally {
			setSavingContent(null);
		}
	}, [
		entityId,
		eventStore,
		isSaving,
		ownReactionEventIdsByContent,
		relayPool,
		session?.pubkey,
	]);

	return {
		isLoggedIn: Boolean(session?.pubkey),
		isSaving,
		hasReaction,
		ownReactionContents,
		toggle,
	};
}

export default useToggleWikidataReaction;
