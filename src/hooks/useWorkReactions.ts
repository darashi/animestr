import { useMemo } from "react";
import useWikidataReactionsTimeline from "./useWikidataReactionsTimeline";
import { normalizePubkey } from "../lib/nostr";

export type WorkReaction = { pubkey: string; createdAt?: number };

function useWorkReactions(entityId: string) {
	const reactions = useWikidataReactionsTimeline();

	const uniqueReactions = useMemo<WorkReaction[]>(() => {
		const seen = new Set<string>();
		const list: WorkReaction[] = [];
		reactions.forEach((reaction) => {
			if (reaction.entityId !== entityId) return;
			const normalized = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
			if (!normalized || seen.has(normalized)) return;
			seen.add(normalized);
			list.push({ pubkey: normalized, createdAt: reaction.event?.created_at });
		});
		return list.sort(
			(a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
		);
	}, [entityId, reactions]);

	return { reactions: uniqueReactions };
}

export default useWorkReactions;
