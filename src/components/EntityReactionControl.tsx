import { IconStar, IconStarFilled } from "@tabler/icons-react";
import useToggleWikidataReaction from "../hooks/useToggleWikidataReaction";
import useWorkReactions from "../hooks/useWorkReactions";
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
	const { isLoggedIn, isReacted, isSaving, toggle } =
		useToggleWikidataReaction(entityId);
	const label = !isLoggedIn
		? "Log in with Nostr to react"
		: isReacted
			? "Remove reaction"
			: "React";

	const handleToggle = () => {
		void toggle().catch((error) => {
			console.error("Failed to save Wikidata reaction", error);
			window.alert(
				"Failed to save the reaction. Check your Nostr signer and relay connection.",
			);
		});
	};

	if (!entityId) return null;

	return (
		<span className="inline-flex items-center gap-1">
			<span className="tooltip tooltip-left" data-tip={label}>
				<button
					type="button"
					className={`btn btn-ghost btn-circle btn-xs ${isReacted ? "text-primary" : "text-base-content/50"}`}
					onClick={handleToggle}
					disabled={!isLoggedIn || isSaving}
					aria-label={label}
					aria-pressed={isReacted}
					aria-busy={isSaving}
				>
					{isSaving ? (
						<span className="loading loading-spinner loading-xs" />
					) : isReacted ? (
						<IconStarFilled size={16} />
					) : (
						<IconStar size={16} />
					)}
				</button>
			</span>
			<ReactionAvatarStack
				reactions={reactions}
				limit={limit}
				sizeClassName={sizeClassName}
			/>
		</span>
	);
}

export default EntityReactionControl;
