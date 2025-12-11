const seasonNames = ["冬", "春", "夏", "秋"] as const;
const seasonBadges = [
	"badge-soft badge-info font-semibold",
	"badge-soft badge-success font-semibold",
	"badge-soft badge-error font-semibold",
	"badge-soft badge-warning font-semibold",
] as const;

export type Season = { name: (typeof seasonNames)[number]; badgeClass: string; year: number; idx: number };

export function seasonKeyValue(year: number, idx: number) {
	return year * seasonNames.length + idx;
}

function monthToSeasonIdx(month: number) {
	if (month <= 2) return 0; // Jan-Mar: 冬
	if (month >= 3 && month <= 5) return 1; // Apr-Jun: 春
	if (month >= 6 && month <= 8) return 2; // Jul-Sep: 夏
	return 3; // Oct-Dec: 秋
}

export function badgeClassForSeason(idx: number) {
	return seasonBadges[idx] ?? "badge-soft badge-neutral font-semibold";
}

export function seasonFromYearIdx(year: number, idx: number): Season {
	const total = year * seasonNames.length + idx;
	const normalizedIdx = ((total % seasonNames.length) + seasonNames.length) % seasonNames.length;
	const normalizedYear = Math.floor((total - normalizedIdx) / seasonNames.length);
	return {
		name: seasonNames[normalizedIdx],
		badgeClass: badgeClassForSeason(normalizedIdx),
		year: normalizedYear,
		idx: normalizedIdx,
	};
}

export function shiftSeason(base: Season, delta: number) {
	return seasonFromYearIdx(base.year, base.idx + delta);
}

export function seasonLabel(season: Season) {
	return `${season.year}${season.name}`;
}

function parseDate(value?: string) {
	if (!value) return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

function shiftDays(date: Date, days: number) {
	const shifted = new Date(date);
	shifted.setDate(shifted.getDate() + days);
	return shifted;
}

function toSeasonStart(date: Date): Season {
	const shifted = shiftDays(date, 14); // allow +14 days drift for season start
	const idx = monthToSeasonIdx(shifted.getMonth());
	return {
		name: seasonNames[idx],
		badgeClass: badgeClassForSeason(idx),
		year: shifted.getFullYear(),
		idx,
	};
}

function toSeasonEnd(date: Date): Season {
	const shifted = shiftDays(date, -14); // allow -14 days drift for season end
	const idx = monthToSeasonIdx(shifted.getMonth());
	return {
		name: seasonNames[idx],
		badgeClass: badgeClassForSeason(idx),
		year: shifted.getFullYear(),
		idx,
	};
}

export function startSeason(date?: string) {
	const parsed = parseDate(date);
	return parsed ? toSeasonStart(parsed) : undefined;
}

export function estimateSeason(startDate?: string, endDate?: string) {
	const start = parseDate(startDate);
	const end = parseDate(endDate);

	const startSeason = start ? toSeasonStart(start) : undefined;
	const endSeason = end ? toSeasonEnd(end) : startSeason;

	if (!startSeason || !endSeason) return undefined;

	const singleLabel = `${startSeason.year}${startSeason.name}`;
	const sameSeason = startSeason.year === endSeason.year && startSeason.idx === endSeason.idx;
	const crossSeasonSameYear = startSeason.year === endSeason.year && startSeason.idx !== endSeason.idx;
	const endLabel = crossSeasonSameYear ? endSeason.name : `${endSeason.year}${endSeason.name}`;
	const label = sameSeason ? singleLabel : `${singleLabel}-${endLabel}`;

	return {
		label,
		badgeClass: startSeason.badgeClass,
	};
}

export function formatDate(date?: string) {
	if (!date) return undefined;
	return date.slice(0, 10);
}

// Export internals for testing
export const _internal = {
	monthToSeasonIdx,
	parseDate,
	shiftDays,
	toSeasonStart,
	toSeasonEnd,
	seasonNames,
	seasonBadges,
	badgeClassForSeason,
	seasonFromYearIdx,
	shiftSeason,
	seasonKeyValue,
	seasonLabel,
};
