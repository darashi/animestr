import Navbar from "./components/Navbar";

function App() {
	return (
		<div className="min-h-screen bg-base-200 text-base-content">
			<Navbar />

			<main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
				<section className="rounded-box bg-base-100 p-6 shadow">
					<h1 className="text-2xl font-bold">Welcome to animestr</h1>
					<p className="mt-3 text-base">
						This navbar uses daisyUI components to keep navigation simple and clean. Resize the window to
						see the mobile dropdown menu in action.
					</p>
				</section>
			</main>
		</div>
	);
}

export default App;
