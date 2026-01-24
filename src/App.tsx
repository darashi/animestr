import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorkCard from "./components/WorkCard";
import Navbar from "./components/Navbar";
import LinkedUserAvatar from "./components/LinkedUserAvatar";
import { sortByStartDate } from "./lib/broadcast";
import {
	buildCastWorksQuery,
	buildCompanyWorksQuery,
	buildSeasonQuery,
	buildStaffWorksQuery,
	buildWorkDetailsQuery,
} from "./lib/query";
import { seasonFromYearIdx, seasonLabel, seasonKeyValue, shiftSeason, startSeason, type Season } from "./lib/season";
import useReactionCounts from "./hooks/useReactionCounts";
import useWorkReactions from "./hooks/useWorkReactions";
import useThingstrEntityReactions from "./hooks/useThingstrEntityReactions";

type Work = {
	id: string;
	title: string;
	startDate?: string;
	endDate?: string;
	url: string;
	voiceActors: { id: string; name: string }[];
	productionCompanies: { id: string; name: string }[];
	directors: { id: string; name: string }[];
	screenwriters: { id: string; name: string }[];
	composers: { id: string; name: string }[];
};

type WorkDetails = Pick<
	Work,
	"voiceActors" | "productionCompanies" | "directors" | "screenwriters" | "composers"
>;

const EMPTY_WORK_DETAILS: WorkDetails = {
	voiceActors: [],
	productionCompanies: [],
	directors: [],
	screenwriters: [],
	composers: [],
};

type SeasonTabConfig = { key: string; label: string; type: "season"; season: Season };
type TabConfig = SeasonTabConfig;

const SEASON_PAST_COUNT = 7;
const SEASON_FUTURE_COUNT = 2;
const SEASON_PATH_PATTERN = /^\/seasons\/(\d{4})Q([1-4])\/?$/;
const CAST_PATH_PATTERN = /^\/casts\/(Q\d+)\/?$/;
const STAFF_PATH_PATTERN = /^\/staffs\/(Q\d+)\/?$/;
const COMPANY_PATH_PATTERN = /^\/companies\/(Q\d+)\/?$/;

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

function castIdFromPathname(pathname: string, basePath: string) {
	const stripped = stripBasePath(pathname, basePath);
	const match = stripped.match(CAST_PATH_PATTERN);
	if (!match) return null;
	return match[1];
}

function staffIdFromPathname(pathname: string, basePath: string) {
	const stripped = stripBasePath(pathname, basePath);
	const match = stripped.match(STAFF_PATH_PATTERN);
	if (!match) return null;
	return match[1];
}

function companyIdFromPathname(pathname: string, basePath: string) {
	const stripped = stripBasePath(pathname, basePath);
	const match = stripped.match(COMPANY_PATH_PATTERN);
	if (!match) return null;
	return match[1];
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
const CAST_KEY = "http://www.wikidata.org/prop/direct/P725";
const COMPANY_KEY = "http://www.wikidata.org/prop/direct/P272";
const DIRECTOR_KEY = "http://www.wikidata.org/prop/direct/P57";
const SCREENWRITER_KEY = "http://www.wikidata.org/prop/direct/P58";
const COMPOSER_KEY = "http://www.wikidata.org/prop/direct/P86";

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

function normalizeEntityId(value: string): string {
	if (value.startsWith("http://www.wikidata.org/entity/")) {
		return value.slice("http://www.wikidata.org/entity/".length);
	}
	if (value.startsWith("https://www.wikidata.org/entity/")) {
		return value.slice("https://www.wikidata.org/entity/".length);
	}
	if (value.startsWith("wdt:")) return value.slice(4);
	if (value.startsWith("wd:")) return value.slice(3);
	return value;
}

function entityUrlFromId(id: string): string {
	return id ? `https://www.wikidata.org/entity/${id}` : "";
}

function isWorkNode(node: Record<string, unknown>): boolean {
	return Boolean(
		node[START_KEY]
			?? node["wdt:P580"]
			?? node[END_KEY]
			?? node["wdt:P582"]
			?? node[CAST_KEY]
			?? node["wdt:P725"]
			?? node[COMPANY_KEY]
			?? node["wdt:P272"]
			?? node[DIRECTOR_KEY]
			?? node["wdt:P57"]
			?? node[SCREENWRITER_KEY]
			?? node["wdt:P58"]
			?? node[COMPOSER_KEY]
			?? node["wdt:P86"],
	);
}

function resolveEntityLabelMap(graph: unknown[]): Map<string, string> {
	const labelMap = new Map<string, string>();
	for (const node of graph) {
		if (!node || typeof node !== "object") continue;
		const id = (node as { ["@id"]?: string })["@id"];
		if (typeof id !== "string") continue;
		const normalizedId = normalizeEntityId(id);
		if (!normalizedId) continue;
		const label = pickLabel((node as any)[LABEL_KEY] ?? (node as any)["rdfs:label"]);
		if (label && label !== "Unknown title") {
			labelMap.set(normalizedId, label);
		}
	}
	return labelMap;
}

function labelForEntityId(labelMap: Map<string, string>, entityId: string): string | null {
	if (!entityId) return null;
	const normalizedId = normalizeEntityId(entityId);
	return labelMap.get(normalizedId) ?? null;
}

function resolveEntityFromNode(
	node: unknown,
	labelMap: Map<string, string>,
): { id: string; name: string } | undefined {
	if (!node) return undefined;
	if (typeof node === "string") {
		const id = normalizeEntityId(node);
		const name = labelMap.get(id);
		if (!id) return undefined;
		return { id, name: name ?? id };
	}
	if (typeof node === "object") {
		const obj = node as { ["@id"]?: string };
		const inlineLabel = pickLabel((node as any)[LABEL_KEY] ?? (node as any)["rdfs:label"]);
		const rawId = typeof obj["@id"] === "string" ? obj["@id"] : "";
		const id = rawId ? normalizeEntityId(rawId) : "";
		const fallbackName = id ? labelMap.get(id) : undefined;
		const name = inlineLabel && inlineLabel !== "Unknown title" ? inlineLabel : fallbackName ?? id;
		if (!id) return undefined;
		return { id, name };
	}
	return undefined;
}

function toUniqueEntities(nodes: unknown[], labelMap: Map<string, string>) {
	return Array.from(
		new Map(
			nodes
				.map((node) => resolveEntityFromNode(node, labelMap))
				.filter((entity): entity is { id: string; name: string } => Boolean(entity))
				.map((entity) => [entity.id, entity]),
		).values(),
	);
}

function mapWorksFromJsonLd(data: any): Work[] {
	const graph = asArray(data?.["@graph"] ?? data);
	const labelMap = resolveEntityLabelMap(graph);
	return graph
		.filter((node) => node && typeof node === "object" && typeof node["@id"] === "string")
		.filter((node) => isWorkNode(node as Record<string, unknown>))
		.map((node) => {
			const rawId = typeof node["@id"] === "string" ? node["@id"] : "";
			const id = rawId ? normalizeEntityId(rawId) : "";
			const url = rawId && rawId.startsWith("http") ? rawId : entityUrlFromId(id);
			const label = pickLabel(node[LABEL_KEY] ?? node["rdfs:label"]);
			const start = pickFirstValue(node[START_KEY] ?? node["wdt:P580"]);
			const end = pickFirstValue(node[END_KEY] ?? node["wdt:P582"]);
			const castNodes = asArray(node[CAST_KEY] ?? node["wdt:P725"]);
			const companyNodes = asArray(node[COMPANY_KEY] ?? node["wdt:P272"]);
			const directorNodes = asArray(node[DIRECTOR_KEY] ?? node["wdt:P57"]);
			const screenwriterNodes = asArray(node[SCREENWRITER_KEY] ?? node["wdt:P58"]);
			const composerNodes = asArray(node[COMPOSER_KEY] ?? node["wdt:P86"]);
			const voiceActors = toUniqueEntities(castNodes, labelMap);
			const productionCompanies = toUniqueEntities(companyNodes, labelMap);
			const directors = toUniqueEntities(directorNodes, labelMap);
			const screenwriters = toUniqueEntities(screenwriterNodes, labelMap);
			const composers = toUniqueEntities(composerNodes, labelMap);
			return {
				id,
				title: label,
				startDate: start,
				endDate: end,
				url,
				voiceActors,
				productionCompanies,
				directors,
				screenwriters,
				composers,
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
			id: url ? normalizeEntityId(url) : "",
			title: label,
			startDate: entry.start,
			endDate: entry.end,
			url: url && url.startsWith("http") ? url : entityUrlFromId(normalizeEntityId(url)),
			voiceActors: [],
			productionCompanies: [],
			directors: [],
			screenwriters: [],
			composers: [],
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

type EntityWorksPageProps = {
	entityId: string;
	titlePrefix: string;
	buildWorksQuery: (entityId: string) => string;
};

function EntityWorksPage({ entityId, titlePrefix, buildWorksQuery }: EntityWorksPageProps) {
	const [works, setWorks] = useState<Work[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [entityName, setEntityName] = useState(entityId);
	const [detailsById, setDetailsById] = useState<Record<string, WorkDetails>>({});
	const [detailsFetchedById, setDetailsFetchedById] = useState<Record<string, boolean>>({});
	const [viewportIds, setViewportIds] = useState<Set<string>>(() => new Set());
	const observerRef = useRef<IntersectionObserver | null>(null);
	const workNodeMap = useRef<Map<string, HTMLLIElement>>(new Map());
	const { reactions } = useWorkReactions(entityId);

	const worksWithDetails = useMemo(
		() =>
			works.map((work) => {
				const details = detailsById[work.id];
				return details ? { ...work, ...details } : work;
			}),
		[detailsById, works],
	);
	const visibleList = useMemo(() => sortByStartDate(worksWithDetails, "desc"), [worksWithDetails]);
	const registerWorkRef = useCallback((id: string) => {
		return (node: HTMLLIElement | null) => {
			const observer = observerRef.current;
			if (node) {
				workNodeMap.current.set(id, node);
				if (observer) observer.observe(node);
				return;
			}
			const existing = workNodeMap.current.get(id);
			if (existing && observer) observer.unobserve(existing);
			workNodeMap.current.delete(id);
		};
	}, []);

	const viewportEntityIds = useMemo(() => {
		const ids = new Set<string>();
		ids.add(entityId);
		visibleList.forEach((work) => {
			if (!viewportIds.has(work.id)) return;
			if (work.id) ids.add(work.id);
			work.voiceActors.forEach((actor) => ids.add(actor.id));
			work.productionCompanies.forEach((company) => ids.add(company.id));
			work.directors.forEach((person) => ids.add(person.id));
			work.screenwriters.forEach((person) => ids.add(person.id));
			work.composers.forEach((person) => ids.add(person.id));
		});
		return Array.from(ids);
	}, [entityId, visibleList, viewportIds]);

	useThingstrEntityReactions(viewportEntityIds);

	useEffect(() => {
		const controller = new AbortController();
		const fetchWorks = async () => {
			setLoading(true);
			setError(null);
			try {
				const query = buildWorksQuery(entityId);
				if (!query) return;
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
				const sorted = sortByStartDate(mapped, "desc");
				const graph = asArray(data?.["@graph"] ?? data);
				const labelMap = resolveEntityLabelMap(graph);
				const label = labelForEntityId(labelMap, entityId);
				setWorks(sorted);
				setEntityName(label ?? entityId);
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
	}, [buildWorksQuery, entityId]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				setViewportIds((prev) => {
					let changed = false;
					const next = new Set(prev);
					for (const entry of entries) {
						const id = (entry.target as HTMLElement).dataset.workId;
						if (!id) continue;
						if (entry.isIntersecting) {
							if (!next.has(id)) {
								next.add(id);
								changed = true;
							}
						} else if (next.delete(id)) {
							changed = true;
						}
					}
					return changed ? next : prev;
				});
			},
			{ root: null, rootMargin: "0px 0px 200px 0px", threshold: 0.1 },
		);
		observerRef.current = observer;
		for (const node of workNodeMap.current.values()) {
			observer.observe(node);
		}
		return () => {
			observer.disconnect();
			observerRef.current = null;
			setViewportIds(new Set());
		};
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		const fetchDetails = async () => {
			if (visibleList.length === 0) return;
			const targetIds = visibleList
				.filter((work) => viewportIds.has(work.id))
				.map((work) => work.id)
				.filter(Boolean);
			const missingIds = targetIds.filter((id) => !detailsFetchedById[id]);
			if (missingIds.length === 0) return;

			try {
				const query = buildWorkDetailsQuery(missingIds);
				if (!query) return;
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

				const detailWorks = mapWorksFromJsonLd(data);
				const detailMap = new Map(
					detailWorks.map((work) => [
						work.id,
						{
							voiceActors: work.voiceActors,
							productionCompanies: work.productionCompanies,
							directors: work.directors,
							screenwriters: work.screenwriters,
							composers: work.composers,
						} satisfies WorkDetails,
					]),
				);

				setDetailsById((prev) => {
					const next = { ...prev };
					for (const id of missingIds) {
						next[id] = detailMap.get(id) ?? prev[id] ?? EMPTY_WORK_DETAILS;
					}
					return next;
				});
			} catch {
				if (controller.signal.aborted) return;
				setDetailsById((prev) => {
					const next = { ...prev };
					for (const id of missingIds) {
						next[id] = prev[id] ?? EMPTY_WORK_DETAILS;
					}
					return next;
				});
			} finally {
				if (!controller.signal.aborted) {
					setDetailsFetchedById((prev) => {
						const next = { ...prev };
						for (const id of missingIds) {
							next[id] = true;
						}
						return next;
					});
				}
			}
		};

		fetchDetails();
		return () => controller.abort();
	}, [detailsFetchedById, visibleList, viewportIds]);

	const titleBadgeHref = `https://www.wikidata.org/entity/${entityId}`;
	const emptyMessage = `${entityName}の作品が見つかりませんでした。`;
	const worksByYear = useMemo(() => {
		const groups = new Map<string, Work[]>();
		visibleList.forEach((work) => {
			const year = work.startDate ? new Date(work.startDate).getFullYear().toString() : "Unknown";
			const list = groups.get(year) ?? [];
			list.push(work);
			groups.set(year, list);
		});
		return Array.from(groups.entries());
	}, [visibleList]);

	return (
		<div className="space-y-6">
			<section className="space-y-4">
				<div className="card bg-base-100 shadow-sm">
					<div className="card-body">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-lg font-semibold">
								{titlePrefix}: {entityName}
							</h2>
							<a
								className="badge badge-outline badge-primary rounded-full no-underline font-normal text-xs px-2 py-1 whitespace-nowrap"
								href={titleBadgeHref}
								target="_blank"
								rel="noreferrer"
							>
								{entityId}
							</a>
							{reactions.length > 0 ? (
								<span className="flex -space-x-2">
									{reactions.slice(0, 5).map((reaction) => (
										<LinkedUserAvatar
											key={reaction.id}
											pubkey={reaction.pubkey}
											sizeClassName="w-6 h-6"
										/>
									))}
								</span>
							) : null}
						</div>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				{error && (
					<div className="alert alert-error">
						<span>Failed to load: {error}</span>
					</div>
				)}

				{loading && !error && (
					<div className="flex justify-center py-4">
						<span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
					</div>
				)}

				{!loading && !error && (
					<>
						{visibleList.length === 0 ? (
							<p className="text-sm text-base-content/70">{emptyMessage}</p>
						) : (
							<div className="space-y-6">
								{worksByYear.map(([year, items]) => (
									<section key={year} className="space-y-3">
										<h3 className="text-base font-semibold text-base-content">{year}</h3>
										<ul className="grid gap-4">
											{items.map((work) => (
												<WorkCard key={work.id || work.url} ref={registerWorkRef(work.id)} {...work} />
											))}
										</ul>
									</section>
								))}
							</div>
						)}
					</>
				)}
			</section>
		</div>
	);
}


function App() {
	const currentSeason = useMemo(() => startSeason(new Date().toISOString()), []);
	const basePath = import.meta.env.BASE_URL ?? "/";
	const [pathname, setPathname] = useState(() => window.location.pathname);
	const castId = useMemo(() => castIdFromPathname(pathname, basePath), [basePath, pathname]);
	const staffId = useMemo(() => staffIdFromPathname(pathname, basePath), [basePath, pathname]);
	const companyId = useMemo(() => companyIdFromPathname(pathname, basePath), [basePath, pathname]);
	const entityRouteId = castId ?? staffId ?? companyId;
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
	const [detailsById, setDetailsById] = useState<Record<string, WorkDetails>>({});
	const [detailsFetchedById, setDetailsFetchedById] = useState<Record<string, boolean>>({});
	const [viewportIds, setViewportIds] = useState<Set<string>>(() => new Set());
	const observerRef = useRef<IntersectionObserver | null>(null);
	const workNodeMap = useRef<Map<string, HTMLLIElement>>(new Map());
	const [activeTabKey, setActiveTabKey] = useState<string>(() => {
		const keyFromPath = seasonKeyFromPathname(pathname, basePath);
		return keyFromPath ?? defaultSeasonTab?.key ?? "";
	});
	const activeTab = tabConfigs.find((tab) => tab.key === activeTabKey) ?? tabConfigs[0];
	const activeList = activeTab ? dataByTab[activeTab.key] ?? [] : [];
	const activeListWithDetails = useMemo(
		() =>
			activeList.map((work) => {
				const details = detailsById[work.id];
				return details ? { ...work, ...details } : work;
			}),
		[activeList, detailsById],
	);
	const registerWorkRef = useCallback((id: string) => {
		return (node: HTMLLIElement | null) => {
			const observer = observerRef.current;
			if (node) {
				workNodeMap.current.set(id, node);
				if (observer) observer.observe(node);
				return;
			}
			const existing = workNodeMap.current.get(id);
			if (existing && observer) observer.unobserve(existing);
			workNodeMap.current.delete(id);
		};
	}, []);
	const activeLoading = activeTab ? loadingByTab[activeTab.key] ?? false : false;
	const activeError = activeTab ? errorByTab[activeTab.key] ?? null : null;
	const activeFetched = activeTab ? fetchedByTab[activeTab.key] ?? false : false;
	const reactionCounts = useReactionCounts(activeListWithDetails.map((work) => work.id));
	const entityPage = useMemo(() => {
		if (castId) {
			return { id: castId, titlePrefix: "キャスト", buildWorksQuery: buildCastWorksQuery };
		}
		if (staffId) {
			return { id: staffId, titlePrefix: "スタッフ", buildWorksQuery: buildStaffWorksQuery };
		}
		if (companyId) {
			return { id: companyId, titlePrefix: "制作会社", buildWorksQuery: buildCompanyWorksQuery };
		}
		return null;
	}, [castId, staffId, companyId]);
	const visibleList = useMemo(() => {
		const selectedSeasonKey =
			activeTab?.type === "season" ? seasonKeyValue(activeTab.season.year, activeTab.season.idx) : null;

		return [...activeListWithDetails].sort((a, b) => {
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
	}, [activeListWithDetails, reactionCounts, activeTab]);
	const viewportEntityIds = useMemo(() => {
		if (entityRouteId) return [];
		const ids = new Set<string>();
		visibleList.forEach((work) => {
			if (!viewportIds.has(work.id)) return;
			if (work.id) ids.add(work.id);
			work.voiceActors.forEach((actor) => ids.add(actor.id));
			work.productionCompanies.forEach((company) => ids.add(company.id));
			work.directors.forEach((person) => ids.add(person.id));
			work.screenwriters.forEach((person) => ids.add(person.id));
			work.composers.forEach((person) => ids.add(person.id));
		});
		return Array.from(ids);
	}, [entityRouteId, visibleList, viewportIds]);
	useThingstrEntityReactions(viewportEntityIds);
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
		if (entityRouteId) return;
		const keyFromPath = seasonKeyFromPathname(pathname, basePath);
		const nextKey = keyFromPath ?? defaultSeasonTab?.key ?? "";
		if (nextKey && nextKey !== activeTabKey) {
			setActiveTabKey(nextKey);
		}
	}, [activeTabKey, basePath, defaultSeasonTab, entityRouteId, pathname]);

	useEffect(() => {
		if (entityRouteId) return;
		if (!activeTab || activeTab.type !== "season") return;
		const nextPath = joinBasePath(basePath, seasonPath(activeTab.season));
		if (window.location.pathname !== nextPath) {
			window.history.replaceState(null, "", nextPath);
			setPathname(nextPath);
		}
	}, [activeTab, basePath, entityRouteId]);

	useEffect(() => {
		if (entityRouteId) return;
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
	}, [activeTab, dataByTab, entityRouteId]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				setViewportIds((prev) => {
					let changed = false;
					const next = new Set(prev);
					for (const entry of entries) {
						const id = (entry.target as HTMLElement).dataset.workId;
						if (!id) continue;
						if (entry.isIntersecting) {
							if (!next.has(id)) {
								next.add(id);
								changed = true;
							}
						} else if (next.delete(id)) {
							changed = true;
						}
					}
					return changed ? next : prev;
				});
			},
			{ root: null, rootMargin: "0px 0px 200px 0px", threshold: 0.1 },
		);
		observerRef.current = observer;
		for (const node of workNodeMap.current.values()) {
			observer.observe(node);
		}
		return () => {
			observer.disconnect();
			observerRef.current = null;
			setViewportIds(new Set());
		};
	}, []);

	useEffect(() => {
		if (entityRouteId) return;
		const controller = new AbortController();
		const fetchDetails = async () => {
			if (visibleList.length === 0) return;
			const targetIds = visibleList
				.filter((work) => viewportIds.has(work.id))
				.map((work) => work.id)
				.filter(Boolean);
			const missingIds = targetIds.filter((id) => !detailsFetchedById[id]);
			if (missingIds.length === 0) return;

			try {
				const query = buildWorkDetailsQuery(missingIds);
				if (!query) return;
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

				const detailWorks = mapWorksFromJsonLd(data);
				const detailMap = new Map(
					detailWorks.map((work) => [
						work.id,
						{
							voiceActors: work.voiceActors,
							productionCompanies: work.productionCompanies,
							directors: work.directors,
							screenwriters: work.screenwriters,
							composers: work.composers,
						} satisfies WorkDetails,
					]),
				);

				setDetailsById((prev) => {
					const next = { ...prev };
					for (const id of missingIds) {
						next[id] = detailMap.get(id) ?? prev[id] ?? EMPTY_WORK_DETAILS;
					}
					return next;
				});
			} catch {
				if (controller.signal.aborted) return;
				setDetailsById((prev) => {
					const next = { ...prev };
					for (const id of missingIds) {
						next[id] = prev[id] ?? EMPTY_WORK_DETAILS;
					}
					return next;
				});
			} finally {
				if (!controller.signal.aborted) {
					setDetailsFetchedById((prev) => {
						const next = { ...prev };
						for (const id of missingIds) {
							next[id] = true;
						}
						return next;
					});
				}
			}
		};

		fetchDetails();
		return () => controller.abort();
	}, [visibleList, detailsFetchedById, viewportIds]);

	return (
		<div className="min-h-screen bg-base-200 text-base-content">
			<Navbar />
			<main className="container mx-auto px-4 py-10">
				{entityPage ? (
					<EntityWorksPage
						entityId={entityPage.id}
						titlePrefix={entityPage.titlePrefix}
						buildWorksQuery={entityPage.buildWorksQuery}
					/>
				) : (
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
													<WorkCard key={work.id || work.url} ref={registerWorkRef(work.id)} {...work} />
												))}
											</ul>
										)}
									</>
								)}
							</div>
						</section>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
