import { IconUser } from "@tabler/icons-react";
import useProfile from "../hooks/useProfile";

type LinkedUserAvatarProps = {
	pubkey: string;
	sizeClassName?: string;
};

function LinkedUserAvatar({ pubkey, sizeClassName }: LinkedUserAvatarProps) {
	const size = sizeClassName ?? "w-8 h-8";
	const { picture, isLoading } = useProfile(pubkey);

	return (
		<div className="avatar">
			<div className={`${size} rounded-full overflow-hidden bg-base-200`}>
				{isLoading && (
					<div className="flex h-full w-full items-center justify-center text-base-content/50">
						<IconUser size={16} />
					</div>
				)}
				{!isLoading &&
					(picture ? (
						<img src={picture} alt="User avatar" className="w-full h-full object-cover" />
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
