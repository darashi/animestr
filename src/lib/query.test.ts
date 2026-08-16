import { describe, expect, it } from "vitest";
import {
	buildCastWorksQuery,
	buildCompanyWorksQuery,
	buildSeasonQuery,
	buildStaffWorksQuery,
	buildWorkDetailsQuery,
} from "./query";
import { seasonFromYearIdx } from "./season";

describe("buildWorkDetailsQuery", () => {
	it("loads cast roles only from BestRank statements", () => {
		const query = buildWorkDetailsQuery(["Q1"]);

		expect(query).toContain("?item wdt:P580 ?start");
		expect(query).toContain("rdfs:label ?itemLabel");
		expect(query).toContain("schema:description ?itemDescription");
		expect(query).toContain("a wikibase:BestRank");
		expect(query).not.toContain("wdt:P725 ?cast");
		expect(query.match(/UNION/g)).toHaveLength(4);
	});

	it("loads descriptions for season works", () => {
		const query = buildSeasonQuery(seasonFromYearIdx(2026, 2));

		expect(query).toContain("schema:description ?itemDescription");
	});

	it.each([
		[buildCastWorksQuery, "?castDescription"],
		[buildStaffWorksQuery, "?staffDescription"],
		[buildCompanyWorksQuery, "?companyDescription"],
	])("loads work and entity descriptions", (buildQuery, descriptionVariable) => {
		const query = buildQuery("Q1");

		expect(query).toContain("schema:description ?itemDescription");
		expect(query).toContain(`schema:description ${descriptionVariable}`);
	});
});
