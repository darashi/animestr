import type { WorkReaction } from "../hooks/useWorkReactions";
import LinkedUserAvatar from "./LinkedUserAvatar";

type ReactionAvatarListProps = { reactions: WorkReaction[] };

function formatCreatedAt(timestamp: number) {
	return new Date(timestamp * 1000).toLocaleString();
}

function ReactionAvatarList({ reactions }: ReactionAvatarListProps) {
	return (
		<div className="flex items-center gap-2 flex-wrap">
			{reactions.map((reaction) => {
				const createdAtLabel = formatCreatedAt(reaction.createdAt);
				return (
					<div key={reaction.id} className="tooltip tooltip-bottom" data-tip={createdAtLabel}>
						<LinkedUserAvatar pubkey={reaction.pubkey} />
					</div>
				);
			})}
		</div>
	);
}

export default ReactionAvatarList;
