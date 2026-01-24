import type { Season } from "./season";
import { seasonKeyValue } from "./season";
import { withWikidataPrefix } from "./wikidata";

const seasonIndexExpression = (variable: string) =>
	`IF(${variable} <= 3, 0, IF(${variable} <= 6, 1, IF(${variable} <= 9, 2, 3)))`;

export function buildSeasonQuery(season: Season) {
	const targetKey = seasonKeyValue(season.year, season.idx);

	return `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT {
	?item wdt:P580 ?start;
	      wdt:P582 ?end;
	      rdfs:label ?itemLabel.
} WHERE {
	?item wdt:P31/wdt:P279* wd:Q63952888;
	      wdt:P580 ?start.
	OPTIONAL { ?item wdt:P582 ?end. }
	FILTER NOT EXISTS { ?item wdt:P527 ?part. }

	BIND(xsd:dateTime(?start) + "P14D"^^xsd:duration AS ?startShift)
	BIND(IF(BOUND(?end), xsd:dateTime(?end) - "P14D"^^xsd:duration, xsd:dateTime(?start) + "P14D"^^xsd:duration) AS ?endShift)

	BIND(YEAR(?startShift) AS ?startYear)
	BIND(MONTH(?startShift) AS ?startMonth)
	BIND(${seasonIndexExpression("?startMonth")} AS ?startIdx)
	BIND((?startYear * 4) + ?startIdx AS ?startKey)

	BIND(YEAR(?endShift) AS ?endYear)
	BIND(MONTH(?endShift) AS ?endMonth)
	BIND(${seasonIndexExpression("?endMonth")} AS ?endIdx)
	BIND((?endYear * 4) + ?endIdx AS ?endKey)

	FILTER(${targetKey} >= ?startKey && ${targetKey} <= ?endKey)

	SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
}
ORDER BY ?start
LIMIT 200
`;
}

export function buildWorkDetailsQuery(ids: string[]) {
	if (ids.length === 0) return "";
	const values = ids.map((id) => withWikidataPrefix(id)).join(" ");
	return `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT {
	?item wdt:P725 ?cast.
	?item p:P725 ?castStatement.
	?castStatement ps:P725 ?cast.
	?castStatement pq:P453 ?role.
	?item wdt:P272 ?company.
	?item wdt:P57 ?director.
	?item wdt:P58 ?screenwriter.
	?item wdt:P86 ?composer.
	?cast rdfs:label ?castLabel.
	?role rdfs:label ?roleLabel.
	?company rdfs:label ?companyLabel.
	?director rdfs:label ?directorLabel.
	?screenwriter rdfs:label ?screenwriterLabel.
	?composer rdfs:label ?composerLabel.
} WHERE {
	VALUES ?item { ${values} }
	OPTIONAL { ?item wdt:P725 ?cast. }
	OPTIONAL {
		?item p:P725 ?castStatement.
		?castStatement ps:P725 ?cast.
		OPTIONAL { ?castStatement pq:P453 ?role. }
	}
	OPTIONAL { ?item wdt:P272 ?company. }
	OPTIONAL { ?item wdt:P57 ?director. }
	OPTIONAL { ?item wdt:P58 ?screenwriter. }
	OPTIONAL { ?item wdt:P86 ?composer. }
	SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
}
`;
}

function buildEntityWorksQuery(
	entityId: string,
	entityVar: string,
	labelVar: string,
	linkPattern: string,
) {
	const entity = withWikidataPrefix(entityId);
	if (!entity) return "";
	return `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT {
	?item wdt:P580 ?start;
	      wdt:P582 ?end;
	      rdfs:label ?itemLabel.
	${entityVar} rdfs:label ${labelVar}.
} WHERE {
	VALUES ${entityVar} { ${entity} }
	?item wdt:P31/wdt:P279* wd:Q63952888;
	      wdt:P580 ?start;
	      ${linkPattern} ${entityVar}.
	OPTIONAL { ?item wdt:P582 ?end. }
	FILTER NOT EXISTS { ?item wdt:P527 ?part. }
	SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
}
ORDER BY ?start
LIMIT 200
`;
}

export function buildCastWorksQuery(castId: string) {
	return buildEntityWorksQuery(castId, "?cast", "?castLabel", "wdt:P725");
}

export function buildStaffWorksQuery(staffId: string) {
	return buildEntityWorksQuery(staffId, "?staff", "?staffLabel", "(wdt:P57|wdt:P58|wdt:P86)");
}

export function buildCompanyWorksQuery(companyId: string) {
	return buildEntityWorksQuery(companyId, "?company", "?companyLabel", "wdt:P272");
}
