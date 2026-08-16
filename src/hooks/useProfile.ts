import { useEffect, useMemo, useState } from "react";
import { ProfileModel } from "applesauce-core/models";
import useEventStore from "./useEventStore";
import useRelayPool from "./useRelayPool";
import { PROFILE_RELAYS } from "../config/relays";
import { isProfileEventFor } from "../lib/nostr";

type ProfileState = {
	picture: string | null;
	name: string | null;
	pubkey: string | null;
};

function useProfile(pubkey: string | null | undefined) {
	const eventStore = useEventStore();
	const relayPool = useRelayPool();
	const [profile, setProfile] = useState<ProfileState>({
		picture: null,
		name: null,
		pubkey: null,
	});

	useEffect(() => {
		if (!pubkey) return;
		if (!PROFILE_RELAYS.length) return;
		if (eventStore.getReplaceable(0, pubkey)) return;

		const group = relayPool.group(PROFILE_RELAYS);
		const sub = group
			.request(
				{ kinds: [0], authors: [pubkey], limit: 1 },
				{ reconnect: Infinity, resubscribe: { delay: 1_000 } },
			)
			.subscribe({
				next: (event) => {
					if (isProfileEventFor(event, pubkey)) eventStore.add(event);
				},
				error: (error) => console.error("Failed to load profile", error),
			});

		return () => sub.unsubscribe();
	}, [eventStore, pubkey, relayPool]);

	useEffect(() => {
		if (!pubkey) return;
		const model$ = eventStore.model(ProfileModel, pubkey);
		const sub = model$.subscribe((profileModel) => {
			const nextPicture = profileModel?.picture ?? null;
			const nextName =
				(profileModel as { display_name?: string })?.display_name ??
				(profileModel as { name?: string })?.name ??
				null;
			setProfile({ picture: nextPicture, name: nextName, pubkey });
		});
		return () => sub.unsubscribe();
	}, [eventStore, pubkey]);

	const result = useMemo(() => {
		const isCurrent = Boolean(pubkey) && profile.pubkey === pubkey;
		return {
			picture: isCurrent ? profile.picture : null,
			name: isCurrent ? profile.name : null,
			isLoading: Boolean(pubkey) && !isCurrent,
		};
	}, [profile, pubkey]);

	return result;
}

export default useProfile;
