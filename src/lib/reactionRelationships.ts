export type ReactionRelationship = "self" | "followed" | "other";

export function classifyReactionAuthor(
	pubkey: string,
	viewerPubkey: string | null,
	followedPubkeys: ReadonlySet<string>,
): ReactionRelationship {
	if (viewerPubkey === pubkey) return "self";
	if (followedPubkeys.has(pubkey)) return "followed";
	return "other";
}

export function reactionRelationshipPriority(
	relationship: ReactionRelationship,
): number {
	return relationship === "self" ? 0 : relationship === "followed" ? 1 : 2;
}
