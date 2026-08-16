const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

export async function fetchWikidataJsonLd(query: string, signal?: AbortSignal): Promise<unknown> {
	const response = await fetch(`${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`, {
		method: "GET",
		signal,
		headers: {
			Accept: "application/ld+json",
		},
	});
	const responseText = await response.text();
	const contentType = response.headers.get("content-type") ?? "unknown";

	if (!response.ok) {
		throw new Error(`Wikidata request failed with status ${response.status} (${contentType}).`);
	}
	if (!contentType.toLowerCase().includes("application/ld+json")) {
		throw new Error(`Wikidata response was not JSON-LD (${contentType}).`);
	}

	try {
		return JSON.parse(responseText) as unknown;
	} catch {
		throw new Error(`Wikidata response was not JSON-LD (${contentType}).`);
	}
}
