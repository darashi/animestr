import { useMemo } from "react";
import { normalizePubkey } from "../lib/nostr";
import useNip07Auth from "./useNip07Auth";
import { useWikidataReactionsIndex } from "./useWikidataReactions";

function useReactionStats(entityIds: string[]) {
	const { session } = useNip07Auth();
	const reactionsByEntityId = useWikidataReactionsIndex();
	const idSet = useMemo(() => new Set(entityIds.filter(Boolean)), [entityIds]);

	return useMemo(() => {
		const reactionCounts = new Map<string, number>();
		const ownReactionIds = new Set<string>();

		idSet.forEach((entityId) => {
			const pubkeys = new Set<string>();
			for (const reaction of reactionsByEntityId.get(entityId) ?? []) {
				const pubkey = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
				if (pubkey) pubkeys.add(pubkey);
			}
			if (pubkeys.size > 0) reactionCounts.set(entityId, pubkeys.size);
			if (session?.pubkey && pubkeys.has(session.pubkey)) ownReactionIds.add(entityId);
		});

		return { reactionCounts, ownReactionIds };
	}, [idSet, reactionsByEntityId, session?.pubkey]);
}

export default useReactionStats;
