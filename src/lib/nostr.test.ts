import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { describe, expect, it } from "vitest";
import { signedEventMatchesTemplate } from "./nip07";
import { isProfileEventFor } from "./nostr";

const OWNER_SECRET = new Uint8Array(32).fill(1);
const OTHER_SECRET = new Uint8Array(32).fill(2);
const OWNER = getPublicKey(OWNER_SECRET);

describe("isProfileEventFor", () => {
	it("accepts only a signed metadata event from the requested author", () => {
		const profile = finalizeEvent({
			kind: 0,
			created_at: 1,
			tags: [],
			content: "{}",
		}, OWNER_SECRET);
		const otherProfile = finalizeEvent({
			kind: 0,
			created_at: 1,
			tags: [],
			content: "{}",
		}, OTHER_SECRET);
		const deletion = finalizeEvent({
			kind: 5,
			created_at: 1,
			tags: [["e", profile.id]],
			content: "",
		}, OWNER_SECRET);

		expect(isProfileEventFor(profile, OWNER)).toBe(true);
		expect(isProfileEventFor(otherProfile, OWNER)).toBe(false);
		expect(isProfileEventFor(deletion, OWNER)).toBe(false);
	});
});

describe("signedEventMatchesTemplate", () => {
	it("accepts an unchanged NIP-07 event template", () => {
		const template = {
			kind: 17,
			created_at: 1,
			tags: [["i", "wd:Q42"]],
			content: "+",
		};
		const event = finalizeEvent(template, OWNER_SECRET);

		expect(signedEventMatchesTemplate(event, template)).toBe(true);
	});

	it("rejects a signed event whose content was changed", () => {
		const template = {
			kind: 17,
			created_at: 1,
			tags: [["i", "wd:Q42"]],
			content: "+",
		};
		const event = finalizeEvent({ ...template, content: "-" }, OWNER_SECRET);

		expect(signedEventMatchesTemplate(event, template)).toBe(false);
	});
});
