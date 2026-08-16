import EntityReactionControl from "./EntityReactionControl";

type CompactEntityProps = {
	id: string;
	name: string;
	linkPath?: string;
	suffix?: string;
};

function CompactEntity({ id, name, linkPath, suffix }: CompactEntityProps) {
	const safeId = id || "Q?";
	const url = id ? `https://www.wikidata.org/entity/${id}` : undefined;
	return (
		<span className="join inline-flex max-w-full align-middle text-xs text-base-content/80">
			<span className="join-item inline-flex min-w-0 items-center gap-2 border border-base-300 bg-base-100 px-2 py-1">
				<span className="inline-flex min-w-0 items-center gap-1">
					{linkPath ? (
						<a className="truncate max-w-[12rem] hover:underline" href={linkPath}>
							{name}
						</a>
					) : (
						<span className="truncate max-w-[12rem]">{name}</span>
					)}
					{suffix ? <span className="text-[10px] text-base-content/60">({suffix})</span> : null}
				</span>
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
			</span>
			{id ? (
				<span className="join-item inline-flex items-center border border-base-300 bg-base-200 px-1">
					<EntityReactionControl entityId={id} limit={3} sizeClassName="w-6 h-6" />
				</span>
			) : null}
		</span>
	);
}

export default CompactEntity;
