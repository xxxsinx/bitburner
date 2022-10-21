/** @param {NS} ns */
export async function main(ns) {
	let player = ns.getPlayer();

	for (let pct = 0.25; pct <= 1; pct += 0.25) {
		ns.tprint('----- ' + (pct * 100).toFixed(0) + '% hack values -----');

		for (let server of GetAllServers(ns)) {
			let so = ns.getServer(server);
			if (so.moneyMax == 0) continue;

			so.hackDifficulty = so.minDifficulty;
			so.moneyAvailable = so.moneyMax - Math.ceil(so.moneyMax * pct);

			let sg = solveGrow(ns.formulas.hacking.growPercent(so, 1, player, 1), so.moneyAvailable, so.moneyMax);
			let brute = calculateGrowThreads(ns, so, player, 1);
			let bin = calculateGrowThreads2(ns, so, player, 1);
			let formula = Math.ceil(ns.growthAnalyze(server, so.moneyMax / Math.max(so.moneyAvailable, 1), 1));

			ns.tprint(server.padEnd(25) + (ns.nFormat(so.moneyAvailable,'0.0a').padStart(6) + '  =>  ' + ns.nFormat(so.moneyMax, '0.0a').padStart(6)) + sg.toFixed(0).padStart(8) + brute.toFixed(0).padStart(8) + bin.toFixed(0).padStart(8) + formula.toFixed(0).padStart(8));
		}
	}
}

// Iterative network scan
export function GetAllServers(ns) {
	let servers = ['home'];
	for (const server of servers) {
		const found = ns.scan(server);
		if (server != 'home') found.splice(0, 1);
		servers.push(...found);
	}
	return servers;
}

// Solve for number of growth threads required to get from money_lo to money_hi
// base is ns.formulas.hacking.growPercent(serverObject, 1, playerObject, cores)
function solveGrow(base, money_lo, money_hi) {
	if (money_lo >= money_hi) { return 0; }

	let threads = 1000;
	let prev = threads;
	for (let i = 0; i < 30; ++i) {
		let factor = money_hi / Math.min(money_lo + threads, money_hi - 1);
		threads = Math.log(factor) / Math.log(base);
		if (Math.ceil(threads) == Math.ceil(prev)) { break; }
		prev = threads;
	}

	return Math.ceil(Math.max(threads, prev, 0));
}

// Plain brute force method
export function calculateGrowThreads(ns, serverObject, playerObject, cores) {
	let threads = 1;
	let newMoney = 0;

	while (true) {
		let serverGrowth = ns.formulas.hacking.growPercent(serverObject, threads, playerObject, cores);
		newMoney = (serverObject.moneyAvailable + threads) * serverGrowth;
		if (newMoney >= serverObject.moneyMax)
			break;
		threads++;
	}

	return threads;
}

export function calculateGrowThreads2(ns, serverObject, playerObject, cores) {
	if (serverObject.moneyAvailable >= serverObject.moneyMax) return 0;
	let min = 1;

	// Use the flawed API to find a maximum value
	const growFactor = 1 / (1 - ((serverObject.moneyMax - 1) / serverObject.moneyMax));
	let max = Math.ceil(Math.log(growFactor) / Math.log(ns.formulas.hacking.growPercent(serverObject, 1, playerObject, cores)));

	let threads = binarySearchGrow(ns, min, max, serverObject, playerObject, cores);

	let newMoney = CalcGrowth(ns, serverObject, playerObject, threads, cores);
	let diff = (newMoney - serverObject.moneyMax);
	if (diff < 0)
		ns.tprint('FAIL: undershot by ' + diff);

	return threads;
}

function binarySearchGrow(ns, min, max, so, po, cores) {
	//ns.tprint('min: ' + min + ' max: ' + max);
	if (min == max) return max;
	let threads = Math.ceil(min + (max - min) / 2);

	let newMoney = CalcGrowth(ns, so, po, threads, cores);
	if (newMoney > so.moneyMax) {
		if (CalcGrowth(ns, so, po, threads - 1, cores) < so.moneyMax)
			return threads;
		return binarySearchGrow(ns, min, threads - 1, so, po, cores);
	}
	else if (newMoney < so.moneyMax) {
		return binarySearchGrow(ns, threads + 1, max, so, po, cores);
	}
	else { //(newMoney == so.moneyMax)
		return threads;
	}
}

function CalcGrowth(ns, so, po, threads, cores) {
	let serverGrowth = ns.formulas.hacking.growPercent(so, threads, po, cores);
	return (so.moneyAvailable + threads) * serverGrowth;
}