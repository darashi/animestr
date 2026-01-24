import { useEffect, useMemo, useRef } from "react";
import { THINGSTR_RELAYS } from "../config/relays";
import { withWikidataPrefix } from "../lib/wikidata";
import useEventStore from "./useEventStore";
import useRelayPool from "./useRelayPool";

function useThingstrEntityReactions(entityIds: string[]) {
	const eventStore = useEventStore();
	const relayPool = useRelayPool();
	const requestedRef = useRef<Set<string>>(new Set());

	const ids = useMemo(() => {
		return Array.from(new Set(entityIds.filter(Boolean))).sort();
	}, [entityIds]);

	useEffect(() => {
		if (!THINGSTR_RELAYS.length) return;
		if (ids.length === 0) return;

		const pending = ids.filter((id) => !requestedRef.current.has(id));
		if (pending.length === 0) return;

		pending.forEach((id) => requestedRef.current.add(id));

		const group = relayPool.group(THINGSTR_RELAYS);
		const filters = [
			{
				kinds: [17],
				"#k": ["wikidata"],
				"#i": pending.map((id) => withWikidataPrefix(id)),
				limit: 500,
			},
			{ kinds: [5], limit: 500 },
		];

		const requestSub = group.request(filters, { eventStore }).subscribe({
			next: (event) => {
				if (!event || typeof event === "string") return;
				eventStore.add(event as never);
			},
			error: (error) => console.error("Failed to request Thingstr reactions for entities", error),
		});

		const liveSub = group.subscription(filters, { eventStore }).subscribe({
			next: (event) => {
				if (!event || typeof event === "string") return;
				eventStore.add(event as never);
			},
			error: (error) => console.error("Failed to subscribe to Thingstr reactions for entities", error),
		});

		return () => {
			requestSub.unsubscribe();
			liveSub.unsubscribe();
		};
	}, [eventStore, ids, relayPool]);
}

export default useThingstrEntityReactions;
