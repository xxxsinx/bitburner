/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	// while (true) {
	//let capacity = ns.hacknet.hashCapacity();
	//ns.print('Current hashes: ' + current + ' of max ' + capacity);

	// Generate coding contracts until we bust
	while (ns.hacknet.numHashes() > ns.hacknet.hashCost('Generate Coding Contract')) {
		ns.tprint('INFO: Generating a codding contract from hashes.');
		ns.hacknet.spendHashes('Generate Coding Contract');
	}

	// If we're done with coding contracts given our current hashCapacity, buy money
	if (ns.hacknet.hashCost('Generate Coding Contract') > ns.hacknet.hashCapacity()) {
		// Spend all our hashes on money
		while (ns.hacknet.numHashes() > ns.hacknet.hashCost('Sell for Money')) {
			ns.tprint('INFO: Spending 4 hashes for 1m');
			ns.hacknet.spendHashes('Sell for Money');
		}
	}

	// while (current > 4) {
	// 	ns.print('Trading for cash');
	// 	ns.hacknet.spendHashes('Sell for Money');

	// 	current = ns.hacknet.numHashes();
	// 	await ns.sleep(0);
	// }

	//let activity = 'Exchange for Corporation Research';
	//let activity= 'Exchange for Bladeburner Rank';
	// let activity= 'Exchange for Bladeburner SP';
	// while (current > ns.hacknet.hashCost(activity)) {
	// 	ns.print(activity);
	// 	ns.hacknet.spendHashes(activity);

	// 	current = ns.hacknet.numHashes();
	// 	await ns.sleep(0);
	// }

	// activity= 'Exchange for Bladeburner SP';
	// while (current > ns.hacknet.hashCost(activity)) {
	// 	ns.print(activity);
	// 	ns.hacknet.spendHashes(activity);

	// 	current = ns.hacknet.numHashes();
	// 	await ns.sleep(0);
	// }

	// 	ns.print('Loop end, sleeping');
	// 	await ns.sleep(150);
	// }
}