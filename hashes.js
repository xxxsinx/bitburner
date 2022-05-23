/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	while (true) {
		let capacity = ns.hacknet.hashCapacity();
		let current = ns.hacknet.numHashes();

		ns.print('Current hashes: ' + current + ' of max ' + capacity);

		// if (current > 200) {
		// 	ns.hacknet.spendHashes('Generate Coding Contract');
		// 	await ns.sleep(5000);
		// 	ns.exec('cct.js', 'home');
		// }

		// while (current > 4) {
		// 	ns.print('Trading for cash');
		// 	ns.hacknet.spendHashes('Sell for Money');

		// 	current = ns.hacknet.numHashes();
		// 	await ns.sleep(0);
		// }

		//let activity = 'Exchange for Corporation Research';
		//let activity= 'Exchange for Bladeburner Rank';
		let activity= 'Exchange for Bladeburner SP';
		while (current > ns.hacknet.hashCost(activity)) {
			ns.print(activity);
			ns.hacknet.spendHashes(activity);

			current = ns.hacknet.numHashes();
			await ns.sleep(0);
		}

		// activity= 'Exchange for Bladeburner SP';
		// while (current > ns.hacknet.hashCost(activity)) {
		// 	ns.print(activity);
		// 	ns.hacknet.spendHashes(activity);

		// 	current = ns.hacknet.numHashes();
		// 	await ns.sleep(0);
		// }

		ns.print('Loop end, sleeping');
		await ns.sleep(150);
	}
}