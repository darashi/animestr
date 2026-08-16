import { useEffect, useMemo, useRef, useState } from "react";
import { buildWorkDetailsQuery } from "../lib/query";
import { fetchWikidataJsonLd } from "../lib/wikidataClient";
import { mapWorksFromJsonLd } from "../lib/workJsonLd";
import { mergeWorkDetails, workDetailsFrom } from "../lib/works";
import { createEmptyWorkDetails, type Work, type WorkDetails } from "../types/work";

type DetailsState = {
	byId: Record<string, WorkDetails>;
	fetchedIds: Set<string>;
};

const RETRY_COUNT = 1;

function useWorkDetails(works: Work[], visibleWorkIds: ReadonlySet<string>) {
	const [state, setState] = useState<DetailsState>(() => ({
		byId: {},
		fetchedIds: new Set(),
	}));
	const pendingIdsRef = useRef(new Set<string>());
	const controllersRef = useRef(new Set<AbortController>());
	const targetIds = useMemo(
		() => works.filter((work) => visibleWorkIds.has(work.id)).map((work) => work.id),
		[visibleWorkIds, works],
	);
	const missingIds = useMemo(
		() => targetIds.filter(
			(id) => id && !state.fetchedIds.has(id) && !pendingIdsRef.current.has(id),
		),
		[state.fetchedIds, targetIds],
	);

	useEffect(() => {
		const controllers = controllersRef.current;
		const pendingIds = pendingIdsRef.current;
		return () => {
			controllers.forEach((controller) => controller.abort());
			pendingIds.clear();
		};
	}, []);

	useEffect(() => {
		if (missingIds.length === 0) return;

		const pendingIds = pendingIdsRef.current;
		const requestIds = missingIds.filter((id) => !pendingIds.has(id));
		if (requestIds.length === 0) return;
		requestIds.forEach((id) => pendingIds.add(id));
		const controller = new AbortController();
		controllersRef.current.add(controller);
		const fetchDetails = async () => {
			try {
				for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
					try {
						const query = buildWorkDetailsQuery(requestIds);
						if (!query) return;
						const data = await fetchWikidataJsonLd(query, controller.signal);
						const detailsById = new Map(
							mapWorksFromJsonLd(data).map((work) => [work.id, workDetailsFrom(work)]),
						);

						setState((current) => {
							const byId = { ...current.byId };
							const fetchedIds = new Set(current.fetchedIds);
							for (const id of requestIds) {
								byId[id] = detailsById.get(id) ?? current.byId[id] ?? createEmptyWorkDetails();
								fetchedIds.add(id);
							}
							return { byId, fetchedIds };
						});
						return;
					} catch (error) {
						if (controller.signal.aborted) return;
						if (attempt === RETRY_COUNT) {
							console.error("Failed to load work details", error);
						}
					}
				}
			} finally {
				requestIds.forEach((id) => pendingIds.delete(id));
				controllersRef.current.delete(controller);
			}
		};

		void fetchDetails();
	}, [missingIds]);

	return useMemo(() => mergeWorkDetails(works, state.byId), [state.byId, works]);
}

export default useWorkDetails;
