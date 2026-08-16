import { describe, expect, it } from "vitest";
import {
	isLikeReaction,
	normalizeReactionContent,
	parseEmojiReaction,
	reactionSymbol,
} from "./reactions";

describe("reaction content", () => {
	it("normalizes empty reactions to the NIP-25 like reaction", () => {
		expect(normalizeReactionContent("")).toBe("+");
		expect(normalizeReactionContent(" + ")).toBe("+");
	});

	it.each(["🔥", "👍🏽", "👨‍👩‍👧‍👦", "🇯🇵", "1️⃣"])(
		"accepts one Unicode emoji: %s",
		(emoji) => {
			expect(parseEmojiReaction(emoji)).toBe(emoji);
		},
	);

	it.each(["", "hello", "🔥⭐", "+"])("rejects non-emoji input: %s", (value) => {
		expect(parseEmojiReaction(value)).toBeNull();
	});

	it("maps conventional NIP-25 reactions to visible emoji", () => {
		expect(isLikeReaction("+")).toBe(true);
		expect(isLikeReaction("🔥")).toBe(false);
		expect(reactionSymbol("+")).toBe("★");
		expect(reactionSymbol("-")).toBe("👎");
		expect(reactionSymbol("🥹")).toBe("🥹");
	});
});
