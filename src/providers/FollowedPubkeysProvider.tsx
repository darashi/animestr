import { useEffect, useState, type ReactNode } from "react";
import { PROFILE_RELAYS } from "../config/relays";
import useEventStore from "../hooks/useEventStore";
import useNip07Auth from "../hooks/useNip07Auth";
import useRelayPool from "../hooks/useRelayPool";
import {
	buildFollowListFilter,
	followedPubkeysFromEvent,
	isFollowListEventFor,
} from "../lib/followList";
import { FollowedPubkeysContext } from "./followedPubkeysContext";

const EMPTY_FOLLOWED_PUBKEYS = new Set<string>();

type FollowedPubkeysState = {
	owner: string | null;
	pubkeys: ReadonlySet<string>;
};

function FollowedPubkeysProvider({ children }: { children: ReactNode }) {
	const eventStore = useEventStore();
	const relayPool = useRelayPool();
	const { session } = useNip07Auth();
	const [state, setState] = useState<FollowedPubkeysState>({
		owner: null,
		pubkeys: EMPTY_FOLLOWED_PUBKEYS,
	});
	const activePubkey = session?.pubkey ?? null;
	const followedPubkeys = state.owner === activePubkey
		? state.pubkeys
		: EMPTY_FOLLOWED_PUBKEYS;

	useEffect(() => {
		const pubkey = session?.pubkey;
		if (!pubkey) return;

		const syncFromStore = () => {
			const event = eventStore.getReplaceable(3, pubkey);
			setState({
				owner: pubkey,
				pubkeys: followedPubkeysFromEvent(event, pubkey) ?? new Set(),
			});
		};
		const filter = buildFollowListFilter(pubkey);
		syncFromStore();

		const storeSub = eventStore.filters(filter).subscribe(syncFromStore);
		if (PROFILE_RELAYS.length === 0) {
			return () => storeSub.unsubscribe();
		}

		const group = relayPool.group(PROFILE_RELAYS);
		const options = {
			reconnect: Infinity,
			resubscribe: { delay: 1_000 },
		};
		const handleEvent = (event: unknown) => {
			if (!isFollowListEventFor(event, pubkey)) return;
			eventStore.add(event);
			syncFromStore();
		};
		const requestSub = group.request(filter, options).subscribe({
			next: handleEvent,
			error: (requestError) => {
				console.error("Failed to load the Nostr follow list", requestError);
			},
		});
		const liveSub = group.subscription(filter, options).subscribe({
			next: handleEvent,
			error: (subscriptionError) => {
				console.error(
					"Failed to subscribe to the Nostr follow list",
					subscriptionError,
				);
			},
		});

		return () => {
			storeSub.unsubscribe();
			requestSub.unsubscribe();
			liveSub.unsubscribe();
		};
	}, [eventStore, relayPool, session?.pubkey]);

	return (
		<FollowedPubkeysContext.Provider value={followedPubkeys}>
			{children}
		</FollowedPubkeysContext.Provider>
	);
}

export default FollowedPubkeysProvider;
