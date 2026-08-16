import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import FollowedPubkeysProvider from "./providers/FollowedPubkeysProvider";
import Nip07AuthProvider from "./providers/Nip07AuthProvider";
import EventStoreProvider from "./providers/EventStoreProvider";
import RelayPoolProvider from "./providers/RelayPoolProvider";
import NostrBootstrap from "./components/NostrBootstrap";
import WikidataReactionsProvider from "./providers/WikidataReactionsProvider";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<RelayPoolProvider>
			<EventStoreProvider>
				<Nip07AuthProvider>
					<FollowedPubkeysProvider>
						<WikidataReactionsProvider>
							<NostrBootstrap />
							<App />
						</WikidataReactionsProvider>
					</FollowedPubkeysProvider>
				</Nip07AuthProvider>
			</EventStoreProvider>
		</RelayPoolProvider>
	</StrictMode>,
);
