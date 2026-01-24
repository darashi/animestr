import useWorkReactions from "../hooks/useWorkReactions";
import LinkedUserAvatar from "./LinkedUserAvatar";

type CompactEntityProps = {
	id: string;
	name: string;
	linkPath?: string;
};

function CompactEntity({ id, name, linkPath }: CompactEntityProps) {
	const safeId = id || "Q?";
	const url = id ? `https://www.wikidata.org/entity/${id}` : undefined;
	const { reactions } = useWorkReactions(id);
	const shownReactions = reactions.slice(0, 3);
	return (
		<span className="inline-flex items-center gap-2 text-xs text-base-content/80">
			{linkPath ? (
				<a className="truncate max-w-[12rem] hover:underline" href={linkPath}>
					{name}
				</a>
			) : (
				<span className="truncate max-w-[12rem]">{name}</span>
			)}
			{url ? (
				<a
					className="badge badge-outline badge-primary rounded-full no-underline font-normal text-[10px] px-2 py-0.5"
					href={url}
					target="_blank"
					rel="noreferrer"
				>
					{safeId}
				</a>
			) : (
				<span className="badge badge-outline badge-primary rounded-full font-normal text-[10px] px-2 py-0.5">
					{safeId}
				</span>
			)}
			{shownReactions.length > 0 ? (
				<span className="flex -space-x-2">
					{shownReactions.map((reaction) => (
						<LinkedUserAvatar
							key={reaction.id}
							pubkey={reaction.pubkey}
							sizeClassName="w-5 h-5"
						/>
					))}
				</span>
			) : null}
		</span>
	);
}

export default CompactEntity;
