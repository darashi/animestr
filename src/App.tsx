import { useEffect, useMemo, useState } from "react";
import WorkCard from "./components/WorkCard";
import Navbar from "./components/Navbar";
import { sortByStartDate } from "./lib/broadcast";
import { buildSeasonQuery } from "./lib/query";
import { seasonFromYearIdx, seasonLabel, seasonKeyValue, shiftSeason, startSeason, type Season } from "./lib/season";
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
const SEASON_PATH_PATTERN = /^\/seasons\/(\d{4})Q([1-4])\/?$/;

function seasonTabKey(season: Season) {
	return `season-${season.year}-${season.idx}`;
}

function seasonPath(season: Season) {
	return `/seasons/${season.year}Q${season.idx + 1}`;
}

function joinBasePath(basePath: string, path: string) {
	if (basePath === "/") return path;
	const trimmed = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
	return `${trimmed}${path}`;
}

function stripBasePath(pathname: string, basePath: string) {
	if (basePath === "/") return pathname;
	const normalized = basePath.endsWith("/") ? basePath : `${basePath}/`;
	const trimmed = normalized.slice(0, -1);
	if (pathname === trimmed) return "/";
	if (pathname.startsWith(normalized)) {
		return `/${pathname.slice(normalized.length)}`;
	}
	return pathname;
}

function parseSeasonPathname(pathname: string, basePath: string) {
	const stripped = stripBasePath(pathname, basePath);
	const match = stripped.match(SEASON_PATH_PATTERN);
	if (!match) return null;
	const year = Number(match[1]);
	const quarter = Number(match[2]);
	if (!Number.isFinite(year)) return null;
	return { year, idx: quarter - 1 };
}

function seasonFromPathname(pathname: string, basePath: string) {
	const parsed = parseSeasonPathname(pathname, basePath);
	if (!parsed) return null;
	return seasonFromYearIdx(parsed.year, parsed.idx);
}

function seasonKeyFromPathname(pathname: string, basePath: string) {
	const season = seasonFromPathname(pathname, basePath);
	return season ? seasonTabKey(season) : null;
}

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
			key: seasonTabKey(season),
			label: seasonLabel(season),
			type: "season" as const,
			season,
		}));
}

function ensureTabKeys<T>(current: Record<string, T>, tabs: TabConfig[], getDefault: () => T) {
	let changed = false;
	const next = { ...current };
	tabs.forEach((tab) => {
		if (tab.key in next) return;
		next[tab.key] = getDefault();
		changed = true;
	});
	return changed ? next : current;
}

const LABEL_KEY = "http://www.w3.org/2000/01/rdf-schema#label";
const START_KEY = "http://www.wikidata.org/prop/direct/P580";
const END_KEY = "http://www.wikidata.org/prop/direct/P582";

function asArray<T>(value: T | T[] | undefined): T[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

function pickFirstValue(values: unknown): string | undefined {
	const entry = asArray(values as { ["@value"]?: string; value?: string }[] | undefined)[0];
	if (!entry) return undefined;
	if (typeof entry === "string") return entry;
	return entry["@value"] ?? entry.value ?? undefined;
}

function pickLabel(labels: unknown): string {
	const entries = asArray(labels as { ["@language"]?: string; ["@value"]?: string; value?: string }[]);
	const preferred = entries.find((entry) => entry?.["@language"] === "ja")
		?? entries.find((entry) => entry?.["@language"] === "en")
		?? entries[0];
	if (!preferred) return "Unknown title";
	if (typeof preferred === "string") return preferred;
	return preferred["@value"] ?? preferred.value ?? "Unknown title";
}

function mapWorksFromJsonLd(data: any): Work[] {
	const graph = asArray(data?.["@graph"] ?? data);
	return graph
		.filter((node) => node && typeof node === "object" && typeof node["@id"] === "string")
		.map((node) => {
			const url = node["@id"] ?? "";
			const label = pickLabel(node[LABEL_KEY] ?? node["rdfs:label"]);
			const start = pickFirstValue(node[START_KEY] ?? node["wdt:P580"]);
			const end = pickFirstValue(node[END_KEY] ?? node["wdt:P582"]);
			return {
				id: url ? url.replace("http://www.wikidata.org/entity/", "") : "",
				title: label,
				startDate: start,
				endDate: end,
				url,
			};
		});
}

function mapWorksFromSparqlTriples(data: any): Work[] | null {
	const bindings = data?.results?.bindings;
	if (!Array.isArray(bindings) || bindings.length === 0) return null;

	const map = new Map<
		string,
		{ labelByLang: Map<string, string>; fallbackLabel?: string; start?: string; end?: string }
	>();

	for (const row of bindings) {
		const subject = row?.subject?.value;
		const predicate = row?.predicate?.value;
		const object = row?.object;
		if (typeof subject !== "string" || typeof predicate !== "string" || !object) continue;

		const entry = map.get(subject) ?? { labelByLang: new Map<string, string>() };
		if (predicate === LABEL_KEY) {
			const value = typeof object.value === "string" ? object.value : undefined;
			const lang = typeof object["xml:lang"] === "string" ? object["xml:lang"] : undefined;
			if (value && lang) {
				entry.labelByLang.set(lang, value);
			} else if (value && !entry.fallbackLabel) {
				entry.fallbackLabel = value;
			}
		} else if (predicate === START_KEY) {
			if (typeof object.value === "string") entry.start = object.value;
		} else if (predicate === END_KEY) {
			if (typeof object.value === "string") entry.end = object.value;
		}

		map.set(subject, entry);
	}

	return [...map.entries()].map(([url, entry]) => {
		const label =
			entry.labelByLang.get("ja")
				?? entry.labelByLang.get("en")
				?? entry.fallbackLabel
				?? "Unknown title";
		return {
			id: url ? url.replace("http://www.wikidata.org/entity/", "") : "",
			title: label,
			startDate: entry.start,
			endDate: entry.end,
			url,
		};
	});
}

function unescapeLiteral(value: string): string {
	return value
		.replace(/\\\\/g, "\\")
		.replace(/\\"/g, "\"")
		.replace(/\\n/g, "\n")
		.replace(/\\r/g, "\r")
		.replace(/\\t/g, "\t");
}

function parseLiteralObject(raw: string): { value: string; lang?: string } | null {
	if (!raw.startsWith("\"")) return null;
	let endIndex = -1;
	for (let i = 1; i < raw.length; i++) {
		if (raw[i] === "\"" && raw[i - 1] !== "\\") {
			endIndex = i;
			break;
		}
	}
	if (endIndex === -1) return null;
	const value = unescapeLiteral(raw.slice(1, endIndex));
	const rest = raw.slice(endIndex + 1).trim();
	const langMatch = rest.startsWith("@") ? rest.slice(1).match(/^[a-zA-Z-]+/) : null;
	return langMatch ? { value, lang: langMatch[0] } : { value };
}

function mapWorksFromNTriples(text: string): Work[] {
	const map = new Map<
		string,
		{ labelByLang: Map<string, string>; fallbackLabel?: string; start?: string; end?: string }
	>();
	const lines = text.split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const match = trimmed.match(/^<([^>]*)>\s+<([^>]*)>\s+(.+)\s+\.\s*$/);
		if (!match) continue;
		const subject = match[1];
		const predicate = match[2];
		const objectRaw = match[3];

		const entry = map.get(subject) ?? { labelByLang: new Map<string, string>() };
		if (predicate === LABEL_KEY) {
			const literal = parseLiteralObject(objectRaw);
			if (literal?.value && literal.lang) {
				entry.labelByLang.set(literal.lang, literal.value);
			} else if (literal?.value && !entry.fallbackLabel) {
				entry.fallbackLabel = literal.value;
			}
		} else if (predicate === START_KEY || predicate === END_KEY) {
			const literal = parseLiteralObject(objectRaw);
			if (literal?.value) {
				if (predicate === START_KEY) entry.start = literal.value;
				if (predicate === END_KEY) entry.end = literal.value;
			}
		}

		map.set(subject, entry);
	}

	return [...map.entries()].map(([url, entry]) => {
		const label =
			entry.labelByLang.get("ja")
				?? entry.labelByLang.get("en")
				?? entry.fallbackLabel
				?? "Unknown title";
		return {
			id: url ? url.replace("http://www.wikidata.org/entity/", "") : "",
			title: label,
			startDate: entry.start,
			endDate: entry.end,
			url,
		};
	});
}


function App() {
	const currentSeason = useMemo(() => startSeason(new Date().toISOString()), []);
	const basePath = import.meta.env.BASE_URL ?? "/";
	const [pathname, setPathname] = useState(() => window.location.pathname);
	const pathSeason = useMemo(() => seasonFromPathname(pathname, basePath), [basePath, pathname]);
	const tabConfigs = useMemo<TabConfig[]>(() => {
		const seasonTabs = buildSeasonTabs(currentSeason);
		if (pathSeason) {
			const pathKey = seasonTabKey(pathSeason);
			if (!seasonTabs.some((tab) => tab.key === pathKey)) {
				seasonTabs.unshift({
					key: pathKey,
					label: seasonLabel(pathSeason),
					type: "season",
					season: pathSeason,
				});
			}
		}
		return seasonTabs;
	}, [currentSeason, pathSeason]);
	const currentSeasonKey = currentSeason ? seasonTabKey(currentSeason) : undefined;
	const seasonTabs = tabConfigs.filter((tab): tab is SeasonTabConfig => tab.type === "season");
	const defaultSeasonTab =
		seasonTabs.find((tab) => currentSeasonKey && tab.key === currentSeasonKey) ?? seasonTabs[0];
	const [dataByTab, setDataByTab] = useState<Record<string, Work[]>>(() =>
		Object.fromEntries(tabConfigs.map((tab) => [tab.key, []])),
	);
	const [loadingByTab, setLoadingByTab] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(tabConfigs.map((tab) => [tab.key, false])),
	);
	const [fetchedByTab, setFetchedByTab] = useState<Record<string, boolean>>(() =>
		Object.fromEntries(tabConfigs.map((tab) => [tab.key, false])),
	);
	const [errorByTab, setErrorByTab] = useState<Record<string, string | null>>(() =>
		Object.fromEntries(tabConfigs.map((tab) => [tab.key, null])),
	);
	const [activeTabKey, setActiveTabKey] = useState<string>(() => {
		const keyFromPath = seasonKeyFromPathname(pathname, basePath);
		return keyFromPath ?? defaultSeasonTab?.key ?? "";
	});
	const activeTab = tabConfigs.find((tab) => tab.key === activeTabKey) ?? tabConfigs[0];
	const activeList = activeTab ? dataByTab[activeTab.key] ?? [] : [];
	const activeLoading = activeTab ? loadingByTab[activeTab.key] ?? false : false;
	const activeError = activeTab ? errorByTab[activeTab.key] ?? null : null;
	const activeFetched = activeTab ? fetchedByTab[activeTab.key] ?? false : false;
	const reactionCounts = useReactionCounts(activeList.map((work) => work.id));
	const visibleList = useMemo(() => {
		const selectedSeasonKey =
			activeTab?.type === "season" ? seasonKeyValue(activeTab.season.year, activeTab.season.idx) : null;

		return [...activeList].sort((a, b) => {
			const aSeason = startSeason(a.startDate);
			const bSeason = startSeason(b.startDate);
			const aKey = aSeason ? seasonKeyValue(aSeason.year, aSeason.idx) : null;
			const bKey = bSeason ? seasonKeyValue(bSeason.year, bSeason.idx) : null;
			const aIsEarlier = selectedSeasonKey !== null && aKey !== null && aKey < selectedSeasonKey;
			const bIsEarlier = selectedSeasonKey !== null && bKey !== null && bKey < selectedSeasonKey;

			if (aIsEarlier !== bIsEarlier) {
				return aIsEarlier ? 1 : -1;
			}

			const countDiff = (reactionCounts.get(b.id) ?? 0) - (reactionCounts.get(a.id) ?? 0);
			if (countDiff !== 0) return countDiff;
			return (a.startDate ?? "").localeCompare(b.startDate ?? "");
		});
	}, [activeList, reactionCounts, activeTab]);
	const emptyMessage = `${activeTab?.label ?? "選択したクール"}の作品が見つかりませんでした。`;

	useEffect(() => {
		const handlePopState = () => setPathname(window.location.pathname);
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, []);

	useEffect(() => {
		setDataByTab((prev) => ensureTabKeys(prev, tabConfigs, () => []));
		setLoadingByTab((prev) => ensureTabKeys(prev, tabConfigs, () => false));
		setFetchedByTab((prev) => ensureTabKeys(prev, tabConfigs, () => false));
		setErrorByTab((prev) => ensureTabKeys(prev, tabConfigs, () => null));
	}, [tabConfigs]);

	useEffect(() => {
		const keyFromPath = seasonKeyFromPathname(pathname, basePath);
		const nextKey = keyFromPath ?? defaultSeasonTab?.key ?? "";
		if (nextKey && nextKey !== activeTabKey) {
			setActiveTabKey(nextKey);
		}
	}, [activeTabKey, basePath, defaultSeasonTab, pathname]);

	useEffect(() => {
		if (!activeTab || activeTab.type !== "season") return;
		const nextPath = joinBasePath(basePath, seasonPath(activeTab.season));
		if (window.location.pathname !== nextPath) {
			window.history.replaceState(null, "", nextPath);
			setPathname(nextPath);
		}
	}, [activeTab, basePath]);

	useEffect(() => {
		const controller = new AbortController();
		const fetchWorks = async () => {
			if (!activeTab) return;
			if (dataByTab[activeTab.key]?.length > 0) return;
			setLoadingByTab((prev) => ({ ...prev, [activeTab.key]: true }));
			setErrorByTab((prev) => ({ ...prev, [activeTab.key]: null }));
			try {
				const query = buildSeasonQuery(activeTab.season);
				const response = await fetch(
					`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`,
					{
						method: "GET",
						signal: controller.signal,
						headers: {
							Accept: "application/ld+json",
						},
					},
				);

				const responseText = await response.text();
				const contentType = response.headers.get("content-type") ?? "unknown";
				if (!response.ok) {
					throw new Error(
						`Wikidata request failed with status ${response.status} (${contentType}).`,
					);
				}

				let data: any;
				try {
					data = JSON.parse(responseText);
				} catch {
					throw new Error(`Wikidata response was not JSON-LD (${contentType}).`);
				}
				const mapped = mapWorksFromJsonLd(data);

				const sorted = sortByStartDate(mapped.filter((work) => Boolean(work.startDate)), "asc");

				setDataByTab((prev) => ({ ...prev, [activeTab.key]: sorted }));
			} catch (err) {
				if (controller.signal.aborted) return;
				setErrorByTab((prev) => ({
					...prev,
					[activeTab.key]: err instanceof Error ? err.message : "Failed to fetch data",
				}));
			} finally {
				if (!controller.signal.aborted) {
					setLoadingByTab((prev) => ({ ...prev, [activeTab.key]: false }));
					setFetchedByTab((prev) => ({ ...prev, [activeTab.key]: true }));
				}
			}
		};

		fetchWorks();
		return () => controller.abort();
	}, [activeTab, dataByTab]);

	return (
		<div className="min-h-screen bg-base-200 text-base-content">
			<Navbar />
			<main className="container mx-auto px-4 py-10">
				<div className="space-y-6">
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
											onClick={() => {
												if (tab.type === "season") {
													const nextPath = joinBasePath(basePath, seasonPath(tab.season));
													if (window.location.pathname !== nextPath) {
														window.history.pushState(null, "", nextPath);
														setPathname(nextPath);
													}
												}
												setActiveTabKey(tab.key);
											}}
										>
											{tab.label}
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="space-y-4">
							{activeError && (
								<div className="alert alert-error">
									<span>Failed to load: {activeError}</span>
								</div>
							)}

							{activeLoading && !activeError && (
								<div className="flex justify-center py-4">
									<span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
								</div>
							)}

							{!activeLoading && !activeError && activeFetched && (
								<>
									{visibleList.length === 0 ? (
										<p className="text-sm text-base-content/70">{emptyMessage}</p>
									) : (
										<ul className="grid gap-4">
											{visibleList.map((work) => (
												<WorkCard key={work.id || work.url} {...work} />
											))}
										</ul>
									)}
								</>
							)}
						</div>
					</section>
				</div>
			</main>
		</div>
	);
}

export default App;
