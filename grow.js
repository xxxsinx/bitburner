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
			let plain = Math.ceil(ns.growthAnalyze(server, so.moneyMax / Math.max(so.moneyAvailable, 1), 1));

			// Lambert
			let opts = {
				moneyAvailable: so.moneyAvailable,
				hackDifficulty: so.minDifficulty
			};
			try { opts.ServerGrowthRate = ns.getBitNodeMultipliers().ServerGrowthRate; } catch { }

			let lambert = calculateGrowThreadsLambert(ns, so.hostname, so.moneyMax - so.moneyAvailable, 1, opts);

			ns.tprint(server.padEnd(25) + (ns.nFormat(so.moneyAvailable, '0.0a').padStart(6) + '  =>  ' + ns.nFormat(so.moneyMax, '0.0a').padStart(6)) + sg.toFixed(0).padStart(8) + brute.toFixed(0).padStart(8) + bin.toFixed(0).padStart(8) + lambert.toFixed(0).padStart(8) + plain.toFixed(0).padStart(8));
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

/**
 * @author m0dar <gist.github.com/xmodar>
 * {@link https://discord.com/channels/415207508303544321/415211780999217153/954213342917050398}
 *
 * type GrowOptions = Partial<{
 *   moneyAvailable: number;
 *   hackDifficulty: number;
 *   ServerGrowthRate: number; // ns.getBitNodeMultipliers().ServerGrowthRate
 *   // https://github.com/danielyxie/bitburner/blob/dev/src/BitNode/BitNode.tsx
 * }>;
 */
export function calculateGrowGain(ns, host, threads = 1, cores = 1, opts = {}) {
	const moneyMax = ns.getServerMaxMoney(host);
	const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
	const rate = growPercent(ns, host, threads, cores, opts);
	return Math.min(moneyMax, rate * (moneyAvailable + threads)) - moneyAvailable;
}

/** @param gain money to be added to the server after grow */
export function calculateGrowThreadsLambert(ns, host, gain, cores = 1, opts = {}) {
	const moneyMax = ns.getServerMaxMoney(host);
	const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
	const money = Math.min(Math.max(moneyAvailable + gain, 0), moneyMax);
	const rate = Math.log(growPercent(ns, host, 1, cores, opts));
	const logX = Math.log(money * rate) + moneyAvailable * rate;
	const threads = lambertWLog(logX) / rate - moneyAvailable;
	return Math.max(Math.ceil(threads), 0);
}

function growPercent(ns, host, threads = 1, cores = 1, opts = {}) {
	const { ServerGrowthRate = 1, hackDifficulty = ns.getServerSecurityLevel(host), } = opts;
	const growth = ns.getServerGrowth(host) / 100;
	const multiplier = ns.getPlayer().mults["hacking_grow"];
	const base = Math.min(1 + 0.03 / hackDifficulty, 1.0035);
	const power = growth * ServerGrowthRate * multiplier * ((cores + 15) / 16);
	return base ** (power * threads);
}
/**
 * Lambert W-function for log(x) when k = 0
 * {@link https://gist.github.com/xmodar/baa392fc2bec447d10c2c20bbdcaf687}
 */
function lambertWLog(logX) {
	if (isNaN(logX)) return NaN;
	const logXE = logX + 1;
	const logY = 0.5 * log1Exp(logXE);
	const logZ = Math.log(log1Exp(logY));
	const logN = log1Exp(0.13938040121300527 + logY);
	const logD = log1Exp(-0.7875514895451805 + logZ);
	let w = -1 + 2.036 * (logN - logD);
	w *= (logXE - Math.log(w)) / (1 + w);
	w *= (logXE - Math.log(w)) / (1 + w);
	w *= (logXE - Math.log(w)) / (1 + w);
	return isNaN(w) ? (logXE < 0 ? 0 : Infinity) : w;
}

const log1Exp = (x) => x <= 0 ? Math.log(1 + Math.exp(x)) : x + log1Exp(-x);