import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import EventStoreProvider from "./providers/EventStoreProvider";
import RelayPoolProvider from "./providers/RelayPoolProvider";
import useThingstrReactionsSubscription from "./hooks/useThingstrReactionsSubscription";

function NostrBootstrap() {
	useThingstrReactionsSubscription();
	return null;
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RelayPoolProvider>
			<EventStoreProvider>
				<NostrBootstrap />
				<App />
			</EventStoreProvider>
		</RelayPoolProvider>
	</StrictMode>,
);
