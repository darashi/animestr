import useToggleWikidataReaction from "../hooks/useToggleWikidataReaction";
import useWorkReactions from "../hooks/useWorkReactions";
import { isLikeReaction } from "../lib/reactions";
import EmojiReactionPicker from "./EmojiReactionPicker";
import ReactionAvatarStack from "./ReactionAvatarStack";

type EntityReactionControlProps = {
	entityId: string;
	limit?: number;
	sizeClassName?: string;
};

function EntityReactionControl({
	entityId,
	limit,
	sizeClassName,
}: EntityReactionControlProps) {
	const { reactions } = useWorkReactions(entityId);
	const {
		isLoggedIn,
		isSaving,
		hasReaction,
		ownReactionContents,
		toggle,
	} =
		useToggleWikidataReaction(entityId);

	const handleToggle = async (content: string) => {
		try {
			await toggle(content);
		} catch (error) {
			console.error("Failed to save Wikidata reaction", error);
			window.alert(
				"Failed to save the reaction. Check your Nostr signer and relay connection.",
			);
			throw error;
		}
	};
	const ownEmojiReactionContents = ownReactionContents.filter(
		(content) => !isLikeReaction(content),
	);

	if (!entityId) return null;

	return (
		<span className="inline-flex items-center gap-3">
			<ReactionAvatarStack
				reactions={reactions}
				limit={limit}
				sizeClassName={sizeClassName}
			/>
			<EmojiReactionPicker
				isLoggedIn={isLoggedIn}
				isSaving={isSaving}
				ownEmojiReactionContents={ownEmojiReactionContents}
				hasReaction={hasReaction}
				onToggle={handleToggle}
			/>
		</span>
	);
}

export default EntityReactionControl;
