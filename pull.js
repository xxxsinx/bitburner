/** @param {NS} ns */
export async function main(ns) {
	const triggerPort = ns.getPortHandle(10);
	const pullPort = ns.getPortHandle(20);

	triggerPort.clear();
	pullPort.clear();

	while (true) {
		const start = performance.now();
		// Send a command to the trigger
		const command = 'weaken';
		ns.tprint('WARN: Sending: ' + command);
		triggerPort.write(command);

		// Await a reply from the trigger
		await pullPort.nextWrite();
		const reply = pullPort.read();
		const elapsed = performance.now() - start;
		ns.tprint('WARN: Reply: ' + reply + ' elapsed: ' + elapsed.toFixed(3) + 'ms');

		//ns.tprint('WARN: Waiting\n\n');
		ns.tprint('');
		await ns.sleep(250);
	}
}