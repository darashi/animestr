import { stripWikidataPrefix } from "./wikidata";

const WIKIDATA_API_ENDPOINT = "https://www.wikidata.org/w/api.php";
const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const SEARCH_LIMIT = 50;
const ENTITY_ID_PATTERN = /^Q\d+$/;

export const ANIMESTR_ENTITY_KINDS = [
	"work",
	"cast",
	"staff",
	"company",
] as const;

export type AnimestrEntityKind = (typeof ANIMESTR_ENTITY_KINDS)[number];

export type AnimestrSearchResult = {
	id: string;
	label: string;
	description?: string;
	kind: AnimestrEntityKind;
};

type WikidataSearchCandidate = {
	id: string;
	label?: string;
	description?: string;
};

type WikidataSearchResponse = {
	search?: WikidataSearchCandidate[];
};

type SparqlBindingValue = {
	value?: string;
};

type ClassificationBinding = {
	item?: SparqlBindingValue;
	kind?: SparqlBindingValue;
};

type ClassificationResponse = {
	results?: {
		bindings?: ClassificationBinding[];
	};
};

function normalizeEntityIds(ids: readonly string[]): string[] {
	return Array.from(
		new Set(ids.map((id) => id.trim()).filter((id) => ENTITY_ID_PATTERN.test(id))),
	);
}

export function buildAnimestrEntityClassificationQuery(ids: readonly string[]): string {
	const values = normalizeEntityIds(ids).map((id) => `wd:${id}`).join(" ");
	if (!values) return "";

	return `
SELECT DISTINCT ?item ?kind WHERE {
	VALUES ?item { ${values} }
	{
		?item wdt:P580 ?start.
		{
			?item wdt:P31/wdt:P279* wd:Q63952888.
		}
		UNION
		{
			?series wdt:P31/wdt:P279* wd:Q63952888;
			        wdt:P527 ?item.
		}
		BIND("work" AS ?kind)
	}
	UNION
	{
		?work wdt:P31/wdt:P279* wd:Q63952888;
		      wdt:P580 ?start;
		      wdt:P725 ?item.
		FILTER NOT EXISTS { ?work wdt:P527 ?part. }
		BIND("cast" AS ?kind)
	}
	UNION
	{
		?work wdt:P31/wdt:P279* wd:Q63952888;
		      wdt:P580 ?start;
		      (wdt:P57|wdt:P58|wdt:P86) ?item.
		FILTER NOT EXISTS { ?work wdt:P527 ?part. }
		BIND("staff" AS ?kind)
	}
	UNION
	{
		?work wdt:P31/wdt:P279* wd:Q63952888;
		      wdt:P580 ?start;
		      wdt:P272 ?item.
		FILTER NOT EXISTS { ?work wdt:P527 ?part. }
		BIND("company" AS ?kind)
	}
}
`;
}

function isEntityKind(value: string): value is AnimestrEntityKind {
	return (ANIMESTR_ENTITY_KINDS as readonly string[]).includes(value);
}

function classificationsFromResponse(
	response: ClassificationResponse,
): Map<string, Set<AnimestrEntityKind>> {
	const classifications = new Map<string, Set<AnimestrEntityKind>>();
	for (const binding of response.results?.bindings ?? []) {
		const id = stripWikidataPrefix(binding.item?.value ?? "");
		const kind = binding.kind?.value ?? "";
		if (!ENTITY_ID_PATTERN.test(id) || !isEntityKind(kind)) continue;
		const kinds = classifications.get(id) ?? new Set<AnimestrEntityKind>();
		kinds.add(kind);
		classifications.set(id, kinds);
	}
	return classifications;
}

export function mergeAnimestrSearchResults(
	candidates: readonly WikidataSearchCandidate[],
	response: ClassificationResponse,
): AnimestrSearchResult[] {
	const classifications = classificationsFromResponse(response);
	return candidates.flatMap((candidate) => {
		if (!ENTITY_ID_PATTERN.test(candidate.id)) return [];
		const kinds = classifications.get(candidate.id);
		if (!kinds) return [];
		return ANIMESTR_ENTITY_KINDS.filter((kind) => kinds.has(kind)).map((kind) => ({
			id: candidate.id,
			label: candidate.label?.trim() || candidate.id,
			description: candidate.description?.trim() || undefined,
			kind,
		}));
	});
}

async function fetchJson<T>(
	url: string,
	errorMessage: string,
	signal?: AbortSignal,
	accept = "application/json",
): Promise<T> {
	const response = await fetch(url, {
		signal,
		headers: { Accept: accept },
	});
	if (!response.ok) {
		throw new Error(`${errorMessage} (${response.status})`);
	}
	try {
		return (await response.json()) as T;
	} catch {
		throw new Error(errorMessage);
	}
}

function normalizeLanguage(language: string): string {
	return language.trim().slice(0, 2).toLowerCase() || "ja";
}

export async function searchAnimestrEntities(
	query: string,
	language = "ja",
	signal?: AbortSignal,
): Promise<AnimestrSearchResult[]> {
	const search = query.trim();
	if (!search) return [];

	const languageCode = normalizeLanguage(language);
	const searchParams = new URLSearchParams({
		action: "wbsearchentities",
		format: "json",
		origin: "*",
		type: "item",
		language: languageCode,
		uselang: languageCode,
		search,
		limit: String(SEARCH_LIMIT),
	});
	const searchResponse = await fetchJson<WikidataSearchResponse>(
		`${WIKIDATA_API_ENDPOINT}?${searchParams.toString()}`,
		"Failed to search Wikidata",
		signal,
	);
	const candidates = searchResponse.search ?? [];
	const classificationQuery = buildAnimestrEntityClassificationQuery(
		candidates.map((candidate) => candidate.id),
	);
	if (!classificationQuery) return [];

	const classificationParams = new URLSearchParams({ query: classificationQuery });
	const classificationResponse = await fetchJson<ClassificationResponse>(
		`${WIKIDATA_SPARQL_ENDPOINT}?${classificationParams.toString()}`,
		"Failed to filter Wikidata search results",
		signal,
		"application/sparql-results+json",
	);
	return mergeAnimestrSearchResults(candidates, classificationResponse);
}
