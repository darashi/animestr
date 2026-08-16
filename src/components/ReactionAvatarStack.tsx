import type { WorkReaction } from "../hooks/useWorkReactions";
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
	if (reactions.length === 0) return null;

	return (
		<span className="flex -space-x-2">
			{reactions.slice(0, limit).map((reaction) => (
				<LinkedUserAvatar
					key={reaction.id}
					pubkey={reaction.pubkey}
					sizeClassName={sizeClassName}
				/>
			))}
		</span>
	);
}

export default ReactionAvatarStack;
