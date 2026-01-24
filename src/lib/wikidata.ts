export function withWikidataPrefix(id: string): string {
	const trimmed = id.trim();
	if (!trimmed) return "";
	const upper = trimmed.toUpperCase();
	if (upper.startsWith("P")) return `wdt:${trimmed}`;
	return `wd:${trimmed}`;
}

export function stripWikidataPrefix(value: string): string {
	if (!value) return "";
	if (value.startsWith("https://www.wikidata.org/entity/")) {
		return value.slice("https://www.wikidata.org/entity/".length);
	}
	if (value.startsWith("http://www.wikidata.org/entity/")) {
		return value.slice("http://www.wikidata.org/entity/".length);
	}
	if (value.startsWith("wikidata:")) return value.slice("wikidata:".length);
	if (value.startsWith("wdt:")) return value.slice(4);
	if (value.startsWith("wd:")) return value.slice(3);
	return value;
}
