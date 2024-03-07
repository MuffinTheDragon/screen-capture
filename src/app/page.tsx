"use client";

/*  required to solve issue with RecordRTC
	https://github.com/muaz-khan/RecordRTC/issues/795
*/
const Recorder = dynamic(() => import("./Recorder"), { ssr: false });
import dynamic from "next/dynamic";

export default function App() {
	return (
		<main className="flex h-screen items-center p-4 sm:p-24 bg-gradient-to-br from-cyan-950 via-transparent to-blue-950">
			<Recorder />
		</main>
	);
}
