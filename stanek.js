import { WaitPids, RunScript } from 'prep.js';
import { MemoryMap } from 'ram.js';

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let fragments = ns.stanek.activeFragments().filter(p => p.limit < 5);
	const [ramPct= 1] = ns.args;
	ns.tprint('INFO: Running share... pct:' + ramPct);

	for (; ;) {
		for (let fragment of fragments) {
			ns.print('Charging: ' + fragment.id);
			let ram = new MemoryMap(ns);

			let cost= ns.getScriptRam('charge.js');

			let pids = await RunScript(ns, 'charge.js', fragment.x, Math.floor(ram.total * ramPct / cost), fragment.y, 0, 0, performance.now(), true, true);
			await WaitPids(ns, pids);
			ns.print('Done charging: ' + fragment.id);
		}
		await ns.sleep(0);
	}
}