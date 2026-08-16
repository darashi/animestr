import {
	validateEvent,
	verifyEvent,
	type NostrEvent,
} from "nostr-tools/pure";

const HEX_PUBKEY_REGEX = /^[0-9a-f]{64}$/i;

export function isVerifiedNostrEvent(value: unknown): value is NostrEvent {
	if (!validateEvent(value)) return false;
	const event = value as Partial<NostrEvent>;
	if (typeof event.id !== "string" || typeof event.sig !== "string") return false;
	return verifyEvent(event as NostrEvent);
}

export function isProfileEventFor(value: unknown, pubkey: string): value is NostrEvent {
	return isVerifiedNostrEvent(value) && value.kind === 0 && value.pubkey === pubkey;
}

export function normalizePubkey(input: string): string | null {
	const value = input.trim();
	if (!value) return null;
	if (HEX_PUBKEY_REGEX.test(value)) {
		return value.toLowerCase();
	}
	// Support for npub decoding can be added later if needed.
	return null;
}

export function formatShortPubkey(pubkey: string): string {
	if (pubkey.length <= 16) return pubkey;
	return `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`;
}
