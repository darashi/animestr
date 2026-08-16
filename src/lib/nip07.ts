import type { EventTemplate, NostrEvent } from "nostr-tools/pure";
import { isVerifiedNostrEvent, normalizePubkey } from "./nostr";

const NIP07_REQUEST_TIMEOUT_MS = 60_000;

function getNip07Provider() {
	if (!window.nostr?.getPublicKey) {
		throw new Error("No NIP-07 signer was found in this browser.");
	}
	return window.nostr;
}

async function waitForNip07<T>(request: Promise<T>): Promise<T> {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			request,
			new Promise<never>((_, reject) => {
				timeout = setTimeout(() => {
					reject(
						new Error(
							"The Nostr signer did not respond. Approve the request in the signer popup and try again.",
						),
					);
				}, NIP07_REQUEST_TIMEOUT_MS);
			}),
		]);
	} finally {
		if (timeout !== undefined) clearTimeout(timeout);
	}
}

export async function requestNip07PublicKey(): Promise<string> {
	const pubkey = normalizePubkey(
		await waitForNip07(getNip07Provider().getPublicKey!()),
	);
	if (!pubkey) throw new Error("NIP-07 provider returned an invalid public key");
	return pubkey;
}

export function signedEventMatchesTemplate(
	event: NostrEvent,
	template: EventTemplate,
): boolean {
	return event.kind === template.kind
		&& event.created_at === template.created_at
		&& event.content === template.content
		&& JSON.stringify(event.tags) === JSON.stringify(template.tags);
}

export async function signEventWithNip07(
	template: EventTemplate,
	expectedPubkey: string,
): Promise<NostrEvent> {
	const provider = getNip07Provider();
	if (!provider.signEvent) throw new Error("The NIP-07 signer cannot sign events.");

	const activePubkey = await requestNip07PublicKey();
	if (activePubkey !== expectedPubkey) {
		throw new Error("NIP-07 account does not match the logged-in account");
	}

	const event = await waitForNip07(provider.signEvent(template));
	if (!isVerifiedNostrEvent(event)) {
		throw new Error("NIP-07 provider returned an invalid signed event");
	}
	if (event.pubkey !== expectedPubkey) {
		throw new Error("Signed event author does not match the logged-in account");
	}
	if (!signedEventMatchesTemplate(event, template)) {
		throw new Error("NIP-07 provider changed the event template");
	}
	return event;
}
