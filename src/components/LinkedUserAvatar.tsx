import { IconUser } from "@tabler/icons-react";
import useProfile from "../hooks/useProfile";
import type { ReactionRelationship } from "../lib/reactionRelationships";

type LinkedUserAvatarProps = {
	pubkey: string;
	sizeClassName?: string;
	relationship?: ReactionRelationship;
};

function LinkedUserAvatar({
	pubkey,
	sizeClassName,
	relationship = "other",
}: LinkedUserAvatarProps) {
	const size = sizeClassName ?? "w-8 h-8";
	const { picture, name, isLoading } = useProfile(pubkey);
	const ringClassName = relationship === "self"
		? "ring-2 ring-primary"
		: relationship === "followed"
			? "ring-2 ring-secondary"
			: "ring-1 ring-base-300";

	return (
		<div className="avatar">
			<div
				className={`${size} rounded-full overflow-hidden bg-base-200 ring-offset-1 ring-offset-base-100 ${ringClassName}`}
			>
				{isLoading && (
					<div className="flex h-full w-full items-center justify-center text-base-content/50">
						<IconUser size={16} />
					</div>
				)}
				{!isLoading &&
					(picture ? (
						<img
							src={picture}
							alt={name ? `${name} avatar` : "User avatar"}
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-base-content/50">
							<IconUser size={16} />
						</div>
					))}
			</div>
		</div>
	);
}

export default LinkedUserAvatar;
