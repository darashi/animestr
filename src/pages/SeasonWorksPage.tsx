import { useEffect, useMemo, useRef, useState } from "react";
import WorkCard from "../components/WorkCard";
import useReactionCounts from "../hooks/useReactionCounts";
import useThingstrEntityReactions from "../hooks/useThingstrEntityReactions";
import useVisibleWorkIds from "../hooks/useVisibleWorkIds";
import useWorkDetails from "../hooks/useWorkDetails";
import { buildSeasonQuery } from "../lib/query";
import { buildSeasonPath } from "../lib/routes";
import { buildSeasonTabs, seasonTabKey, type SeasonTab } from "../lib/seasonTabs";
import { seasonLabel, startSeason, type Season } from "../lib/season";
import { fetchWikidataJsonLd } from "../lib/wikidataClient";
import { mapWorksFromJsonLd } from "../lib/workJsonLd";
import { collectVisibleEntityIds, sortSeasonWorks } from "../lib/works";
import type { Work } from "../types/work";

type TabState =
	| { status: "idle"; works: Work[]; error: null }
	| { status: "loading"; works: Work[]; error: null }
	| { status: "loaded"; works: Work[]; error: null }
	| { status: "error"; works: Work[]; error: string };

type SeasonWorksPageProps = {
	active: boolean;
	basePath: string;
	pathSeason: Season | null;
	navigate: (path: string, options?: { replace?: boolean }) => void;
};

const IDLE_TAB_STATE: TabState = { status: "idle", works: [], error: null };

function tabForPath(tabs: SeasonTab[], pathSeason: Season | null): SeasonTab | undefined {
	if (!pathSeason) return undefined;
	const key = seasonTabKey(pathSeason);
	return tabs.find((tab) => tab.key === key);
}

function SeasonWorksPage({ active, basePath, pathSeason, navigate }: SeasonWorksPageProps) {
	const currentSeason = useMemo(() => startSeason(new Date().toISOString()), []);
	const currentSeasonKey = currentSeason ? seasonTabKey(currentSeason) : undefined;
	const tabs = useMemo(() => {
		const seasonTabs = buildSeasonTabs(currentSeason);
		if (pathSeason && !tabForPath(seasonTabs, pathSeason)) {
			seasonTabs.unshift({
				key: seasonTabKey(pathSeason),
				label: seasonLabel(pathSeason),
				season: pathSeason,
			});
		}
		return seasonTabs;
	}, [currentSeason, pathSeason]);
	const defaultTab = tabs.find((tab) => tab.key === currentSeasonKey) ?? tabs[0];
	const activeTab = tabForPath(tabs, pathSeason) ?? defaultTab;
	const [tabStates, setTabStates] = useState<Record<string, TabState>>({});
	const [retryVersion, setRetryVersion] = useState(0);
	const tabStatesRef = useRef(tabStates);
	const requestIdsRef = useRef(new Map<string, number>());
	const activeState = activeTab ? tabStates[activeTab.key] ?? IDLE_TAB_STATE : IDLE_TAB_STATE;
	const { visibleIds, registerWorkRef } = useVisibleWorkIds();
	const worksWithDetails = useWorkDetails(activeState.works, visibleIds);
	const reactionEntityIds = useMemo(
		() => worksWithDetails.map((work) => work.id),
		[worksWithDetails],
	);
	const reactionCounts = useReactionCounts(reactionEntityIds);
	const visibleList = useMemo(
		() => activeTab
			? sortSeasonWorks(worksWithDetails, activeTab.season, reactionCounts)
			: [],
		[activeTab, reactionCounts, worksWithDetails],
	);
	const visibleEntityIds = useMemo(
		() => active ? collectVisibleEntityIds(visibleList, visibleIds) : [],
		[active, visibleIds, visibleList],
	);

	useThingstrEntityReactions(visibleEntityIds);

	const retryActiveTab = () => {
		if (!activeTab) return;
		tabStatesRef.current = { ...tabStatesRef.current, [activeTab.key]: IDLE_TAB_STATE };
		setTabStates(tabStatesRef.current);
		setRetryVersion((current) => current + 1);
	};

	useEffect(() => {
		if (!active || pathSeason || !defaultTab) return;
		navigate(buildSeasonPath(basePath, defaultTab.season), { replace: true });
	}, [active, basePath, defaultTab, navigate, pathSeason]);

	useEffect(() => {
		if (!active || !activeTab || !pathSeason) return;
		const current = tabStatesRef.current[activeTab.key] ?? IDLE_TAB_STATE;
		if (current.status !== "idle") return;

		const key = activeTab.key;
		const requestIds = requestIdsRef.current;
		const requestId = (requestIds.get(key) ?? 0) + 1;
		requestIds.set(key, requestId);
		const loadingState: TabState = { status: "loading", works: current.works, error: null };
		tabStatesRef.current = { ...tabStatesRef.current, [key]: loadingState };
		setTabStates(tabStatesRef.current);

		const controller = new AbortController();
		let settled = false;
		const updateState = (state: TabState) => {
			if (requestIds.get(key) !== requestId) return;
			tabStatesRef.current = { ...tabStatesRef.current, [key]: state };
			setTabStates(tabStatesRef.current);
		};
		const fetchWorks = async () => {
			try {
				const data = await fetchWikidataJsonLd(
					buildSeasonQuery(activeTab.season),
					controller.signal,
				);
				const works = mapWorksFromJsonLd(data).filter((work) => Boolean(work.startDate));
				updateState({ status: "loaded", works, error: null });
			} catch (error) {
				if (!controller.signal.aborted) {
					updateState({
						status: "error",
						works: [],
						error: error instanceof Error ? error.message : "Failed to fetch data",
					});
				}
			} finally {
				settled = true;
			}
		};

		void fetchWorks();
		return () => {
			controller.abort();
			if (!settled && requestIds.get(key) === requestId) {
				tabStatesRef.current = { ...tabStatesRef.current, [key]: IDLE_TAB_STATE };
			}
		};
	}, [active, activeTab, pathSeason, retryVersion]);

	if (!active || !activeTab) return null;

	return (
		<div className="space-y-6">
			<section className="space-y-4">
				<div className="card bg-base-100 shadow-sm">
					<div className="card-body">
						<div role="tablist" className="tabs tabs-box">
							{tabs.map((tab) => (
								<button
									key={tab.key}
									type="button"
									role="tab"
									className={`tab text-sm ${activeTab.key === tab.key ? "tab-active" : ""} ${
										currentSeasonKey === tab.key ? "font-bold" : ""
									}`}
									aria-selected={activeTab.key === tab.key}
									onClick={() => navigate(buildSeasonPath(basePath, tab.season))}
								>
									{tab.label}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="space-y-4">
					{activeState.status === "error" ? (
						<div className="alert alert-error sm:alert-horizontal">
							<span>Failed to load: {activeState.error}</span>
							<button type="button" className="btn btn-sm" onClick={retryActiveTab}>
								Retry
							</button>
						</div>
					) : null}

					{activeState.status === "loading" ? (
						<div className="flex justify-center py-4">
							<span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
						</div>
					) : null}

					{activeState.status === "loaded" ? (
						visibleList.length === 0 ? (
							<p className="text-sm text-base-content/70">
								{activeTab.label}の作品が見つかりませんでした。
							</p>
						) : (
							<ul className="grid gap-4">
								{visibleList.map((work) => (
									<WorkCard
										key={work.id || work.url}
										ref={registerWorkRef(work.id)}
										{...work}
									/>
								))}
							</ul>
						)
					) : null}
				</div>
			</section>
		</div>
	);
}

export default SeasonWorksPage;
