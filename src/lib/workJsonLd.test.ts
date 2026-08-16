import { describe, expect, it } from "vitest";
import { mapWorksFromJsonLd, parseWorkJsonLd } from "./workJsonLd";

const jsonLd = {
	"@graph": [
		{
			"@id": "wd:Q100",
			"rdfs:label": [
				{ "@language": "en", "@value": "English title" },
				{ "@language": "ja", "@value": "日本語タイトル" },
			],
			"wdt:P580": { "@value": "2026-04-03T00:00:00Z" },
			"http://www.wikidata.org/prop/direct/P582": { value: "2026-06-26T00:00:00Z" },
			"p:P725": [
				{ "@id": "statement:cast-1" },
				{ "@id": "statement:cast-2" },
				{ "@id": "statement:cast-3" },
				{ "@id": "statement:cast-normal" },
				{ "@id": "statement:cast-deprecated" },
			],
			"wdt:P272": [{ "@id": "wd:Q400" }, { "@id": "wd:Q400" }],
			"wdt:P57": { "@id": "wd:Q500" },
			"wdt:P58": { "@id": "wd:Q600" },
			"wdt:P86": { "@id": "wd:Q700" },
		},
		{
			"@id": "statement:cast-1",
			"@type": "http://wikiba.se/ontology#BestRank",
			"ps:P725": { "@id": "wd:Q200" },
			"pq:P453": { "@id": "wd:Q300" },
		},
		{
			"@id": "statement:cast-2",
			"@type": "wikibase:BestRank",
			"http://www.wikidata.org/prop/statement/P725": { "@id": "wd:Q200" },
			"http://www.wikidata.org/prop/qualifier/P453": { "@id": "wd:Q301" },
		},
		{
			"@id": "statement:cast-3",
			"@type": "http://wikiba.se/ontology#BestRank",
			"ps:P725": { "@id": "wd:Q201" },
		},
		{
			"@id": "statement:cast-normal",
			"@type": "http://wikiba.se/ontology#Statement",
			"ps:P725": { "@id": "wd:Q200" },
			"pq:P453": { "@id": "wd:Q302" },
		},
		{
			"@id": "statement:cast-deprecated",
			"ps:P725": { "@id": "wd:Q200" },
			"pq:P453": { "@id": "wd:Q302" },
			"@type": "http://wikiba.se/ontology#DeprecatedRank",
		},
		{
			"@id": "wd:Q200",
			"rdfs:label": { "@language": "ja", "@value": "声優A" },
		},
		{
			"@id": "wd:Q201",
			"rdfs:label": { "@language": "ja", "@value": "声優B" },
		},
		{
			"@id": "wd:Q300",
			"rdfs:label": { "@language": "ja", "@value": "主人公" },
		},
		{
			"@id": "wd:Q301",
			"rdfs:label": { "@language": "ja", "@value": "ナレーター" },
		},
		{
			"@id": "wd:Q302",
			"rdfs:label": { "@language": "ja", "@value": "非推奨の役" },
		},
		{
			"@id": "wd:Q400",
			"rdfs:label": { "@language": "ja", "@value": "制作会社A" },
		},
		{
			"@id": "wd:Q500",
			"rdfs:label": { "@language": "en", "@value": "Director A" },
		},
		{
			"@id": "wd:Q600",
			"rdfs:label": "脚本家A",
		},
		{
			"@id": "wd:Q700",
			"rdfs:label": { value: "作曲家A" },
		},
	],
};

describe("mapWorksFromJsonLd", () => {
	it("selects the Japanese label and reads start and end dates", () => {
		const [work] = mapWorksFromJsonLd(jsonLd);

		expect(work).toMatchObject({
			id: "Q100",
			title: "日本語タイトル",
			startDate: "2026-04-03T00:00:00Z",
			endDate: "2026-06-26T00:00:00Z",
			url: "https://www.wikidata.org/entity/Q100",
		});
	});

	it("resolves and combines role labels from cast statements", () => {
		const [work] = mapWorksFromJsonLd(jsonLd);

		expect(work?.voiceActors).toEqual([
			{ id: "Q200", name: "声優A", role: "主人公 / ナレーター" },
			{ id: "Q201", name: "声優B" },
		]);
		expect(work?.productionCompanies).toEqual([{ id: "Q400", name: "制作会社A" }]);
		expect(work?.directors).toEqual([{ id: "Q500", name: "Director A" }]);
		expect(work?.screenwriters).toEqual([{ id: "Q600", name: "脚本家A" }]);
		expect(work?.composers).toEqual([{ id: "Q700", name: "作曲家A" }]);
	});
});

describe("parseWorkJsonLd", () => {
	it("normalizes entity URLs and uses the preferred available label", () => {
		const { labels } = parseWorkJsonLd(jsonLd);

		expect(labels.get("Q200")).toBe("声優A");
		expect(labels.get("Q500")).toBe("Director A");
		expect(labels.get("Q999")).toBeUndefined();
	});
});
