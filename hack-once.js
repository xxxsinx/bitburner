// args[0] - server
// args[1] - wait time
// args[2] - expected time
// args[3] - batchNumber
// args[4] - log color (undefined to disable logging)
export async function main(ns) {
	const [target, delay, expectedTime, batchNumber, logColor] = ns.args;
	//await ns.sleep(delay);
	//const start = performance.now();
	await ns.hack(target, { additionalMsec: delay });
	//const executionTime = performance.now() - start;
	// if (logColor != 0 && Math.abs(expectedTime - executionTime) > 100) {
	// 	ColorPrint(logColor, 'Batch #' + batchNumber + ' hack did not end with expected start=' + Math.round(start) + ' expected= ' + expectedTime + ' executionTime= ' + executionTime);
	// }
}

// export function ColorPrint() {
// 	let findProp = propName => {
// 		for (let div of eval("document").querySelectorAll("div")) {
// 			let propKey = Object.keys(div)[1];
// 			if (!propKey) continue;
// 			let props = div[propKey];
// 			if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
// 			if (props.children instanceof Array) for (let child of props.children) if (child?.props && child.props[propName]) return child.props[propName];
// 		}
// 	};
// 	let term = findProp("terminal");

// 	let out = [];
// 	for (let i = 0; i < arguments.length; i += 2) {
// 		out.push(React.createElement("span", { style: { color: `${arguments[i]}` } }, arguments[i + 1]))
// 	}
// 	try {
// 		term.printRaw(out);
// 	}
// 	catch { }
// }