import type { Season } from "./season";
import { seasonKeyValue } from "./season";

const seasonIndexExpression = (variable: string) =>
	`IF(${variable} <= 3, 0, IF(${variable} <= 6, 1, IF(${variable} <= 9, 2, 3)))`;

export function buildSeasonQuery(season: Season) {
	const targetKey = seasonKeyValue(season.year, season.idx);

	return `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?item ?itemLabel ?start ?end WHERE {
	?item wdt:P31/wdt:P279* wd:Q63952888;
	      wdt:P580 ?start.
	OPTIONAL { ?item wdt:P582 ?end. }

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
