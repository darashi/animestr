import { IconLogin, IconLogout, IconUser, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import useNip07Auth from "../hooks/useNip07Auth";
import useProfile from "../hooks/useProfile";
import { buildHomePath } from "../lib/routes";
import SearchBar from "./SearchBar";

type NavbarProps = {
	navigate: (path: string) => void;
};

function Navbar({ navigate }: NavbarProps) {
	const basePath = import.meta.env.BASE_URL ?? "/";
	const { session, isLoggingIn, error, login, logout, clearError } =
		useNip07Auth();
	const { picture } = useProfile(session?.pubkey);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDetailsElement>(null);

	useEffect(() => {
		if (!isMenuOpen) return;
		const closeOnOutsideClick = (event: PointerEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsMenuOpen(false);
		};
		document.addEventListener("pointerdown", closeOnOutsideClick);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsideClick);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [isMenuOpen]);

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
							<details
								ref={menuRef}
								className={`dropdown dropdown-end${isMenuOpen ? " dropdown-open" : ""}`}
								open={isMenuOpen}
								onToggle={(event) => setIsMenuOpen(event.currentTarget.open)}
							>
								<summary
									className="btn btn-ghost btn-circle ml-2"
									aria-label="Open account menu"
								>
									<div className="avatar">
										<div className="flex w-10 items-center justify-center overflow-hidden rounded-full bg-primary/20 font-semibold text-primary-content hover:bg-primary/20">
											{picture ? (
												<img src={picture} alt="" className="h-full w-full object-cover" />
											) : (
												<IconUser size={22} />
											)}
										</div>
									</div>
								</summary>
								<ul className="menu menu-sm dropdown-content right-0 z-20 mt-3 w-56 rounded-box bg-base-100 p-3 shadow">
									<li className="text-lg leading-relaxed">
										<button
											type="button"
											onClick={() => {
												logout();
												setIsMenuOpen(false);
											}}
											className="flex w-full items-center gap-2 px-2 py-3 text-left"
										>
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
