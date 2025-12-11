function Navbar() {
	return (
		<header className="navbar bg-base-100 shadow">
			<div className="navbar-start">
				<div className="dropdown">
					<button
						type="button"
						className="btn btn-ghost btn-circle lg:hidden"
						tabIndex={0}
						aria-label="Menu"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<ul
						tabIndex={0}
						className="menu menu-sm dropdown-content mt-3 w-52 rounded-box bg-base-100 p-2 shadow"
					>
						<li>
							<a className="justify-between">Home</a>
						</li>
						<li>
							<a>Library</a>
						</li>
						<li>
							<a>About</a>
						</li>
					</ul>
				</div>
				<a className="btn btn-ghost text-xl font-bold" href="#">
					animestr
				</a>
			</div>

			<nav className="navbar-center hidden lg:flex">
				<ul className="menu menu-horizontal px-1">
					<li>
						<a className="font-medium">Home</a>
					</li>
					<li>
						<a className="font-medium">Library</a>
					</li>
					<li>
						<a className="font-medium">About</a>
					</li>
				</ul>
			</nav>

			<div className="navbar-end gap-2">
				<input
					type="text"
					placeholder="Search"
					className="input input-bordered input-sm w-32 lg:w-52"
					aria-label="Search"
				/>
				<button type="button" className="btn btn-primary btn-sm">
					Sign in
				</button>
			</div>
		</header>
	);
}

export default Navbar;
