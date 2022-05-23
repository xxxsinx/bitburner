import { ServerReport, Weaken, Grow, Hack } from "prep.js";

// ns.args[0] = target server name
// ns.args[1] = hack percent factor (0.1 to 1)
// ns.args[2] = debug true/false
export async function main(ns) {
	ns.disableLog('ALL');

	if (ns.args[0] == null) {
		ns.print('ERROR: No server specified');
		ns.exit();
	}

	var server = ns.args[0];

	await ManageServer(ns, server, ns.args[1], ns.args[2]);
}

async function ManageServer(ns, server, pct, debug) {
	if (pct == undefined || pct >= 1)
		pct = 0.9;

	for (; ;) {
		await ServerReport(ns, server);

		const so = ns.getServer(server);

		if (so.hackDifficulty > so.minDifficulty + 1)
			await Weaken(ns, server, true, true);
		else if (so.moneyAvailable < so.moneyMax * 0.85)
			await Grow(ns, server, true, true);
		else
			await Hack(ns, server, pct, true, true);

		await ns.sleep(200);
	}
}