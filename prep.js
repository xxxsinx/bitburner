import { ServerReport, WaitPids } from "utils.js";
import { RunScript } from 'ram.js';

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
	const estTime = ns.getGrowTime(server);
	ns.print('INFO: Funds are not maxed, starting ' + threads + ' threads to grow them');
	const pids = await RunScript(ns, script, server, threads, 0, estTime, 0, 0, allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

export async function Weaken(ns, server, allowSpread = true, allowPartial = true, extra = 1.0) {
	const script = 'weaken-once.js';
	const so = ns.getServer(server);
	const threads = Math.ceil((so.hackDifficulty - so.minDifficulty) / ns.weakenAnalyze(1, 1) * extra);
	const estTime = ns.getWeakenTime(server);
	ns.print('INFO: Security is over minimum, starting ' + threads + ' threads to floor it');
	const pids = await RunScript(ns, script, server, threads, 0, estTime, 0, 0, allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

export async function Hack(ns, server, pct, allowSpread = false, allowPartial = true, extra = 1.1) {
	const script = 'hack-once.js';
	const so = ns.getServer(server);
	const threads = Math.floor(ns.hackAnalyzeThreads(server, so.moneyAvailable) * pct * extra);
	const estTime = ns.getHackTime(server);
	ns.print('INFO: Server is ripe for hacking, starting ' + threads + ' threads to hack it');
	const pids = await RunScript(ns, script, server, threads, 0, estTime, 0, 0, allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

export async function Prep(ns, server, metrics) {
	while (!IsPrepped(ns, server)) {
		let so = ns.getServer(server);
		ServerReport(ns, server, metrics);

		if (so.hackDifficulty > so.minDifficulty)
			await Weaken(ns, server, true, true);
		else if (so.moneyAvailable < so.moneyMax)
			await Grow(ns, server, false, true);

		await ns.sleep(200);
	}
}