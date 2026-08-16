import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { describe, expect, it } from "vitest";
import {
	buildFollowListFilter,
	followedPubkeysFromEvent,
} from "./followList";

const OWNER_SECRET = new Uint8Array(32).fill(1);
const FOLLOWED_SECRET = new Uint8Array(32).fill(2);
const OTHER_SECRET = new Uint8Array(32).fill(3);
const OWNER = getPublicKey(OWNER_SECRET);
const FOLLOWED = getPublicKey(FOLLOWED_SECRET);

describe("followedPubkeysFromEvent", () => {
	it("loads the logged-in user's own follow list", () => {
		expect(buildFollowListFilter(OWNER)).toEqual({
			kinds: [3],
			authors: [OWNER],
			limit: 1,
		});
	});

	it("reads followed users from the owner's NIP-02 follow list", () => {
		const event = finalizeEvent({
			kind: 3,
			created_at: 1,
			content: "",
			tags: [
				["p", FOLLOWED, "wss://relay.example", "friend"],
				["p", FOLLOWED],
				["p", "invalid"],
			],
		}, OWNER_SECRET);

		expect(followedPubkeysFromEvent(event, OWNER)).toEqual(new Set([FOLLOWED]));
	});

	it("rejects a follow list authored by someone else", () => {
		const event = finalizeEvent({
			kind: 3,
			created_at: 1,
			content: "",
			tags: [["p", FOLLOWED]],
		}, OTHER_SECRET);

		expect(followedPubkeysFromEvent(event, OWNER)).toBeNull();
	});

	it("rejects an event with an invalid signature", () => {
		const signedEvent = finalizeEvent({
			kind: 3,
			created_at: 1,
			content: "",
			tags: [["p", FOLLOWED]],
		}, OWNER_SECRET);
		const event = JSON.parse(JSON.stringify(signedEvent)) as typeof signedEvent;
		event.sig = "0".repeat(128);

		expect(followedPubkeysFromEvent(event, OWNER)).toBeNull();
	});
});
