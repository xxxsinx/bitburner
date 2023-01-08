/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');

	const triggerPort = ns.getPortHandle(10);
	const pullPort = ns.getPortHandle(20);

	triggerPort.clear();
	pullPort.clear();

	while (true) {
		if (triggerPort.peek() == 'NULL PORT DATA') {
			// Await a command from the puller
			await triggerPort.nextWrite();
		}
		else
			await ns.sleep(0);
		const command = triggerPort.read();
		//ns.tprint('INFO: Command: ' + command);

		let reply = command;
		// if (command == 'weaken') {
		// 	//let promise = ns.weaken('joesguns');
		// 	let started = performance.now();
		// 	//await promise.then(function () {
		// 		let elapsed = performance.now() - started;
		// 		reply = command; //command + ' finished in ' + elapsed.toFixed(2) + 'ms';
		// 	//}, function () {
		// 	// 	reply = 'Could not run ' + command;
		// 	// });
		// }
		// else {
		// 	reply = 'Invalid request ' + command;
		// }

		// Reply to the puller
		//ns.tprint('INFO: Sending: ' + reply);
		pullPort.write(reply);
	}
}