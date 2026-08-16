import { useEffect, useState } from "react";
import { buildWorkDetailsQuery } from "../lib/query";
import { fetchWikidataJsonLd } from "../lib/wikidataClient";
import { mapWorksFromJsonLd } from "../lib/workJsonLd";
import type { Work } from "../types/work";

type WorkState = {
	work: Work | null;
	loading: boolean;
	error: string | null;
};

function useWork(workId: string) {
	const [state, setState] = useState<WorkState>({
		work: null,
		loading: true,
		error: null,
	});

	useEffect(() => {
		const controller = new AbortController();
		setState({ work: null, loading: true, error: null });

		const loadWork = async () => {
			try {
				const data = await fetchWikidataJsonLd(
					buildWorkDetailsQuery([workId]),
					controller.signal,
				);
				const work = mapWorksFromJsonLd(data).find((item) => item.id === workId);
				if (!work) throw new Error("Work not found");
				setState({ work, loading: false, error: null });
			} catch (error) {
				if (controller.signal.aborted) return;
				setState({
					work: null,
					loading: false,
					error: error instanceof Error ? error.message : "Failed to fetch work",
				});
			}
		};

		void loadWork();
		return () => controller.abort();
	}, [workId]);

	return state;
}

export default useWork;
