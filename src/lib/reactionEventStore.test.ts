import type { EventStore } from "applesauce-core";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { describe, expect, it, vi } from "vitest";
import {
	buildDeletionAuthorsByEventId,
	ingestRelayEvent,
	isEventDeleted,
} from "./reactionEventStore";
import type { ReactionEvent } from "../providers/wikidataReactionsContext";

const OWNER_SECRET = new Uint8Array(32).fill(1);
const ATTACKER_SECRET = new Uint8Array(32).fill(2);
const OWNER = getPublicKey(OWNER_SECRET);
const ATTACKER = getPublicKey(ATTACKER_SECRET);

function deletion(secretKey: Uint8Array, targetId: string): ReactionEvent {
	return finalizeEvent({
		created_at: 1,
		tags: [["e", targetId]],
		content: "",
		kind: 5,
	}, secretKey);
}

describe("reaction deletion events", () => {
	it("keeps the deletion author for each referenced event", () => {
		const authors = buildDeletionAuthorsByEventId([
			deletion(OWNER_SECRET, "reaction"),
			deletion(ATTACKER_SECRET, "reaction"),
		]);

		expect(authors.get("reaction")).toEqual(new Set([OWNER, ATTACKER]));
		expect(authors.get("reaction")?.has(OWNER)).toBe(true);
		expect(authors.get("reaction")?.has("someone-else")).toBe(false);
	});

	it("only deletes an event when its author requested the deletion", () => {
		const reaction = finalizeEvent({
			created_at: 1,
			tags: [],
			content: "+",
			kind: 17,
		}, OWNER_SECRET);

		expect(isEventDeleted(
			reaction,
			buildDeletionAuthorsByEventId([deletion(ATTACKER_SECRET, reaction.id)]),
		)).toBe(false);
		expect(isEventDeleted(
			reaction,
			buildDeletionAuthorsByEventId([deletion(OWNER_SECRET, reaction.id)]),
		)).toBe(true);
	});

	it("ignores tags that do not reference event IDs", () => {
		const event = deletion(OWNER_SECRET, "reaction");
		event.tags = [["a", "17:owner:identifier"]];

		expect(buildDeletionAuthorsByEventId([event])).toEqual(new Map());
	});

	it("keeps deletion requests out of the EventStore", () => {
		const add = vi.fn();
		const eventStore = { add } as unknown as EventStore;

		ingestRelayEvent(eventStore, deletion(OWNER_SECRET, "reaction"));

		expect(add).not.toHaveBeenCalled();
	});

	it("adds valid reaction events to the EventStore", () => {
		const add = vi.fn();
		const eventStore = { add } as unknown as EventStore;
		const reaction = finalizeEvent({
			created_at: 1,
			tags: [["i", "wikidata:Q1"]],
			content: "+",
			kind: 17,
		}, OWNER_SECRET);

		ingestRelayEvent(eventStore, reaction);

		expect(add).toHaveBeenCalledWith(reaction);
	});

	it("rejects events with invalid signatures", () => {
		const add = vi.fn();
		const eventStore = { add } as unknown as EventStore;
		const signedReaction = finalizeEvent({
			created_at: 1,
			tags: [["i", "wikidata:Q1"]],
			content: "+",
			kind: 17,
		}, OWNER_SECRET);
		const reaction = JSON.parse(JSON.stringify(signedReaction)) as ReactionEvent;
		reaction.sig = "0".repeat(128);

		ingestRelayEvent(eventStore, reaction);

		expect(add).not.toHaveBeenCalled();
	});
});
