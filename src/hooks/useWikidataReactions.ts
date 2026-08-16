import { useContext } from "react";
import {
	WikidataReactionsContext,
	type WikidataReaction,
} from "../providers/wikidataReactionsContext";

const EMPTY_REACTIONS: WikidataReaction[] = [];

function useWikidataReactions() {
	const reactions = useContext(WikidataReactionsContext);
	if (!reactions) {
		throw new Error("WikidataReactionsProvider is missing in the component tree.");
	}
	return reactions;
}

export function useWikidataReactionsForEntity(entityId: string) {
	return useWikidataReactions().byEntityId.get(entityId) ?? EMPTY_REACTIONS;
}

export function useWikidataReactionsIndex() {
	return useWikidataReactions().byEntityId;
}
