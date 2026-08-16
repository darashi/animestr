import {
	seasonLabel,
	seasonKeyValue,
	shiftSeason,
	type Season,
} from "./season";

export type SeasonTab = {
	key: string;
	label: string;
	season: Season;
};

const PAST_SEASON_COUNT = 7;
const FUTURE_SEASON_COUNT = 2;

export function seasonTabKey(season: Season): string {
	return `season-${season.year}-${season.idx}`;
}

export function buildSeasonTabs(currentSeason: Season | undefined): SeasonTab[] {
	if (!currentSeason) return [];

	const seasons = Array.from(
		{ length: PAST_SEASON_COUNT + FUTURE_SEASON_COUNT + 1 },
		(_, index) => shiftSeason(currentSeason, FUTURE_SEASON_COUNT - index),
	);

	return seasons
		.sort((a, b) => seasonKeyValue(b.year, b.idx) - seasonKeyValue(a.year, a.idx))
		.map((season) => ({
			key: seasonTabKey(season),
			label: seasonLabel(season),
			season,
		}));
}
