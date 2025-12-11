import { useMemo } from "react";
import useWikidataReactionsTimeline from "./useWikidataReactionsTimeline";
import { normalizePubkey } from "../lib/nostr";

function useReactionCounts(entityIds: string[]) {
	const reactions = useWikidataReactionsTimeline();
	const idSet = useMemo(() => new Set(entityIds.filter(Boolean)), [entityIds]);

	return useMemo(() => {
		const map = new Map<string, Set<string>>();
		reactions.forEach((reaction) => {
			if (!idSet.has(reaction.entityId)) return;
			const normalized = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
			if (!normalized) return;
			const current = map.get(reaction.entityId) ?? new Set<string>();
			current.add(normalized);
			map.set(reaction.entityId, current);
		});
		const counts = new Map<string, number>();
		map.forEach((pubkeys, id) => {
			counts.set(id, pubkeys.size);
		});
		return counts;
	}, [idSet, reactions]);
}

export default useReactionCounts;
