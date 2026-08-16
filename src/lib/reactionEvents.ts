import type { EventTemplate } from "nostr-tools/pure";
import { normalizeReactionContent } from "./reactions";
import { withWikidataPrefix } from "./wikidata";

export const WIKIDATA_REACTION_KIND = 17;

function unixTime() {
	return Math.floor(Date.now() / 1_000);
}

export function buildWikidataReactionTemplate(
	entityId: string,
	content = "+",
	createdAt = unixTime(),
): EventTemplate {
	const externalId = withWikidataPrefix(entityId);
	if (!externalId) throw new Error("A Wikidata entity ID is required");
	return {
		kind: WIKIDATA_REACTION_KIND,
		created_at: createdAt,
		content: normalizeReactionContent(content),
		tags: [
			["k", "wikidata"],
			["i", externalId],
		],
	};
}

export function buildReactionDeletionTemplate(
	eventIds: string[],
	createdAt = unixTime(),
): EventTemplate {
	const ids = [...new Set(eventIds.filter(Boolean))];
	if (ids.length === 0) throw new Error("A reaction event ID is required");
	return {
		kind: 5,
		created_at: createdAt,
		content: "",
		tags: [
			...ids.map((id) => ["e", id]),
			["k", String(WIKIDATA_REACTION_KIND)],
		],
	};
}
