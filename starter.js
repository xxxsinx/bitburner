import { Weaken, Grow, Hack } from "prep.js";
import { AnalyzeAllServersSequential } from "metrics.js";

// ns.args[0] = target server name
// ns.args[1] = hack percent factor (0.1 to 1)
// ns.args[2] = debug true/false
export async function main(ns) {
	ns.disableLog('ALL');

	while (true) {
		const servers = AnalyzeAllServersSequential(ns, 1, false);
		if (servers.length == 0) {
			ns.tprint('FAIL: No hackable servers found, aborting!');
			return;
		}
		await ManageServer(ns, servers[0]);
		await ns.sleep(0);
	}
}

async function ManageServer(ns, metrics) {
	const initialHackLevel = ns.getPlayer().skills.hacking;

	while (true) {
		metrics.Report(ns, ns.print);
		const so = ns.getServer(metrics.server);
		if (so.hackDifficulty > so.minDifficulty * 1.5)
			await Weaken(ns, metrics.server, true, true);
		else if (so.moneyAvailable < so.moneyMax * 0.9)
			await Grow(ns, metrics.server, true, true);
		else
			await Hack(ns, metrics.server, metrics.pct, true, true);

		if (ns.getPlayer().skills.hacking - initialHackLevel > 20)
			return;

		await ns.sleep(0);
	}
}