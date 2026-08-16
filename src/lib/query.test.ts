import { describe, expect, it } from "vitest";
import { buildWorkDetailsQuery } from "./query";

describe("buildWorkDetailsQuery", () => {
	it("loads cast roles only from BestRank statements", () => {
		const query = buildWorkDetailsQuery(["Q1"]);

		expect(query).toContain("?item wdt:P580 ?start");
		expect(query).toContain("rdfs:label ?itemLabel");
		expect(query).toContain("a wikibase:BestRank");
		expect(query).not.toContain("wdt:P725 ?cast");
		expect(query.match(/UNION/g)).toHaveLength(4);
	});
});
