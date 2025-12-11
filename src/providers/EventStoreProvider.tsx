import type { ReactNode } from "react";
import { EventStoreContext, eventStore } from "./eventStoreContext";

function EventStoreProvider({ children }: { children: ReactNode }) {
	return <EventStoreContext.Provider value={eventStore}>{children}</EventStoreContext.Provider>;
}

export default EventStoreProvider;
