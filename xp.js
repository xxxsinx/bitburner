import { Prep, IsPrepped } from "prep.js";
import { RunScript, MemoryMap } from "ram.js";
import { WaitPids, ServerReport } from "utils.js";

// ns.args[0] = ram percent to allow (0.001 to 1)
export async function main(ns) {
	ns.disableLog('ALL');

	let [ramPct] = ns.args;
	if (ramPct == undefined) ramPct = 0.9;

	let server = 'joesguns';

	const scriptSize = ns.getScriptRam('grow-once.js');

	if (!IsPrepped(ns, server)) {
		await Prep(ns, server);
	}

	for (; ;) {
		const ram = new MemoryMap(ns);
		const threads = Math.floor(ram.total * ramPct / scriptSize);
		ServerReport(ns, server);
		await GrowJoesgunsForXP(ns, server, threads);
		await ns.sleep(100);
	}
}

async function GrowJoesgunsForXP(ns, server, threads) {
	const script = 'grow-once.js';
	const so = ns.getServer(server);
	const estTime = await ns.getGrowTime(server);
	ns.print('INFO: Growing ' + server + ' for XP, starting ' + threads + ' threads');
	const pids = await RunScript(ns, script, threads, [server, 0, 0, 0, 0], true, true);
	await WaitPids(ns, pids);
	return [threads, estTime];
}