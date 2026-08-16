import { useMemo } from "react";
import useFollowedPubkeys from "../hooks/useFollowedPubkeys";
import useNip07Auth from "../hooks/useNip07Auth";
import type { WorkReaction } from "../hooks/useWorkReactions";
import { normalizePubkey } from "../lib/nostr";
import {
	classifyReactionAuthor,
	reactionRelationshipPriority,
} from "../lib/reactionRelationships";
import LinkedUserAvatar from "./LinkedUserAvatar";

type ReactionAvatarStackProps = {
	reactions: WorkReaction[];
	limit?: number;
	sizeClassName?: string;
};

function ReactionAvatarStack({
	reactions,
	limit = 5,
	sizeClassName = "w-6 h-6",
}: ReactionAvatarStackProps) {
	const followedPubkeys = useFollowedPubkeys();
	const { session } = useNip07Auth();
	const viewerPubkey = session?.pubkey ?? null;
	const sortedReactions = useMemo(() => {
		return reactions
			.map((reaction) => {
				const pubkey = normalizePubkey(reaction.pubkey) ?? reaction.pubkey;
				const relationship = classifyReactionAuthor(
					pubkey,
					viewerPubkey,
					followedPubkeys,
				);
				return { ...reaction, pubkey, relationship } as const;
			})
			.sort((a, b) => {
				return reactionRelationshipPriority(a.relationship)
					- reactionRelationshipPriority(b.relationship)
					|| b.createdAt - a.createdAt;
			});
	}, [followedPubkeys, reactions, viewerPubkey]);

	if (reactions.length === 0) return null;

	return (
		<span className="flex -space-x-2">
			{sortedReactions.slice(0, limit).map((reaction) => {
				const label = reaction.relationship === "self"
					? "Your reaction"
					: reaction.relationship === "followed"
						? "Reaction from someone you follow"
						: "Reaction from another user";
				return (
					<span
						key={reaction.id}
						className="tooltip tooltip-bottom"
						data-tip={label}
						aria-label={label}
					>
						<LinkedUserAvatar
							pubkey={reaction.pubkey}
							sizeClassName={sizeClassName}
							relationship={reaction.relationship}
						/>
					</span>
				);
			})}
		</span>
	);
}

export default ReactionAvatarStack;
