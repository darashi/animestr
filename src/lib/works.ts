import { seasonKeyValue, startSeason, type Season } from "./season";
import type { Work, WorkDetails } from "../types/work";

export function sortWorksByStartDate(works: Work[], order: "asc" | "desc"): Work[] {
	return [...works].sort((a, b) =>
		order === "asc"
			? (a.startDate ?? "").localeCompare(b.startDate ?? "")
			: (b.startDate ?? "").localeCompare(a.startDate ?? ""),
	);
}

export function mergeWorkDetails(
	works: Work[],
	detailsById: Readonly<Record<string, WorkDetails>>,
): Work[] {
	return works.map((work) => {
		const details = detailsById[work.id];
		return details ? { ...work, ...details } : work;
	});
}

export function workDetailsFrom(work: Work): WorkDetails {
	return {
		voiceActors: work.voiceActors,
		productionCompanies: work.productionCompanies,
		directors: work.directors,
		screenwriters: work.screenwriters,
		composers: work.composers,
	};
}

export function collectVisibleEntityIds(
	works: Work[],
	visibleWorkIds: ReadonlySet<string>,
	additionalIds: string[] = [],
): string[] {
	const ids = new Set(additionalIds.filter(Boolean));

	for (const work of works) {
		if (!visibleWorkIds.has(work.id)) continue;
		if (work.id) ids.add(work.id);
		work.voiceActors.forEach(({ id }) => ids.add(id));
		work.productionCompanies.forEach(({ id }) => ids.add(id));
		work.directors.forEach(({ id }) => ids.add(id));
		work.screenwriters.forEach(({ id }) => ids.add(id));
		work.composers.forEach(({ id }) => ids.add(id));
	}

	return [...ids].filter(Boolean);
}

export function groupWorksByStartYear(works: Work[]): [string, Work[]][] {
	const groups = new Map<string, Work[]>();

	for (const work of works) {
		const year = work.startDate
			? new Date(work.startDate).getFullYear().toString()
			: "Unknown";
		const group = groups.get(year) ?? [];
		group.push(work);
		groups.set(year, group);
	}

	return [...groups.entries()];
}

export function sortSeasonWorks(
	works: Work[],
	season: Season,
	reactionCounts: ReadonlyMap<string, number>,
): Work[] {
	const selectedSeasonKey = seasonKeyValue(season.year, season.idx);

	return [...works].sort((a, b) => {
		const aSeason = startSeason(a.startDate);
		const bSeason = startSeason(b.startDate);
		const aKey = aSeason ? seasonKeyValue(aSeason.year, aSeason.idx) : null;
		const bKey = bSeason ? seasonKeyValue(bSeason.year, bSeason.idx) : null;
		const aIsEarlier = aKey !== null && aKey < selectedSeasonKey;
		const bIsEarlier = bKey !== null && bKey < selectedSeasonKey;

		if (aIsEarlier !== bIsEarlier) return aIsEarlier ? 1 : -1;

		const countDiff = (reactionCounts.get(b.id) ?? 0) - (reactionCounts.get(a.id) ?? 0);
		if (countDiff !== 0) return countDiff;
		return (a.startDate ?? "").localeCompare(b.startDate ?? "");
	});
}
