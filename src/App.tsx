import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import EntityWorksPage from "./pages/EntityWorksPage";
import SeasonWorksPage from "./pages/SeasonWorksPage";
import WorkPage from "./pages/WorkPage";
import {
	buildCastWorksQuery,
	buildCompanyWorksQuery,
	buildStaffWorksQuery,
} from "./lib/query";
import { parseRoute, type AppRoute } from "./lib/routes";

type EntityPageConfig = {
	key: string;
	entityId: string;
	titlePrefix: string;
	buildWorksQuery: (entityId: string) => string;
};

function entityPageForRoute(route: AppRoute | null): EntityPageConfig | null {
	if (!route || route.type === "season" || route.type === "work") return null;

	switch (route.type) {
		case "cast":
			return {
				key: `cast-${route.entityId}`,
				entityId: route.entityId,
				titlePrefix: "キャスト",
				buildWorksQuery: buildCastWorksQuery,
			};
		case "staff":
			return {
				key: `staff-${route.entityId}`,
				entityId: route.entityId,
				titlePrefix: "スタッフ",
				buildWorksQuery: buildStaffWorksQuery,
			};
		case "company":
			return {
				key: `company-${route.entityId}`,
				entityId: route.entityId,
				titlePrefix: "制作会社",
				buildWorksQuery: buildCompanyWorksQuery,
			};
	}
}

function App() {
	const basePath = import.meta.env.BASE_URL ?? "/";
	const [pathname, setPathname] = useState(() => window.location.pathname);
	const route = useMemo(() => parseRoute(pathname, basePath), [basePath, pathname]);
	const entityPage = useMemo(() => entityPageForRoute(route), [route]);
	const workId = route?.type === "work" ? route.workId : null;
	const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
		if (window.location.pathname === path) return;
		if (options?.replace) {
			window.history.replaceState(null, "", path);
		} else {
			window.history.pushState(null, "", path);
		}
		setPathname(path);
	}, []);

	useEffect(() => {
		const handlePopState = () => setPathname(window.location.pathname);
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, []);

	return (
		<div className="min-h-screen bg-base-200 text-base-content">
			<Navbar />
			<main className="container mx-auto px-4 py-10">
				{workId ? <WorkPage key={workId} basePath={basePath} workId={workId} /> : null}
				{entityPage ? (
					<EntityWorksPage
						key={entityPage.key}
						entityId={entityPage.entityId}
						titlePrefix={entityPage.titlePrefix}
						buildWorksQuery={entityPage.buildWorksQuery}
					/>
				) : null}
				<SeasonWorksPage
					active={!entityPage && !workId}
					basePath={basePath}
					pathSeason={route?.type === "season" ? route.season : null}
					navigate={navigate}
				/>
			</main>
		</div>
	);
}

export default App;
