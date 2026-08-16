import { IconUser } from "@tabler/icons-react";
import useProfile from "../hooks/useProfile";
import { formatShortPubkey } from "../lib/nostr";
import {
	isLikeReaction,
	reactionSymbol,
} from "../lib/reactions";
import type { ReactionRelationship } from "../lib/reactionRelationships";

type LinkedUserAvatarProps = {
	pubkey: string;
	sizeClassName?: string;
	relationship?: ReactionRelationship;
	reactionContent?: string;
};

function LinkedUserAvatar({
	pubkey,
	sizeClassName,
	relationship = "other",
	reactionContent,
}: LinkedUserAvatarProps) {
	const size = sizeClassName ?? "w-8 h-8";
	const { picture, name, isLoading } = useProfile(pubkey);
	const ringClassName = relationship === "self"
		? "ring-2 ring-primary"
		: relationship === "followed"
			? "ring-2 ring-secondary"
			: "ring-1 ring-base-300";
	const symbol = reactionContent ? reactionSymbol(reactionContent) : null;
	const isLike = reactionContent ? isLikeReaction(reactionContent) : false;
	const relationshipLabel = relationship === "self"
		? "You"
		: relationship === "followed"
			? "Following"
			: null;
	const label = [
		name ?? formatShortPubkey(pubkey),
		relationshipLabel,
		symbol ? `${symbol} reaction` : null,
	].filter(Boolean).join(" · ");

	return (
		<span
			className="tooltip tooltip-bottom inline-flex"
			data-tip={label}
			aria-label={label}
		>
			<span className={symbol ? "indicator" : "inline-flex"}>
				{symbol ? (
					<span className={`indicator-item indicator-end indicator-bottom z-10 grid h-4 min-w-4 place-items-center rounded-full border border-base-300 bg-base-100 px-0.5 text-xs leading-none shadow-sm ${isLike ? "font-bold text-primary" : ""}`}>
						{symbol}
					</span>
				) : null}
				<span className="avatar">
					<span
						className={`${size} rounded-full overflow-hidden bg-base-200 ring-offset-1 ring-offset-base-100 ${ringClassName}`}
					>
						{isLoading ? (
							<span className="flex h-full w-full items-center justify-center text-base-content/50">
								<IconUser size={16} />
							</span>
						) : picture ? (
							<img
								src={picture}
								alt={name ? `${name} avatar` : "User avatar"}
								className="w-full h-full object-cover"
							/>
						) : (
							<span className="flex h-full w-full items-center justify-center text-base-content/50">
								<IconUser size={16} />
							</span>
						)}
					</span>
				</span>
			</span>
		</span>
	);
}

export default LinkedUserAvatar;
