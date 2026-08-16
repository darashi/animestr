import { useEffect, useState } from "react";
import { fetchWikidataJsonLd } from "../lib/wikidataClient";
import { parseWorkJsonLd } from "../lib/workJsonLd";
import { sortWorksByStartDate } from "../lib/works";
import type { Work } from "../types/work";

type EntityWorksState = {
	entityId: string;
	works: Work[];
	entityName: string;
	entityDescription?: string;
	loading: boolean;
	error: string | null;
};

function useEntityWorks(entityId: string, buildQuery: (entityId: string) => string) {
	const [state, setState] = useState<EntityWorksState>({
		entityId,
		works: [],
		entityName: entityId,
		loading: true,
		error: null,
	});

	useEffect(() => {
		const controller = new AbortController();
		const fetchWorks = async () => {
			try {
				const query = buildQuery(entityId);
				if (!query) {
					setState({
						entityId,
						works: [],
						entityName: entityId,
						loading: false,
						error: null,
					});
					return;
				}
				const data = await fetchWikidataJsonLd(query, controller.signal);
				const { works, labels, descriptions } = parseWorkJsonLd(data);
				setState({
					entityId,
					works: sortWorksByStartDate(works, "desc"),
					entityName: labels.get(entityId) ?? entityId,
					entityDescription: descriptions.get(entityId),
					loading: false,
					error: null,
				});
			} catch (error) {
				if (controller.signal.aborted) return;
				setState({
					entityId,
					works: [],
					entityName: entityId,
					loading: false,
					error: error instanceof Error ? error.message : "Failed to fetch data",
				});
			}
		};

		void fetchWorks();
		return () => controller.abort();
	}, [buildQuery, entityId]);

	if (state.entityId === entityId) return state;
	return {
		entityId,
		works: [],
		entityName: entityId,
		loading: true,
		error: null,
	};
}

export default useEntityWorks;
