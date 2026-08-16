import { IconLogin, IconLogout, IconUser, IconX } from "@tabler/icons-react";
import useNip07Auth from "../hooks/useNip07Auth";
import useProfile from "../hooks/useProfile";
import { formatShortPubkey } from "../lib/nostr";
import { buildHomePath } from "../lib/routes";
import SearchBar from "./SearchBar";

type NavbarProps = {
	navigate: (path: string) => void;
};

function Navbar({ navigate }: NavbarProps) {
	const basePath = import.meta.env.BASE_URL ?? "/";
	const { session, isLoggingIn, error, login, logout, clearError } =
		useNip07Auth();
	const { picture, name } = useProfile(session?.pubkey);
	const accountLabel = name ?? (session ? formatShortPubkey(session.pubkey) : "");

	return (
		<>
			<header className="bg-base-100 shadow-sm">
				<div className="navbar container mx-auto flex-wrap gap-2 px-4">
					<div className="flex-none">
						<a className="btn btn-ghost text-xl font-bold" href={buildHomePath(basePath)}>
							animestr
						</a>
					</div>
					<SearchBar
						basePath={basePath}
						navigate={navigate}
						className="order-last w-full flex-none sm:order-none sm:min-w-0 sm:flex-1"
					/>
					<div className="ml-auto flex-none sm:ml-0">
						{session ? (
							<details className="dropdown dropdown-end">
								<summary className="btn btn-ghost btn-sm gap-2">
									<div className="avatar">
										<div className="w-7 rounded-full bg-base-200 overflow-hidden">
											{picture ? (
												<img src={picture} alt="" className="h-full w-full object-cover" />
											) : (
												<span className="flex h-full w-full items-center justify-center">
													<IconUser size={16} />
												</span>
											)}
										</div>
									</div>
									<span className="hidden sm:inline">{accountLabel}</span>
								</summary>
								<ul className="menu dropdown-content z-20 mt-3 w-64 rounded-box bg-base-100 p-2 shadow">
									<li className="menu-title">
										<span className="truncate">{accountLabel}</span>
									</li>
									<li>
										<button type="button" onClick={logout}>
											<IconLogout size={18} />
											Log out
										</button>
									</li>
								</ul>
							</details>
						) : (
							<button
								type="button"
								className="btn btn-ghost btn-circle btn-sm"
								onClick={() => void login()}
								disabled={isLoggingIn}
								aria-label="Log in with Nostr"
							>
								{isLoggingIn ? (
									<span className="loading loading-spinner loading-sm" />
								) : (
									<IconLogin size={18} />
								)}
							</button>
						)}
					</div>
				</div>
			</header>
			{error ? (
				<div className="toast toast-top toast-end z-50">
					<div role="alert" className="alert alert-error">
						<span>{error}</span>
						<button
							type="button"
							className="btn btn-ghost btn-circle btn-xs"
							onClick={clearError}
							aria-label="Dismiss error"
						>
							<IconX size={16} />
						</button>
					</div>
				</div>
			) : null}
		</>
	);
}

export default Navbar;
