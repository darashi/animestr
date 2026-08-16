import { seasonFromYearIdx, type Season } from "./season";

const SEASON_PATH_PATTERN = /^\/seasons\/(\d{4})Q([1-4])\/?$/;
const WORK_PATH_PATTERN = /^\/works\/(Q\d+)\/?$/;
const ENTITY_PATH_PATTERN = /^\/(casts|staffs|companies)\/(Q\d+)\/?$/;

export type AppRoute =
	| { type: "season"; season: Season }
	| { type: "work"; workId: string }
	| { type: "cast"; entityId: string }
	| { type: "staff"; entityId: string }
	| { type: "company"; entityId: string };

function normalizeBasePath(basePath: string) {
	const trimmed = basePath.trim().replace(/^\/+|\/+$/g, "");
	return trimmed ? `/${trimmed}/` : "/";
}

function joinBasePath(basePath: string, routePath: string) {
	const normalizedBasePath = normalizeBasePath(basePath);
	const normalizedRoutePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
	if (normalizedBasePath === "/") return normalizedRoutePath;
	return `${normalizedBasePath.slice(0, -1)}${normalizedRoutePath}`;
}

function stripBasePath(pathname: string, basePath: string) {
	const normalizedBasePath = normalizeBasePath(basePath);
	if (normalizedBasePath === "/") return pathname;

	const baseWithoutTrailingSlash = normalizedBasePath.slice(0, -1);
	if (pathname === baseWithoutTrailingSlash || pathname === normalizedBasePath) return "/";
	if (!pathname.startsWith(normalizedBasePath)) return null;
	return `/${pathname.slice(normalizedBasePath.length)}`;
}

export function buildHomePath(basePath: string) {
	return normalizeBasePath(basePath);
}

export function buildSeasonPath(basePath: string, season: Season) {
	return joinBasePath(basePath, `/seasons/${season.year}Q${season.idx + 1}`);
}

export function buildWorkPath(basePath: string, workId: string) {
	return workId ? joinBasePath(basePath, `/works/${workId}`) : "";
}

export function buildCastPath(basePath: string, entityId: string) {
	return entityId ? joinBasePath(basePath, `/casts/${entityId}`) : "";
}

export function buildStaffPath(basePath: string, entityId: string) {
	return entityId ? joinBasePath(basePath, `/staffs/${entityId}`) : "";
}

export function buildCompanyPath(basePath: string, entityId: string) {
	return entityId ? joinBasePath(basePath, `/companies/${entityId}`) : "";
}

export function parseRoute(pathname: string, basePath: string): AppRoute | null {
	const routePath = stripBasePath(pathname, basePath);
	if (!routePath) return null;

	const seasonMatch = routePath.match(SEASON_PATH_PATTERN);
	if (seasonMatch) {
		return {
			type: "season",
			season: seasonFromYearIdx(Number(seasonMatch[1]), Number(seasonMatch[2]) - 1),
		};
	}

	const workMatch = routePath.match(WORK_PATH_PATTERN);
	if (workMatch) return { type: "work", workId: workMatch[1] };

	const entityMatch = routePath.match(ENTITY_PATH_PATTERN);
	if (!entityMatch) return null;
	const entityId = entityMatch[2];

	switch (entityMatch[1]) {
		case "casts":
			return { type: "cast", entityId };
		case "staffs":
			return { type: "staff", entityId };
		case "companies":
			return { type: "company", entityId };
		default:
			return null;
	}
}
