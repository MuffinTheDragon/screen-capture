import React from "react";

const Error = () => {
	return (
		<div
			className="m-auto border rounded-md shadow-lg p-4 bg-blue-600/[0.15] border-blue-500"
			role="alert"
		>
			<div className="flex">
				<div className="flex-shrink-0">
					<svg
						className="h-4 w-4 text-red-400 mt-1"
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						fill="currentColor"
						viewBox="0 0 16 16"
					>
						<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"></path>
					</svg>
				</div>
				<div className="ml-4">
					<h3 className="font-semibold text-white">
						Invalid support
					</h3>
					<p className="mt-2 text-sm text-gray-400">
						This device does not support display media capabilities.
					</p>
				</div>
			</div>
		</div>
	);
};

export default Error;
