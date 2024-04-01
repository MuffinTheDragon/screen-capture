const workercode = () => {
	let timerInterval: NodeJS.Timer;
	let time = 0;
	self.onmessage = function ({ data: { turn } }) {
		if (turn === "off") {
			clearInterval(timerInterval);
			time = 0;
		}
		if (turn === "on") {
			timerInterval = setInterval(() => {
				time += 1;
				self.postMessage({ time });
			}, 1000);
		}
		if (turn === "pause") {
			clearInterval(timerInterval);
		}
	};
};

let code = workercode.toString();
code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));

const blob = new Blob([code], { type: "application/javascript" });
export const worker_script = URL.createObjectURL(blob);
