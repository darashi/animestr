import type { NostrEvent } from "nostr-tools";
import { describe, expect, it } from "vitest";
import type { WikidataReaction } from "../providers/wikidataReactionsContext";
import { uniqueWorkReactions } from "./useWorkReactions";

function reaction(
	id: string,
	pubkey: string,
	content: string,
	createdAt: number,
): WikidataReaction {
	return {
		entityId: "Q1",
		pubkey,
		content,
		event: {
			id,
			pubkey,
			content,
			created_at: createdAt,
			kind: 17,
			tags: [],
			sig: "",
		} as NostrEvent,
	};
}

describe("uniqueWorkReactions", () => {
	it("keeps different reactions from the same user", () => {
		const reactions = uniqueWorkReactions([
			reaction("star", "alice", "+", 1),
			reaction("fire", "alice", "🔥", 2),
		]);

		expect(reactions.map(({ content }) => content)).toEqual(["🔥", "+"]);
	});

	it("keeps only the newest duplicate reaction from a user", () => {
		const reactions = uniqueWorkReactions([
			reaction("old", "alice", "🔥", 1),
			reaction("new", "alice", "🔥", 2),
		]);

		expect(reactions).toHaveLength(1);
		expect(reactions[0]?.id).toBe("new");
	});
});
