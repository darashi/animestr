import type { WorkEntity } from "../types/work";
import CompactEntity from "./CompactEntity";

type WorkEntityRowProps = {
	label: string;
	entities: (WorkEntity & { role?: string })[];
	buildPath: (id: string) => string;
	showRole?: boolean;
};

function WorkEntityRow({ label, entities, buildPath, showRole = false }: WorkEntityRowProps) {
	if (entities.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
			<span className="font-semibold text-base-content">{label}:</span>
			<div className="flex flex-wrap items-center gap-2">
				{entities.map((entity) => (
					<CompactEntity
						key={entity.id || entity.name}
						id={entity.id}
						name={entity.name}
						linkPath={buildPath(entity.id)}
						suffix={showRole ? entity.role : undefined}
					/>
				))}
			</div>
		</div>
	);
}

export default WorkEntityRow;
