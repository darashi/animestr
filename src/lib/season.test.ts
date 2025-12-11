import { describe, expect, it } from "vitest";
import {
	badgeClassForSeason,
	estimateSeason,
	formatDate,
	seasonFromYearIdx,
	seasonKeyValue,
	shiftSeason,
	startSeason,
} from "./season";

describe("season helpers", () => {
	it("startSeason returns undefined for invalid dates", () => {
		expect(startSeason("invalid")).toBeUndefined();
		expect(startSeason(undefined)).toBeUndefined();
	});

	it("startSeason shifts to season start window and returns label string components", () => {
		const season = startSeason("2024-01-05");
		expect(season && `${season.year}${season.name}`).toBe("2024冬");
	});

	it("estimateSeason derives label strings from start/end dates", () => {
		const cases: Array<[string | undefined, string | undefined, string | undefined]> = [
			["2025-07-10", undefined, "2025夏"],
			["2025-09-26", undefined, "2025秋"],
			["2024-04-01", "2024-06-20", "2024春"],
			["2024-04-01", "2024-11-05", "2024春-秋"],
			["2024-12-15", "2025-07-01", "2024秋-2025春"],
			[undefined, undefined, undefined],
		];

		for (const [start, end, expected] of cases) {
			const info = estimateSeason(start, end);
			expect(info?.label).toBe(expected);
		}
	});

	it("formatDate keeps only date part", () => {
		expect(formatDate("2024-01-05T12:30:00Z")).toBe("2024-01-05");
	});

	it("badgeClassForSeason returns neutral for out-of-range index", () => {
		expect(badgeClassForSeason(99)).toBe("badge-soft badge-neutral font-semibold");
	});

	it("season helpers normalize indexes and allow shifting seasons", () => {
		const wrapped = seasonFromYearIdx(2024, 5);
		expect(wrapped.year).toBe(2025);
		expect(wrapped.idx).toBe(1);
		expect(wrapped.name).toBe("春");

		const shiftedBack = shiftSeason(seasonFromYearIdx(2024, 0), -1);
		expect(shiftedBack.year).toBe(2023);
		expect(shiftedBack.idx).toBe(3);

		expect(seasonKeyValue(2024, 2)).toBe(8098);
	});
});
