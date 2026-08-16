import { finalizeEvent } from "nostr-tools/pure";
import { describe, expect, it } from "vitest";
import { AppEventStore } from "./eventStoreContext";

const OWNER_SECRET = new Uint8Array(32).fill(1);

describe("AppEventStore", () => {
	it("keeps deletion events out of the underlying EventStore", () => {
		const store = new AppEventStore();
		const reaction = finalizeEvent({
			kind: 17,
			created_at: 1,
			tags: [["i", "wikidata:Q1"]],
			content: "+",
		}, OWNER_SECRET);
		const deletion = finalizeEvent({
			kind: 5,
			created_at: 2,
			tags: [["e", reaction.id]],
			content: "",
		}, OWNER_SECRET);

		expect(store.add(reaction)).toBe(reaction);
		expect(store.add(deletion)).toBeNull();
		expect(store.hasEvent(reaction.id)).toBe(true);
	});
});
