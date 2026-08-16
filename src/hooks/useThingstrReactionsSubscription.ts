import { useEffect } from "react";
import { THINGSTR_RELAYS } from "../config/relays";
import { buildThingstrLiveFilters } from "../lib/reactionFilters";
import { ingestRelayEvent } from "../lib/reactionEventStore";
import useEventStore from "./useEventStore";
import useRelayPool from "./useRelayPool";

function useThingstrReactionsSubscription() {
	const eventStore = useEventStore();
	const relayPool = useRelayPool();

	useEffect(() => {
		if (!THINGSTR_RELAYS.length) return;

		const group = relayPool.group(THINGSTR_RELAYS);
		const handleEvent = (event: unknown) => {
			ingestRelayEvent(eventStore, event);
		};
		const filters = buildThingstrLiveFilters();

		const liveSub = group.subscription(filters, {
			reconnect: Infinity,
			resubscribe: { delay: 1_000 },
		}).subscribe({
			next: handleEvent,
			error: (error) => console.error("Failed to subscribe to reactions from THINGSTR relays", error),
		});

		return () => {
			liveSub.unsubscribe();
		};
	}, [eventStore, relayPool]);
}

export default useThingstrReactionsSubscription;
