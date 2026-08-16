import type { VoiceActor, Work, WorkEntity } from "../types/work";
import { stripWikidataPrefix } from "./wikidata";

type JsonObject = Record<string, unknown>;
type PropertyKeys = readonly [full: string, compact: string];

const UNKNOWN_TITLE = "Unknown title";

const LABEL_KEYS = ["http://www.w3.org/2000/01/rdf-schema#label", "rdfs:label"] as const;
const START_KEYS = ["http://www.wikidata.org/prop/direct/P580", "wdt:P580"] as const;
const END_KEYS = ["http://www.wikidata.org/prop/direct/P582", "wdt:P582"] as const;
const CAST_STATEMENT_KEYS = ["http://www.wikidata.org/prop/P725", "p:P725"] as const;
const CAST_STATEMENT_VALUE_KEYS = [
	"http://www.wikidata.org/prop/statement/P725",
	"ps:P725",
] as const;
const CAST_ROLE_KEYS = ["http://www.wikidata.org/prop/qualifier/P453", "pq:P453"] as const;
const BEST_RANK_TYPES = new Set([
	"http://wikiba.se/ontology#BestRank",
	"wikibase:BestRank",
]);
const COMPANY_KEYS = ["http://www.wikidata.org/prop/direct/P272", "wdt:P272"] as const;
const DIRECTOR_KEYS = ["http://www.wikidata.org/prop/direct/P57", "wdt:P57"] as const;
const SCREENWRITER_KEYS = ["http://www.wikidata.org/prop/direct/P58", "wdt:P58"] as const;
const COMPOSER_KEYS = ["http://www.wikidata.org/prop/direct/P86", "wdt:P86"] as const;

const WORK_PROPERTIES: PropertyKeys[] = [
	START_KEYS,
	END_KEYS,
	CAST_STATEMENT_KEYS,
	COMPANY_KEYS,
	DIRECTOR_KEYS,
	SCREENWRITER_KEYS,
	COMPOSER_KEYS,
];

type CastStatement = {
	castId?: string;
	roleIds: string[];
};

type LabelEntry = {
	language?: string;
	value: string;
};

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

function graphFromJsonLd(data: unknown): unknown[] {
	if (isJsonObject(data) && "@graph" in data) {
		return asArray(data["@graph"]);
	}
	return asArray(data);
}

function propertyValue(node: JsonObject, keys: PropertyKeys): unknown {
	for (const key of keys) {
		const value = node[key];
		if (value !== undefined && value !== null) return value;
	}
	return undefined;
}

function stringValue(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (!isJsonObject(value)) return undefined;
	if (typeof value["@value"] === "string") return value["@value"];
	return typeof value.value === "string" ? value.value : undefined;
}

function firstStringValue(value: unknown): string | undefined {
	for (const entry of asArray(value)) {
		const result = stringValue(entry);
		if (result !== undefined) return result;
	}
	return undefined;
}

function labelEntry(value: unknown): LabelEntry | undefined {
	const text = stringValue(value);
	if (text === undefined) return undefined;
	if (!isJsonObject(value)) return { value: text };
	const language = typeof value["@language"] === "string" ? value["@language"] : undefined;
	return language ? { language, value: text } : { value: text };
}

function pickLabel(value: unknown): string | undefined {
	const entries = asArray(value)
		.map(labelEntry)
		.filter((entry): entry is LabelEntry => entry !== undefined);
	return entries.find((entry) => entry.language === "ja")?.value
		?? entries.find((entry) => entry.language === "en")?.value
		?? entries[0]?.value;
}

function normalizeEntityId(value: string): string {
	return stripWikidataPrefix(value);
}

function entityUrlFromId(id: string): string {
	return id ? `https://www.wikidata.org/entity/${id}` : "";
}

function resolveEntityId(node: unknown): string | undefined {
	if (typeof node === "string") return normalizeEntityId(node);
	if (!isJsonObject(node)) return undefined;
	const id = node["@id"];
	return typeof id === "string" ? normalizeEntityId(id) : undefined;
}

function isWorkNode(node: JsonObject): boolean {
	return WORK_PROPERTIES.some((keys) => propertyValue(node, keys) !== undefined);
}

function entityLabelMap(graph: unknown[]): Map<string, string> {
	const labels = new Map<string, string>();
	for (const node of graph) {
		if (!isJsonObject(node)) continue;
		const id = resolveEntityId(node);
		if (!id) continue;
		const label = pickLabel(propertyValue(node, LABEL_KEYS));
		if (label) labels.set(id, label);
	}
	return labels;
}

function resolveEntity(node: unknown, labels: Map<string, string>): WorkEntity | undefined {
	const id = resolveEntityId(node);
	if (!id) return undefined;
	const inlineLabel = isJsonObject(node) ? pickLabel(propertyValue(node, LABEL_KEYS)) : undefined;
	return { id, name: inlineLabel ?? labels.get(id) ?? id };
}

function uniqueEntities(nodes: unknown[], labels: Map<string, string>): WorkEntity[] {
	const entities = new Map<string, WorkEntity>();
	for (const node of nodes) {
		const entity = resolveEntity(node, labels);
		if (entity) entities.set(entity.id, entity);
	}
	return Array.from(entities.values());
}

function castStatements(graph: unknown[]): Map<string, CastStatement> {
	const statements = new Map<string, CastStatement>();
	for (const node of graph) {
		if (!isJsonObject(node)) continue;
		const statementId = resolveEntityId(node);
		if (!statementId) continue;
		const isBestRank = asArray(node["@type"])
			.map(resolveEntityId)
			.some((type) => type !== undefined && BEST_RANK_TYPES.has(type));
		if (!isBestRank) continue;
		const castId = resolveEntityId(asArray(propertyValue(node, CAST_STATEMENT_VALUE_KEYS))[0]);
		const roleIds = asArray(propertyValue(node, CAST_ROLE_KEYS))
			.map(resolveEntityId)
			.filter((id): id is string => id !== undefined);
		if (castId || roleIds.length > 0) {
			statements.set(statementId, { castId, roleIds });
		}
	}
	return statements;
}

function voiceActorsFromStatements(
	nodes: unknown[],
	statements: Map<string, CastStatement>,
	labels: Map<string, string>,
): VoiceActor[] {
	const actors = new Map<string, WorkEntity & { roleNames: Set<string> }>();
	for (const node of nodes) {
		const statementId = resolveEntityId(node);
		if (!statementId) continue;
		const statement = statements.get(statementId);
		if (!statement?.castId) continue;
		const actor = actors.get(statement.castId) ?? {
			id: statement.castId,
			name: labels.get(statement.castId) ?? statement.castId,
			roleNames: new Set<string>(),
		};
		for (const roleId of statement.roleIds) {
			actor.roleNames.add(labels.get(roleId) ?? roleId);
		}
		actors.set(statement.castId, actor);
	}

	return Array.from(actors.values()).map(({ id, name, roleNames }) => ({
		id,
		name,
		role: roleNames.size > 0 ? Array.from(roleNames).join(" / ") : undefined,
	}));
}

export function parseWorkJsonLd(data: unknown): {
	works: Work[];
	labels: ReadonlyMap<string, string>;
} {
	const graph = graphFromJsonLd(data);
	const labels = entityLabelMap(graph);
	const statements = castStatements(graph);
	const works: Work[] = [];

	for (const node of graph) {
		if (!isJsonObject(node) || !isWorkNode(node)) continue;
		const rawId = node["@id"];
		if (typeof rawId !== "string") continue;
		const id = normalizeEntityId(rawId);
		const voiceActors = voiceActorsFromStatements(
			asArray(propertyValue(node, CAST_STATEMENT_KEYS)),
			statements,
			labels,
		);

		works.push({
			id,
			title: pickLabel(propertyValue(node, LABEL_KEYS)) ?? UNKNOWN_TITLE,
			startDate: firstStringValue(propertyValue(node, START_KEYS)),
			endDate: firstStringValue(propertyValue(node, END_KEYS)),
			url: rawId.startsWith("http") ? rawId : entityUrlFromId(id),
			voiceActors,
			productionCompanies: uniqueEntities(asArray(propertyValue(node, COMPANY_KEYS)), labels),
			directors: uniqueEntities(asArray(propertyValue(node, DIRECTOR_KEYS)), labels),
			screenwriters: uniqueEntities(asArray(propertyValue(node, SCREENWRITER_KEYS)), labels),
			composers: uniqueEntities(asArray(propertyValue(node, COMPOSER_KEYS)), labels),
		});
	}

	return { works, labels };
}

export function mapWorksFromJsonLd(data: unknown): Work[] {
	return parseWorkJsonLd(data).works;
}
