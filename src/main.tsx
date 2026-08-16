import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import EventStoreProvider from "./providers/EventStoreProvider";
import RelayPoolProvider from "./providers/RelayPoolProvider";
import NostrBootstrap from "./components/NostrBootstrap";
import WikidataReactionsProvider from "./providers/WikidataReactionsProvider";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RelayPoolProvider>
			<EventStoreProvider>
				<WikidataReactionsProvider>
					<NostrBootstrap />
					<App />
				</WikidataReactionsProvider>
			</EventStoreProvider>
		</RelayPoolProvider>
	</StrictMode>,
);
