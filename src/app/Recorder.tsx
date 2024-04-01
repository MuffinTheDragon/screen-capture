import { useEffect, useRef, useState } from "react";
import RecordRTC from "recordrtc";
import fixWebmDuration from "fix-webm-duration";
import Error from "./Error";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";
import { worker_script } from "./timer";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/solid";

const timer = new Worker(worker_script);

export default function Recorder() {
	const [videoURL, setVideoURL] = useState("");
	const [status, setStatus] = useState("idle");
	const [duration, setDuration] = useState(0);
	const durationRef = useRef(0);
	const [useMic, setUseMic] = useState(false);

	const ffmpegRef = useRef(new FFmpeg());
	const [mp4URL, setMp4URL] = useState(null);
	const [converting, setConverting] = useState(false);

	const [showError, setShowError] = useState(false);

	const [stream, setStream] = useState<MediaStream>();
	const recorder = useRef<RecordRTC | null>(null);

	useEffect(() => {
		// check if device is compatible
		if (!navigator?.mediaDevices?.getDisplayMedia) setShowError(true);
	}, []);

	useEffect(() => {
		const load = async () => {
			const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
			const ffmpeg = ffmpegRef.current;
			ffmpeg.on("log", ({ message }) => {
				console.log(message);
			});
			// toBlobURL is used to bypass CORS issue, urls with the same
			// domain can be used directly.
			await ffmpeg.load({
				coreURL: await toBlobURL(
					`${baseURL}/ffmpeg-core.js`,
					"text/javascript"
				),
				wasmURL: await toBlobURL(
					`${baseURL}/ffmpeg-core.wasm`,
					"application/wasm"
				),
			});
		};

		load();
	}, []);

	useEffect(() => {
		timer.onmessage = ({ data: { time } }) => {
			setDuration(time);
			durationRef.current = time;
		};
	}, []);

	const stopRecording = () => {
		recorder.current?.stopRecording(() => {
			timer.postMessage({ turn: "off" });
			fixWebmDuration(
				recorder.current!.getBlob(),
				durationRef.current * 1000,
				(newBlob) => setVideoURL(URL.createObjectURL(newBlob))
			);
			stream?.getTracks().map((track) => track.stop());
			setStatus("stopped");
			setDuration(0);
			durationRef.current = 0;
		});
	};

	const convertToMp4 = async () => {
		setConverting(true);
		const ffmpeg = ffmpegRef.current;
		await ffmpeg.writeFile("input.webm", await fetchFile(videoURL));
		await ffmpeg.exec([
			"-i",
			"input.webm",
			// "-vf",
			// "fps=15,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
			"-c",
			"copy",
			"output.mp4",
		]);
		const data = await ffmpeg.readFile("output.mp4");
		setMp4URL(
			// @ts-ignore
			URL.createObjectURL(new Blob([data.buffer], { type: "video/mp4" }))
		);
		setConverting(false);
	};

	const pauseRecording = () => {
		recorder.current?.pauseRecording();
		setStatus("paused");
		timer.postMessage({ turn: "pause" });
	};

	const resumeRecording = () => {
		recorder.current?.resumeRecording();
		setStatus("recording");
		timer.postMessage({ turn: "on" });
	};

	const startRecording = async () => {
		setStatus("acquiring_media");

		let _micStream;
		try {
			if (useMic)
				_micStream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
		} catch {
			console.log("mic permission denied");
		}

		let _screenStream;
		try {
			_screenStream = await navigator.mediaDevices.getDisplayMedia({
				video: {
					width: { ideal: 4096 },
					height: { ideal: 2160 },
					frameRate: 30,
				},

				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					sampleRate: 44100,
				},
			});
		} catch {
			setStatus("idle");
			return;
		}

		const allStreams = new MediaStream();

		if (_micStream && useMic)
			_micStream
				.getTracks()
				.forEach((track) => allStreams.addTrack(track));

		_screenStream
			.getTracks()
			.forEach((track) => allStreams.addTrack(track));

		recorder.current = new RecordRTC(allStreams, {
			// @ts-ignore
			mimeType: 'video/webm;codecs="vp9,opus"',
		});

		// when ending capture using browser component
		const screenCapture = _screenStream.getVideoTracks()[0];
		if (screenCapture) {
			screenCapture.addEventListener("ended", () => {
				stopRecording();
			});
		}

		recorder.current.startRecording();
		setStream(_screenStream);
		setStatus("recording");
		timer.postMessage({ turn: "on" });
	};

	const hours = Math.floor(duration / 3600);
	const minutes = Math.floor((duration % 3600) / 60);
	const seconds = duration % 60;

	const getDurationString = (
		<span>
			{hours}:{minutes.toString().padStart(2, "0")}:
			{seconds.toString().padStart(2, "0")}
		</span>
	);

	let gradientSquare =
		"hover:cursor-pointer relative flex justify-center items-center w-32 h-32 rounded-xl before:absolute before:-inset-[2px] before:-z-[1] before:bg-gradient-to-br before:from-blue-600 before:via-transparent before:to-violet-600 before:rounded-xl bg-slate-900";

	if (status !== "paused") gradientSquare += " box";

	if (showError) return <Error />;

	return (
		<div className="m-auto">
			{/* default render when in idle mode */}
			{status && status === "idle" ? (
				<div className="grid">
					<div onClick={startRecording} className={gradientSquare}>
						<svg
							className="w-20 h-20"
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							fill="currentColor"
							viewBox="0 0 16 16"
						>
							<path d="M10.804 8 5 4.633v6.734L10.804 8zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696l6.363 3.692z"></path>
						</svg>
					</div>
					<div className="mt-2 text-center">Click to record</div>
					<div className="text-center mt-3">
						<input
							checked={useMic}
							onChange={() => setUseMic(!useMic)}
							type="checkbox"
							id="hs-basic-usage"
							className="switch"
						/>
					</div>
					<div className="text-center text-sm mt-1 flex items-center justify-center ps-3">
						Use mic
						<div className="px-1 hover:cursor-pointer group">
							<QuestionMarkCircleIcon className="w-5 h-5 hover:cursor-pointer" />
							<div className="opacity-0 transition ease-in-out group-hover:opacity-100 duration-300 mt-2 -ms-[165px] absolute z-50 whitespace-normal break-words rounded-md py-1.5 px-3 font-sans text-sm font-normal bg-gray-700 text-white focus:outline-none">
								You can&apos;t record both mic and system audio.
								<br />
								If both are selected, mic audio is prioritized.
							</div>
						</div>
					</div>
				</div>
			) : null}

			{/* render when selecting display */}
			{status && status === "acquiring_media" ? (
				<svg
					className="animate-spin -ml-1 mr-3 h-12 w-12 text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					></circle>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			) : null}

			{/* render when actively recording */}
			{status && status === "recording" ? (
				<div className="grid">
					<div
						className={`grid hover:cursor-pointer justify-items-center items-center ${gradientSquare}`}
						onClick={pauseRecording}
					>
						<span className="relative flex h-10 w-10 mt-3">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-10 w-10 bg-red-500"></span>
						</span>
						<span>REC</span>
						<span>{getDurationString}</span>
					</div>
					<button
						className="mt-5 bg-red-600 rounded-md p-1"
						onClick={stopRecording}
					>
						Stop
					</button>
				</div>
			) : null}

			{/* render when paused */}
			{status && status === "paused" ? (
				<div className="grid">
					<div
						className={`hover:cursor-pointer ${gradientSquare}`}
						onClick={resumeRecording}
					>
						<span className="grid">
							<svg
								className="ms-1 mt-2 mb-1 h-12 w-12"
								width="24"
								height="24"
								viewBox="0 0 24 24"
							>
								<g
									transform="translate(0.000000,24.000000) scale(0.100000,-0.100000)"
									fill="white"
									stroke="none"
								>
									<path d="M60 120 c0 -63 2 -70 20 -70 18 0 20 7 20 70 0 63 -2 70 -20 70 -18 0 -20 -7 -20 -70z" />
									<path d="M140 120 c0 -63 2 -70 20 -70 18 0 20 7 20 70 0 63 -2 70 -20 70 -18 0 -20 -7 -20 -70z" />
								</g>
							</svg>
							<span className="text-center">Paused</span>
						</span>
					</div>
					<button
						className="mt-5 bg-red-600 rounded-md p-1"
						onClick={stopRecording}
					>
						Stop
					</button>
				</div>
			) : null}

			{/* render when no longer recording */}
			{status && status === "stopped" ? (
				<div>
					<div
						className="flex items-center space-x-1 justify-center p-4 mb-4 text-sm rounded-md bg-gray-800 text-blue-400"
						role="alert"
					>
						<InformationCircleIcon className="w-4 h-4" />
						<span className="font-medium ">
							The recording may not play with the default Windows
							apps. You can always play the recording in your
							browser or using VLC.
						</span>
					</div>
					<div className="grid shadow-lg">
						<video
							src={videoURL}
							className="bg-black rounded-md max-h-[75vh] w-[75vw]"
							controls
							loop
							autoPlay
						/>
					</div>
					<div>
						<div className="flex items-center justify-between mt-5">
							<div>
								<a
									className="hover:bg-blue-700 px-4 py-2 font-semibold text-sm bg-blue-600 text-white rounded-md shadow-sm me-2"
									href={videoURL}
									download={`Recording - ${new Date().toDateString()}`}
								>
									Download source (.webm)
								</a>
								<button
									onClick={() =>
										!mp4URL ? convertToMp4() : null
									}
									disabled={converting}
									className="disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-700 px-4 py-2 rounded-md font-semibold text-sm shadow-sm"
								>
									{converting && (
										<p className="inline-flex">
											<svg
												className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
												viewBox="0 0 24 24"
											>
												<circle
													className="opacity-25"
													cx="12"
													cy="12"
													r="10"
													strokeWidth="4"
												></circle>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
											Converting...
										</p>
									)}
									{!converting && !mp4URL && (
										<p>Convert to MP4</p>
									)}
									{mp4URL && (
										<a
											href={mp4URL}
											download={`Recording - ${new Date().toDateString()}`}
										>
											Download MP4
										</a>
									)}
								</button>
							</div>
							<button
								onClick={() => {
									setStatus("idle");
									setMp4URL(null);
								}}
								className="bg-red-500 hover:bg-red-700 px-4 py-[7px] mt-[1px] rounded-md font-semibold text-sm shadow-sm"
							>
								Restart
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
