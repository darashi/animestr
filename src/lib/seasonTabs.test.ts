import { describe, expect, it } from "vitest";
import { seasonFromYearIdx } from "./season";
import { buildSeasonTabs, seasonTabKey } from "./seasonTabs";

describe("season tabs", () => {
	it("builds two future, current, and seven past seasons in descending order", () => {
		const current = seasonFromYearIdx(2025, 3);
		const tabs = buildSeasonTabs(current);

		expect(tabs).toHaveLength(10);
		expect(tabs.map((tab) => tab.label)).toEqual([
			"2026春",
			"2026冬",
			"2025秋",
			"2025夏",
			"2025春",
			"2025冬",
			"2024秋",
			"2024夏",
			"2024春",
			"2024冬",
		]);
		expect(tabs[2]?.key).toBe(seasonTabKey(current));
	});

	it("returns no tabs without a current season", () => {
		expect(buildSeasonTabs(undefined)).toEqual([]);
	});
});
