type CompactEntityProps = {
	id: string;
	name: string;
};

function CompactEntity({ id, name }: CompactEntityProps) {
	const safeId = id || "Q?";
	const url = id ? `https://www.wikidata.org/entity/${id}` : undefined;
	return (
		<span className="inline-flex items-center gap-1 text-xs text-base-content/80">
			<span className="truncate max-w-[12rem]">{name}</span>
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
	);
}

export default CompactEntity;
