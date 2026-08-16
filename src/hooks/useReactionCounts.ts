import { useMemo } from "react";
import { useWikidataReactionsIndex } from "./useWikidataReactions";
import { normalizePubkey } from "../lib/nostr";

function useReactionCounts(entityIds: string[]) {
	const reactionsByEntityId = useWikidataReactionsIndex();
	const idSet = useMemo(() => new Set(entityIds.filter(Boolean)), [entityIds]);

	return useMemo(() => {
		const map = new Map<string, Set<string>>();
		idSet.forEach((entityId) => {
			for (const reaction of reactionsByEntityId.get(entityId) ?? []) {
				const normalized = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
				if (!normalized) continue;
				const current = map.get(entityId) ?? new Set<string>();
				current.add(normalized);
				map.set(entityId, current);
			}
		});
		const counts = new Map<string, number>();
		map.forEach((pubkeys, id) => {
			counts.set(id, pubkeys.size);
		});
		return counts;
	}, [idSet, reactionsByEntityId]);
}

export default useReactionCounts;
