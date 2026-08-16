import { describe, expect, it } from "vitest";
import { seasonFromYearIdx } from "./season";
import {
	buildCastPath,
	buildCompanyPath,
	buildHomePath,
	buildSeasonPath,
	buildStaffPath,
	parseRoute,
} from "./routes";

describe("route helpers", () => {
	it("builds root and base-prefixed paths", () => {
		const season = seasonFromYearIdx(2025, 1);

		expect(buildHomePath("/")).toBe("/");
		expect(buildHomePath("/animestr/")).toBe("/animestr/");
		expect(buildSeasonPath("/", season)).toBe("/seasons/2025Q2");
		expect(buildSeasonPath("/animestr/", season)).toBe("/animestr/seasons/2025Q2");
		expect(buildCastPath("/animestr/", "Q1")).toBe("/animestr/casts/Q1");
		expect(buildStaffPath("/animestr/", "Q2")).toBe("/animestr/staffs/Q2");
		expect(buildCompanyPath("/animestr/", "Q3")).toBe("/animestr/companies/Q3");
	});

	it("normalizes base paths while building URLs", () => {
		expect(buildHomePath("animestr")).toBe("/animestr/");
		expect(buildCastPath("/animestr", "Q1")).toBe("/animestr/casts/Q1");
		expect(buildCastPath("/animestr/", "")).toBe("");
	});

	it("parses season routes under the configured base path", () => {
		expect(parseRoute("/seasons/2025Q2", "/")).toEqual({
			type: "season",
			season: seasonFromYearIdx(2025, 1),
		});
		expect(parseRoute("/animestr/seasons/2024Q4/", "/animestr/")).toEqual({
			type: "season",
			season: seasonFromYearIdx(2024, 3),
		});
	});

	it.each([
		["/animestr/casts/Q1", { type: "cast", entityId: "Q1" }],
		["/animestr/staffs/Q2/", { type: "staff", entityId: "Q2" }],
		["/animestr/companies/Q3", { type: "company", entityId: "Q3" }],
	])("parses entity route %s", (pathname, expected) => {
		expect(parseRoute(pathname, "/animestr/")).toEqual(expected);
	});

	it.each([
		"/animestr/seasons/2025Q5",
		"/animestr/casts/q1",
		"/animestr/staffs/P1",
		"/animestr/companies/Q1/extra",
		"/casts/Q1",
	])("rejects invalid or out-of-base route %s", (pathname) => {
		expect(parseRoute(pathname, "/animestr/")).toBeNull();
	});
});
