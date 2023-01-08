/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');

	const triggerPort = ns.getPortHandle(10);
	const pullPort = ns.getPortHandle(20);

	triggerPort.clear();
	pullPort.clear();

	let checksum = 0;

	while (true) {
		const start = performance.now();
		// Send a command to the trigger
		const command = checksum.toString();
		//ns.tprint('WARN: Sending: ' + command);
		triggerPort.write(command);

		// Await a reply from the trigger
		await pullPort.nextWrite();
		const reply = pullPort.read();
		const elapsed = performance.now() - start;
		ns.print('WARN: Sent: + ' + checksum + ' Reply: ' + reply + ' elapsed: ' + elapsed.toFixed(3) + 'ms');

		//ns.tprint('WARN: Waiting\n\n');

		checksum++;
		ns.print('');
		await ns.sleep(250);
	}
}