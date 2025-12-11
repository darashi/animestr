import { useEffect, useMemo, useState } from "react";
import WorkCard from "./components/WorkCard";
import Navbar from "./components/Navbar";
import { sortByStartDate } from "./lib/broadcast";
import { buildSeasonQuery } from "./lib/query";
import { seasonLabel, seasonKeyValue, shiftSeason, startSeason, type Season } from "./lib/season";
import useReactionCounts from "./hooks/useReactionCounts";

type Work = {
	id: string;
	title: string;
	startDate?: string;
	endDate?: string;
	url: string;
};

type SeasonTabConfig = { key: string; label: string; type: "season"; season: Season };
type TabConfig = SeasonTabConfig;

const SEASON_PAST_COUNT = 7;
const SEASON_FUTURE_COUNT = 2;

function buildSeasonTabs(currentSeason: Season | undefined): SeasonTabConfig[] {
	if (!currentSeason) return [];

	const deltas: number[] = [];
	for (let i = SEASON_PAST_COUNT; i >= 1; i--) deltas.push(-i);
	deltas.push(0);
	for (let i = 1; i <= SEASON_FUTURE_COUNT; i++) deltas.push(i);

	const seasons = deltas.map((delta) => (delta === 0 ? currentSeason : shiftSeason(currentSeason, delta)));

	return seasons
		.sort((a, b) => seasonKeyValue(b.year, b.idx) - seasonKeyValue(a.year, a.idx))
		.map((season) => ({
			key: `season-${season.year}-${season.idx}`,
			label: seasonLabel(season),
			type: "season" as const,
			season,
		}));
}

function App() {
	const currentSeason = useMemo(() => startSeason(new Date().toISOString()), []);
	const tabConfigs = useMemo<TabConfig[]>(() => {
		const seasonTabs = buildSeasonTabs(currentSeason);
		return seasonTabs;
	}, [currentSeason]);
	const currentSeasonKey = currentSeason ? `season-${currentSeason.year}-${currentSeason.idx}` : undefined;
	const seasonTabs = tabConfigs.filter((tab): tab is SeasonTabConfig => tab.type === "season");
	const defaultSeasonTab =
		seasonTabs.find((tab) => currentSeason && tab.key === `season-${currentSeason.year}-${currentSeason.idx}`) ??
		seasonTabs[0];
	const [dataByTab, setDataByTab] = useState<Record<string, Work[]>>(() =>
		Object.fromEntries(tabConfigs.map((tab) => [tab.key, []])),
	);
	const [activeTabKey, setActiveTabKey] = useState<string>(defaultSeasonTab?.key ?? "");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const activeTab = tabConfigs.find((tab) => tab.key === activeTabKey) ?? tabConfigs[0];
	const activeList = activeTab ? dataByTab[activeTab.key] ?? [] : [];
	const reactionCounts = useReactionCounts(activeList.map((work) => work.id));
	const visibleList = useMemo(() => {
		return [...activeList].sort((a, b) => {
			const countDiff = (reactionCounts.get(b.id) ?? 0) - (reactionCounts.get(a.id) ?? 0);
			if (countDiff !== 0) return countDiff;
			return (a.startDate ?? "").localeCompare(b.startDate ?? "");
		});
	}, [activeList, reactionCounts]);
	const emptyMessage = `${activeTab?.label ?? "選択したクール"}の作品が見つかりませんでした。`;

	useEffect(() => {
		const controller = new AbortController();
		const fetchWorks = async () => {
			if (!activeTab) return;
			if (dataByTab[activeTab.key]?.length > 0) return;
			setLoading(true);
			setError(null);
			try {
				const query = buildSeasonQuery(activeTab.season);
				const response = await fetch(
					`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
					{
						method: "GET",
						signal: controller.signal,
						headers: {
							Accept: "application/sparql-results+json",
						},
					},
				);

				if (!response.ok) {
					throw new Error(`Wikidata request failed with status ${response.status}`);
				}

				const data = await response.json();
				const bindings = data?.results?.bindings ?? [];
				const mapped: Work[] = bindings.map((item: any) => ({
					id: item.item?.value ? item.item.value.replace("http://www.wikidata.org/entity/", "") : "",
					title: item.itemLabel?.value ?? "Unknown title",
					startDate: item.start?.value,
					endDate: item.end?.value,
					url: item.item?.value ?? "",
				}));

				const sorted = sortByStartDate(mapped.filter((work) => Boolean(work.startDate)), "asc");

				setDataByTab((prev) => ({ ...prev, [activeTab.key]: sorted }));
			} catch (err) {
				if (controller.signal.aborted) return;
				setError(err instanceof Error ? err.message : "Failed to fetch data");
			} finally {
				if (!controller.signal.aborted) {
					setLoading(false);
				}
			}
		};

		fetchWorks();
		return () => controller.abort();
	}, [activeTab, activeTabKey, dataByTab, tabConfigs]);

	return (
		<div className="min-h-screen bg-base-200 text-base-content">
			<Navbar />
			<main className="container mx-auto px-4 py-10">
				<div className="space-y-6">
					{loading && (
						<div className="flex justify-center py-4">
							<span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
						</div>
					)}

					{!loading && error && (
						<div className="alert alert-error">
							<span>Failed to load: {error}</span>
						</div>
					)}

					{!loading && !error && (
						<section className="space-y-4">
							<div className="card bg-base-100 shadow-sm">
								<div className="card-body">
									<div role="tablist" className="tabs tabs-box">
										{tabConfigs.map((tab) => (
											<button
												key={tab.key}
												type="button"
												role="tab"
												className={`tab text-sm ${activeTab?.key === tab.key ? "tab-active" : ""} ${
													currentSeasonKey === tab.key ? "font-bold" : ""
												}`}
												aria-selected={activeTab?.key === tab.key}
												onClick={() => setActiveTabKey(tab.key)}
											>
												{tab.label}
											</button>
										))}
									</div>
								</div>
							</div>

							<div>
								{visibleList.length === 0 ? (
									<p className="text-sm text-base-content/70">{emptyMessage}</p>
								) : (
									<ul className="grid gap-4">
										{visibleList.map((work) => (
											<WorkCard key={work.id || work.url} {...work} />
										))}
									</ul>
								)}
							</div>
						</section>
					)}
				</div>
			</main>
		</div>
	);
}

export default App;
