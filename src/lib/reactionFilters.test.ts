import { describe, expect, it } from "vitest";
import {
	buildEntityReactionFilters,
	buildReactionDeletionFilter,
	buildThingstrLiveFilters,
} from "./reactionFilters";

describe("reaction filters", () => {
	it("builds an entity-scoped Wikidata reaction filter", () => {
		expect(buildEntityReactionFilters(["Q1", "Q2", "Q1"])).toEqual([
			{ kinds: [17], "#k": ["wikidata"], "#i": ["wd:Q1"], limit: 500 },
			{ kinds: [17], "#k": ["wikidata"], "#i": ["wd:Q2"], limit: 500 },
		]);
	});

	it("deduplicates deletion targets", () => {
		expect(buildReactionDeletionFilter(["event-1", "event-1", "event-2"])).toEqual({
			kinds: [5],
			"#e": ["event-1", "event-2"],
		});
	});

	it("bounds only the initial history for the global subscription", () => {
		expect(buildThingstrLiveFilters()).toEqual([
			{ kinds: [17], "#k": ["wikidata"], limit: 500 },
			{ kinds: [5], limit: 500 },
		]);
	});
});
