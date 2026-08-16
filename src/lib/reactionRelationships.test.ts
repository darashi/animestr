import { describe, expect, it } from "vitest";
import {
	classifyReactionAuthor,
	reactionRelationshipPriority,
	type ReactionRelationship,
} from "./reactionRelationships";

describe("reaction relationships", () => {
	const followed = new Set(["followed", "viewer"]);

	it("classifies the viewer before their follow list", () => {
		expect(classifyReactionAuthor("viewer", "viewer", followed)).toBe("self");
	});

	it("classifies users from the viewer's follow list", () => {
		expect(classifyReactionAuthor("followed", "viewer", followed)).toBe(
			"followed",
		);
	});

	it("classifies unrelated users and orders all relationships", () => {
		expect(classifyReactionAuthor("other", "viewer", followed)).toBe("other");
		const relationships: ReactionRelationship[] = ["other", "self", "followed"];
		expect(
			relationships.sort(
				(a, b) => reactionRelationshipPriority(a) - reactionRelationshipPriority(b),
			),
		).toEqual(["self", "followed", "other"]);
	});
});
