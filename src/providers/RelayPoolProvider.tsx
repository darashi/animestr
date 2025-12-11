import type { ReactNode } from "react";
import { RelayPoolContext, relayPool } from "./relayPoolContext";

function RelayPoolProvider({ children }: { children: ReactNode }) {
	return <RelayPoolContext.Provider value={relayPool}>{children}</RelayPoolContext.Provider>;
}

export default RelayPoolProvider;
