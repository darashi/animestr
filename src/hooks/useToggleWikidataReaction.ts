import { useCallback, useMemo, useState } from "react";
import { THINGSTR_RELAYS } from "../config/relays";
import { signEventWithNip07 } from "../lib/nip07";
import { normalizePubkey } from "../lib/nostr";
import {
	buildReactionDeletionTemplate,
	buildWikidataReactionTemplate,
} from "../lib/reactionEvents";
import { ingestRelayEvent } from "../lib/reactionEventStore";
import useEventStore from "./useEventStore";
import useNip07Auth from "./useNip07Auth";
import useRelayPool from "./useRelayPool";
import { useWikidataReactionsForEntity } from "./useWikidataReactions";

function useToggleWikidataReaction(entityId: string) {
	const eventStore = useEventStore();
	const relayPool = useRelayPool();
	const { session } = useNip07Auth();
	const reactions = useWikidataReactionsForEntity(entityId);
	const [isSaving, setIsSaving] = useState(false);

	const ownReactionEventIds = useMemo(() => {
		if (!session?.pubkey) return [];
		return reactions
			.filter((reaction) => {
				const pubkey = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
				return pubkey === session.pubkey;
			})
			.map((reaction) => reaction.event.id);
	}, [reactions, session?.pubkey]);
	const isReacted = ownReactionEventIds.length > 0;

	const toggle = useCallback(async () => {
		if (!session?.pubkey) throw new Error("Nostr login is required");
		if (THINGSTR_RELAYS.length === 0) {
			throw new Error("No reaction relay is configured");
		}
		if (isSaving) return;

		setIsSaving(true);
		try {
			const template = isReacted
				? buildReactionDeletionTemplate(ownReactionEventIds)
				: buildWikidataReactionTemplate(entityId);
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
			setIsSaving(false);
		}
	}, [
		entityId,
		eventStore,
		isReacted,
		isSaving,
		ownReactionEventIds,
		relayPool,
		session?.pubkey,
	]);

	return {
		isLoggedIn: Boolean(session?.pubkey),
		isReacted,
		isSaving,
		toggle,
	};
}

export default useToggleWikidataReaction;
