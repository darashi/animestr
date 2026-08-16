import { useMemo } from "react";
import { normalizePubkey } from "../lib/nostr";
import { normalizeReactionContent } from "../lib/reactions";
import type { WikidataReaction } from "../providers/wikidataReactionsContext";
import { useWikidataReactionsForEntity } from "./useWikidataReactions";

export type WorkReaction = {
	id: string;
	pubkey: string;
	content: string;
	createdAt: number;
};

export function uniqueWorkReactions(reactions: WikidataReaction[]): WorkReaction[] {
	const seen = new Set<string>();
	const list: WorkReaction[] = [];
	const newestFirst = [...reactions].sort(
		(a, b) => b.event.created_at - a.event.created_at,
	);

	newestFirst.forEach((reaction) => {
		const pubkey = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
		const content = normalizeReactionContent(reaction.content);
		const key = `${pubkey}\u0000${content}`;
		if (!pubkey || seen.has(key)) return;
		seen.add(key);
		list.push({
			id: reaction.event.id,
			pubkey,
			content,
			createdAt: reaction.event.created_at,
		});
	});

	return list;
}

function useWorkReactions(entityId: string) {
	const reactions = useWikidataReactionsForEntity(entityId);

	const uniqueReactions = useMemo(() => uniqueWorkReactions(reactions), [reactions]);

	return { reactions: uniqueReactions };
}

export default useWorkReactions;
