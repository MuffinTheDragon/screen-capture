import { use, useEffect, useRef, useState } from "react";
import RecordRTC from "recordrtc";
import fixWebmDuration from "fix-webm-duration";
import Error from "./Error";

export default function Recorder() {
	/* async function startRecording() {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
});
recorder = new MediaRecorder(stream);

const chunks = [];
recorder.ondataavailable = e => chunks.push(e.data);
recorder.onstop = e => {
    const blob = new Blob(chunks, { type: chunks[0].type });
    console.log(blob);
    stream.getVideoTracks()[0].stop();

    filename="yourCustomFileName"
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;        
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }
    };
    recorder.start();
}
startRecording(); //Start of the recording 

-----------

recorder.stop() // End your recording by emitting this event
 */
	const [videoURL, setVideoURL] = useState("");
	const [status, setStatus] = useState("idle");
	const [duration, setDuration] = useState(0);
	const [useMic, setUseMic] = useState(false);

	const [showError, setShowError] = useState(false);

	const [stream, setStream] = useState<MediaStream>();
	const recorder = useRef<RecordRTC | null>(null);

	useEffect(() => {
		// check if device is compatible
		if (!navigator.mediaDevices) setShowError(true);
	}, []);

	useEffect(() => {
		let interval: NodeJS.Timer;
		if (status === "recording")
			interval = setInterval(() => setDuration(duration + 1), 1000);

		return () => clearInterval(interval);
	}, [status, duration]);

	const stopRecording = () => {
		recorder.current?.stopRecording(() => {
			fixWebmDuration(
				recorder.current!.getBlob(),
				duration * 1000,
				(newBlob) => setVideoURL(URL.createObjectURL(newBlob))
			);
			stream?.getTracks().map((track) => track.stop());
		});
		setStatus("stopped");
		setDuration(0);
	};

	const pauseRecording = () => {
		recorder.current?.pauseRecording();
		setStatus("paused");
	};

	const resumeRecording = () => {
		recorder.current?.resumeRecording();
		setStatus("recording");
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
			screenCapture.addEventListener("ended", () => stopRecording());
		}

		recorder.current.startRecording();
		setStream(_screenStream);
		setStatus("recording");
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
		"hover:cursor-pointer relative flex justify-center items-center w-32 h-32 bg-white rounded-xl before:absolute before:-inset-[2px] before:-z-[1] before:bg-gradient-to-br before:from-blue-600 before:via-transparent before:to-violet-600 before:rounded-xl dark:bg-slate-900";

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
							className="relative w-[3.25rem] h-7 bg-gray-100 checked:bg-none checked:bg-blue-600 border-2 rounded-full cursor-pointer transition-colors ease-in-out duration-200 border-transparent ring-1 ring-transparent ring-offset-white focus:outline-none appearance-none dark:bg-gray-700 dark:checked:bg-blue-600 dark:focus:ring-offset-gray-800 before:inline-block before:w-6 before:h-6 before:bg-white checked:before:bg-blue-200 before:translate-x-0 checked:before:translate-x-full before:shadow before:rounded-full before:transform before:ring-0 before:transition before:ease-in-out before:duration-200 dark:before:bg-gray-400 dark:checked:before:bg-blue-200"
						/>
					</div>
					<div className="text-center text-sm mt-1">Use mic?</div>
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
				<div className="grid shadow-lg">
					<video
						src={videoURL}
						className="bg-black rounded-xl max-h-[75vh] w-[75vw]"
						controls
						loop
						autoPlay
					/>
					<button
						onClick={() => setStatus("idle")}
						className="hover:bg-blue-700 px-4 py-2 font-semibold text-sm bg-blue-600 mt-5 text-white rounded-md shadow-sm"
					>
						Restart
					</button>
				</div>
			) : null}
		</div>
	);
}
