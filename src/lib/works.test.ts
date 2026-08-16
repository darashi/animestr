import { describe, expect, it } from "vitest";
import { seasonFromYearIdx } from "./season";
import {
	collectVisibleEntityIds,
	mergeWorkDetails,
	sortSeasonWorks,
} from "./works";
import type { Work } from "../types/work";

function work(id: string, startDate: string, relatedId = `${id}-related`): Work {
	return {
		id,
		title: id,
		startDate,
		url: `https://www.wikidata.org/entity/${id}`,
		voiceActors: [{ id: relatedId, name: relatedId }],
		productionCompanies: [],
		directors: [],
		screenwriters: [],
		composers: [],
	};
}

describe("work collection helpers", () => {
	it("collects the work and related entities only for visible works", () => {
		const works = [work("Q1", "2025-04-01", "Q10"), work("Q2", "2025-04-02", "Q20")];

		expect(collectVisibleEntityIds(works, new Set(["Q2"]), ["Q99", "Q99"])).toEqual([
			"Q99",
			"Q2",
			"Q20",
		]);
	});

	it("merges details without changing works that have no fetched details", () => {
		const works = [work("Q1", "2025-04-01"), work("Q2", "2025-04-02")];
		const merged = mergeWorkDetails(works, {
			Q1: {
				voiceActors: [],
				productionCompanies: [{ id: "Q100", name: "Studio" }],
				directors: [],
				screenwriters: [],
				composers: [],
			},
		});

		expect(merged[0]?.productionCompanies).toEqual([{ id: "Q100", name: "Studio" }]);
		expect(merged[1]).toBe(works[1]);
	});

	it("places earlier-season works last and otherwise sorts by reactions then date", () => {
		const works = [
			work("earlier", "2025-01-01"),
			work("popular", "2025-05-01"),
			work("first", "2025-04-01"),
		];
		const counts = new Map([
			["earlier", 100],
			["popular", 3],
			["first", 1],
		]);

		expect(sortSeasonWorks(works, seasonFromYearIdx(2025, 1), counts).map(({ id }) => id)).toEqual([
			"popular",
			"first",
			"earlier",
		]);
	});
});
