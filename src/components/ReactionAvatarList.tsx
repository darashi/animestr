import type { WorkReaction } from "../hooks/useWorkReactions";
import LinkedUserAvatar from "./LinkedUserAvatar";

type ReactionAvatarListProps = { reactions: WorkReaction[] };

function ReactionAvatarList({ reactions }: ReactionAvatarListProps) {
	return (
		<div className="flex items-center gap-2 flex-wrap">
			{reactions.map((reaction) => (
				<div
					key={`${reaction.pubkey}-${reaction.createdAt ?? "unknown"}`}
					className="tooltip tooltip-bottom"
					data-tip={reaction.pubkey}
				>
					<LinkedUserAvatar pubkey={reaction.pubkey} />
				</div>
			))}
		</div>
	);
}

export default ReactionAvatarList;
