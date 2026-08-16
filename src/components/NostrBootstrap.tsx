import useThingstrReactionsSubscription from "../hooks/useThingstrReactionsSubscription";

function NostrBootstrap() {
	useThingstrReactionsSubscription();
	return null;
}

export default NostrBootstrap;
