import { useMemo } from "react";
import EntityReactionControl from "../components/EntityReactionControl";
import WorkCard from "../components/WorkCard";
import useEntityWorks from "../hooks/useEntityWorks";
import useThingstrEntityReactions from "../hooks/useThingstrEntityReactions";
import useVisibleWorkIds from "../hooks/useVisibleWorkIds";
import useWorkDetails from "../hooks/useWorkDetails";
import { collectVisibleEntityIds, groupWorksByStartYear } from "../lib/works";

type EntityWorksPageProps = {
	entityId: string;
	titlePrefix: string;
	buildWorksQuery: (entityId: string) => string;
};

function EntityWorksPage({ entityId, titlePrefix, buildWorksQuery }: EntityWorksPageProps) {
	const { works, entityName, loading, error } = useEntityWorks(entityId, buildWorksQuery);
	const { visibleIds, registerWorkRef } = useVisibleWorkIds();
	const worksWithDetails = useWorkDetails(works, visibleIds);
	const visibleEntityIds = useMemo(
		() => collectVisibleEntityIds(worksWithDetails, visibleIds, [entityId]),
		[entityId, visibleIds, worksWithDetails],
	);
	const worksByYear = useMemo(() => groupWorksByStartYear(worksWithDetails), [worksWithDetails]);
	useThingstrEntityReactions(visibleEntityIds);

	return (
		<div className="space-y-6">
			<section className="space-y-4">
				<div className="card bg-base-100 shadow-sm">
					<div className="card-body">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-lg font-semibold">
								{titlePrefix}: {entityName}
							</h2>
							<a
								className="badge badge-outline badge-primary rounded-full no-underline font-normal text-xs px-2 py-1 whitespace-nowrap"
								href={`https://www.wikidata.org/entity/${entityId}`}
								target="_blank"
								rel="noreferrer"
							>
								{entityId}
							</a>
							<EntityReactionControl entityId={entityId} />
						</div>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				{error ? (
					<div className="alert alert-error">
						<span>Failed to load: {error}</span>
					</div>
				) : null}

				{loading && !error ? (
					<div className="flex justify-center py-4">
						<span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
					</div>
				) : null}

				{!loading && !error ? (
					worksWithDetails.length === 0 ? (
						<p className="text-sm text-base-content/70">
							{entityName}の作品が見つかりませんでした。
						</p>
					) : (
						<div className="space-y-6">
							{worksByYear.map(([year, items]) => (
								<section key={year} className="space-y-3">
									<h3 className="text-base font-semibold text-base-content">{year}</h3>
									<ul className="grid gap-4">
										{items.map((work) => (
											<WorkCard
												key={work.id || work.url}
												ref={registerWorkRef(work.id)}
												{...work}
											/>
										))}
									</ul>
								</section>
							))}
						</div>
					)
				) : null}
			</section>
		</div>
	);
}

export default EntityWorksPage;
