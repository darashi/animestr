import { createContext } from "react";

export const FollowedPubkeysContext = createContext<ReadonlySet<string> | null>(null);
