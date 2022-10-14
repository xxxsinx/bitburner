import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
	const sitrep = GetSitRep(ns);
	if (sitrep.targetFactions == undefined || sitrep.targetFactions.length == 0) {
		if (!ns.args.includes('silent'))
			ns.tprint('FAIL: sitrep.targetFactions problem?');
		return;
	}
	if (!sitrep.targetFactions.includes('Tian Di Hui')) {
		if (!ns.args.includes('silent'))
			ns.tprint('WARN: Tian Di Hui is not part of our targets.');
		return;
	}
	if (ns.getPlayer().factions.includes('Tian Di Hui')) {
		if (!ns.args.includes('silent'))
			ns.tprint('WARN: Already part of Tian Di Hui');
		return;
	}
	if (!ns.singularity.checkFactionInvitations().includes('Tian Di Hui')) {
		if (ns.getPlayer().city != 'Chongqing') {
			if (ns.getPlayer().money < 200_000) {
				if (!ns.args.includes('silent'))
					ns.tprint('WARN: Not enough money to travel to Chongqing');
				return;
			}
			if (!ns.args.includes('silent'))
				ns.tprint('WARN: Moved to Chongqing to get an invitation from Tian Di Hui');
			ns.singularity.travelToCity('Chongqing');
		}
		return;
	}
	if (!ns.args.includes('silent'))
		ns.tprint('WARN: Joining faction Tian Di Hui');
	ns.singularity.joinFaction('Tian Di Hui');
}