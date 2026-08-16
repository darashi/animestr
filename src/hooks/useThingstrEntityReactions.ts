import { useEffect, useMemo, useRef } from "react";
import { THINGSTR_RELAYS } from "../config/relays";
import {
	buildEntityReactionFilters,
	buildReactionDeletionFilter,
} from "../lib/reactionFilters";
import { ingestRelayEvent } from "../lib/reactionEventStore";
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

		const requestedIds = requestedRef.current;
		const pending = ids.filter((id) => !requestedIds.has(id));
		if (pending.length === 0) return;

		pending.forEach((id) => requestedIds.add(id));

		const group = relayPool.group(THINGSTR_RELAYS);
		const requestOptions = {
			reconnect: Infinity,
			resubscribe: { delay: 1_000 },
		};
		const handleEvent = (event: unknown) => {
			return ingestRelayEvent(eventStore, event);
		};
		const reactionEventIds = new Set<string>();
		const deletionSubscriptions: Array<{ unsubscribe: () => void }> = [];
		let deletionTimer: ReturnType<typeof setTimeout> | undefined;
		let reactionRequestCompleted = false;
		let pendingDeletionRequests = 0;
		let completed = false;

		const updateCompleted = () => {
			completed = reactionRequestCompleted
				&& deletionTimer === undefined
				&& reactionEventIds.size === 0
				&& pendingDeletionRequests === 0;
		};
		const requestDeletions = () => {
			deletionTimer = undefined;
			const eventIds = [...reactionEventIds];
			reactionEventIds.clear();
			if (eventIds.length === 0) {
				updateCompleted();
				return;
			}

			pendingDeletionRequests += 1;
			const subscription = group
				.request(buildReactionDeletionFilter(eventIds), requestOptions)
				.subscribe({
					next: handleEvent,
					error: (error) => {
						pendingDeletionRequests -= 1;
						pending.forEach((id) => requestedIds.delete(id));
						console.error("Failed to request Thingstr reaction deletions", error);
					},
					complete: () => {
						pendingDeletionRequests -= 1;
						updateCompleted();
					},
				});
			deletionSubscriptions.push(subscription);
		};
		const scheduleDeletionRequest = () => {
			if (deletionTimer !== undefined) return;
			deletionTimer = setTimeout(requestDeletions, 100);
		};

		const requestSub = group
			.request(buildEntityReactionFilters(pending), requestOptions)
			.subscribe({
				next: (event) => {
					const reaction = handleEvent(event);
					if (reaction?.kind !== 17) return;
					reactionEventIds.add(reaction.id);
					scheduleDeletionRequest();
				},
				error: (error) => {
					pending.forEach((id) => requestedIds.delete(id));
					console.error("Failed to request Thingstr reactions for entities", error);
				},
				complete: () => {
					reactionRequestCompleted = true;
					if (deletionTimer !== undefined) clearTimeout(deletionTimer);
					requestDeletions();
				},
			});

		return () => {
			if (deletionTimer !== undefined) clearTimeout(deletionTimer);
			requestSub.unsubscribe();
			deletionSubscriptions.forEach((subscription) => subscription.unsubscribe());
			if (!completed) pending.forEach((id) => requestedIds.delete(id));
		};
	}, [eventStore, ids, relayPool]);
}

export default useThingstrEntityReactions;
