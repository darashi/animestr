import { useEffect, useState } from "react";
import {
	searchAnimestrEntities,
	type AnimestrSearchResult,
} from "../lib/wikidataSearch";

type SearchState = {
	results: AnimestrSearchResult[];
	isLoading: boolean;
	error: string | null;
};

const EMPTY_STATE: SearchState = {
	results: [],
	isLoading: false,
	error: null,
};

function useWikidataSearch(query: string, language: string) {
	const [state, setState] = useState<SearchState>(EMPTY_STATE);

	useEffect(() => {
		const trimmedQuery = query.trim();
		if (!trimmedQuery) {
			setState(EMPTY_STATE);
			return;
		}

		const controller = new AbortController();
		setState({ results: [], isLoading: true, error: null });
		void searchAnimestrEntities(trimmedQuery, language, controller.signal)
			.then((results) => {
				setState({ results, isLoading: false, error: null });
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) return;
				setState({
					results: [],
					isLoading: false,
					error: error instanceof Error ? error.message : "Failed to search Wikidata",
				});
			});

		return () => controller.abort();
	}, [language, query]);

	return state;
}

export default useWikidataSearch;
