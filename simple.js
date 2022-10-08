import { GetAllServers } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
	const [target] = ns.args;
	if (target == undefined) {
		ns.tprint('FAIL: You must provide a server name to target.');
		return;
	}

	if (target == 'all') {
		for (const server of await GetAllServers(ns)) {
			if (ns.getServerMaxMoney(server) <= 0) continue;
			if (!ns.hasRootAccess(server)) continue;
			if (server == 'home') continue;
			if (ns.getRunningScript('simple.js', 'home', server) == undefined) {
				ns.tprint('INFO: Starting simple.js against ' + server);
				ns.exec('simple.js', 'home', 1, server);
			}
			else {
				ns.tprint('WARN: simple.js already running on ' + server);
			}
			await ns.sleep(50);
		}
		return;
	}

	while (true) {
		await ns.hack(target);
		await ns.grow(target, { stock: true });
		await ns.weaken(target);
	}
}