import { ServerReport, WaitPids } from "utils.js";
import { RunScript, MemoryMap } from 'ram.js';
import { solveGrow } from 'metrics.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	const [target] = ns.args;

	if (target == undefined) {
		ns.print('ERROR: No target server specified');
		return;
	}

	if (IsPrepped(ns, target)) {
		//ns.tprint('INFO: Server is already prepped (' + target + ')');
	}
	else {
		//ns.tprint('INFO: Prep initiated on ' + target);
		await Prep(ns, target);
		//ns.tprint('SUCCESS: Prep completed on ' + target);
	}
}

export function IsPrepped(ns, server) {
	var so = ns.getServer(server);
	if (so.moneyAvailable < so.moneyMax) return false;
	if (so.hackDifficulty > so.minDifficulty) return false;
	return true;
}

export async function Grow(ns, server, allowSpread = false, allowPartial = true, extra = 1.1) {
	const script = 'grow-once.js';
	const so = ns.getServer(server);
	let threads = Math.ceil(ns.growthAnalyze(server, so.moneyMax / Math.max(so.moneyAvailable, 1), 1) * extra);
	const estTime = ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 3.2;
	ns.print('INFO: Funds are not maxed, starting ' + threads + ' threads to grow them');
	const pids = await RunScript(ns, script, threads, [server, 0, estTime, 0, 0], allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

export async function Weaken(ns, server, allowSpread = true, allowPartial = true, extra = 1.0) {
	const script = 'weaken-once.js';
	const so = ns.getServer(server);
	const threads = Math.ceil((so.hackDifficulty - so.minDifficulty) / 0.05 /*ns.weakenAnalyze(1, 1)*/ * extra);
	const estTime = ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 4;
	ns.print('INFO: Security is over minimum, starting ' + threads + ' threads to floor it');
	const pids = await RunScript(ns, script, threads, [server, 0, estTime, 0, 0], allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

export async function Hack(ns, server, pct, allowSpread = false, allowPartial = true, extra = 1.1) {
	const script = 'hack-once.js';
	const so = ns.getServer(server);
	const threads = Math.floor(ns.hackAnalyzeThreads(server, so.moneyAvailable) * pct * extra);
	const estTime = ns.formulas.hacking.hackTime(so, ns.getPlayer());
	ns.print('INFO: Server is ripe for hacking, starting ' + threads + ' threads to hack it');
	const pids = await RunScript(ns, script, threads, [server, 0, estTime, 0, 0], allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

async function BatchPrep(ns, server) {
	const so = ns.getServer(server);

	let security = so.hackDifficulty - so.minDifficulty;

	let gthreads = solveGrow(ns.formulas.hacking.growPercent(so, 1, ns.getPlayer(), 1), so.moneyAvailable, so.moneyMax);
	const gtime = ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 3.2;

	//security += gthreads * 0.004;

	let w1threads = Math.ceil(security / 0.05);
	const wtime = ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 4;

	let w2threads = Math.ceil((gthreads * 0.004) / 0.05);

	//const ram= new MemoryMap(ns);
	// let maxThreads = Math.floor((ram.available - ram.reserved) / 1.75);
	// //ns.tprint('WARN: Max threads = ' + maxThreads);
	// if (wthreads > maxThreads) {
	// 	wthreads = Math.floor(maxThreads / 2);
	// }
	// // if (gthreads > maxThreads) {
	// // 	gthreads = Math.floor(maxThreads / 2);
	// // }

	const allPids = [];

	if (w1threads > 0) {
		ns.print('INFO: Security is over minimum, starting ' + w1threads + ' threads to floor it');
		const pids = await RunScript(ns, 'weaken-once.js', w1threads, [server, 0, wtime, performance.now(), 0], true, true);
		allPids.push(...pids);
	}

	if (gthreads > 0) {
		//await ns.sleep(30);
		ns.print('INFO: Funds are not maxed, starting ' + gthreads + ' threads to grow them');
		const pids = await RunScript(ns, 'grow-once.js', gthreads, [server, 0, gtime, performance.now(), 0], true, true);
		allPids.push(...pids);
	}

	if (w2threads > 0) {
		//await ns.sleep(30);
		ns.print('INFO: We launched grow threads, starting ' + w2threads + ' weaken threads to cancel them it');
		const pids = await RunScript(ns, 'weaken-once.js', w2threads, [server, 0, wtime, performance.now(), 0], true, true);
		allPids.push(...pids);
	}

	await WaitPids(ns, allPids);
}

export async function Prep(ns, server, metrics) {
	while (!IsPrepped(ns, server)) {
		let so = ns.getServer(server);
		ServerReport(ns, server, metrics);

		await BatchPrep(ns, server);

		// if (so.hackDifficulty > so.minDifficulty)
		// 	await Weaken(ns, server, true, true);
		// else if (so.moneyAvailable < so.moneyMax)
		// 	await Grow(ns, server, false, true);

		await ns.sleep(200);
	}
}