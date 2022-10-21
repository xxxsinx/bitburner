import { WaitPids, GetAllServers } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	// await WaitPids(ns, ns.run('bank.js'));
	// await WaitPids(ns, ns.run('factions.js', 1, 'plan'));

	// ns.tprint('FAIL: Aborting install for benching purposes!');
	// return;

	for (var server of GetAllServers(ns)) {
		ns.killall(server, true);
	}
	await ns.sleep(0);

	if (ns.singularity.getOwnedAugmentations().length != ns.singularity.getOwnedAugmentations(true).length) {
		ns.singularity.installAugmentations('autostart.js');
	}
	else
		ns.singularity.softReset('autostart.js');
}