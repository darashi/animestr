import type { Filter } from "nostr-tools";
import type { NostrEvent } from "nostr-tools/pure";
import { isVerifiedNostrEvent, normalizePubkey } from "./nostr";

export function buildFollowListFilter(pubkey: string): Filter {
	return { kinds: [3], authors: [pubkey], limit: 1 };
}

export function followedPubkeysFromEvent(
	value: unknown,
	expectedAuthor: string,
): Set<string> | null {
	if (!isVerifiedNostrEvent(value)) return null;
	if (value.kind !== 3 || value.pubkey !== expectedAuthor) return null;

	const pubkeys = new Set<string>();
	for (const [key, candidate] of value.tags) {
		if (key !== "p" || typeof candidate !== "string") continue;
		const pubkey = normalizePubkey(candidate);
		if (pubkey) pubkeys.add(pubkey);
	}
	return pubkeys;
}

export function isFollowListEventFor(
	value: unknown,
	expectedAuthor: string,
): value is NostrEvent {
	return followedPubkeysFromEvent(value, expectedAuthor) !== null;
}
