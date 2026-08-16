import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildAnimestrEntityClassificationQuery,
	mergeAnimestrSearchResults,
	searchAnimestrEntities,
} from "./wikidataSearch";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("Wikidata entity search", () => {
	it("builds a classifier for every entity kind handled by animestr", () => {
		const query = buildAnimestrEntityClassificationQuery([
			"Q61998245",
			"invalid",
			"Q135221399",
			"Q61998245",
		]);

		expect(query).toContain("VALUES ?item { wd:Q61998245 wd:Q135221399 }");
		expect(query).toContain('BIND("work" AS ?kind)');
		expect(query).toContain("wdt:P527 ?item");
		expect(query).toContain("wdt:P725 ?item");
		expect(query).toContain("(wdt:P57|wdt:P58|wdt:P86) ?item");
		expect(query).toContain("wdt:P272 ?item");
		expect(query).not.toContain("?item wdt:P527 ?part");
		expect(query).toContain("FILTER NOT EXISTS { ?work wdt:P527 ?part. }");
	});

	it("keeps Wikidata rank while expanding entities with multiple routes", () => {
		const results = mergeAnimestrSearchResults(
			[
				{ id: "Q1", label: "First", description: "Description" },
				{ id: "Q2", label: "Second" },
				{ id: "P3", label: "Not an item" },
			],
			{
				results: {
					bindings: [
						{
							item: { value: "http://www.wikidata.org/entity/Q1" },
							kind: { value: "staff" },
						},
						{
							item: { value: "http://www.wikidata.org/entity/Q1" },
							kind: { value: "cast" },
						},
						{
							item: { value: "http://www.wikidata.org/entity/Q2" },
							kind: { value: "company" },
						},
					],
				},
			},
		);

		expect(results).toEqual([
			{ id: "Q1", label: "First", description: "Description", kind: "cast" },
			{ id: "Q1", label: "First", description: "Description", kind: "staff" },
			{ id: "Q2", label: "Second", description: undefined, kind: "company" },
		]);
	});

	it("searches Wikidata and filters candidates before returning them", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(new Response(JSON.stringify({
				search: [
					{ id: "Q10", label: "Anime" },
					{ id: "Q20", label: "Unrelated" },
				],
			})))
			.mockResolvedValueOnce(new Response(JSON.stringify({
				results: {
					bindings: [{
						item: { value: "http://www.wikidata.org/entity/Q10" },
						kind: { value: "work" },
					}],
				},
			})));

		await expect(searchAnimestrEntities(" Anime ", "ja-JP")).resolves.toEqual([
			{ id: "Q10", label: "Anime", description: undefined, kind: "work" },
		]);

		const searchUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
		expect(searchUrl.searchParams.get("action")).toBe("wbsearchentities");
		expect(searchUrl.searchParams.get("search")).toBe("Anime");
		expect(searchUrl.searchParams.get("language")).toBe("ja");
		const classificationUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
		expect(classificationUrl.searchParams.get("query")).toContain(
			"VALUES ?item { wd:Q10 wd:Q20 }",
		);
	});
});
