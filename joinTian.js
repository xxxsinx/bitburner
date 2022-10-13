import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
	const sitrep = GetSitRep(ns);
	if (sitrep.targetFactions == undefined || sitrep.targetFactions.length == 0) {
		//ns.tprint('FAIL: sitrep.targetFactions problem?');
		return;
	}
	const faction = sitrep.targetFactions[0];
	if (faction != 'Tian Di Hui') {
		//ns.tprint('FAIL: First faction is not Tian Di Hui');
		return;
	}
	if (ns.getPlayer().factions.includes('Tian Di Hui')) {
		//ns.tprint('FAIL: Already part of Tian Di Hui');
		return;
	}
	if (!ns.singularity.checkFactionInvitations().includes('Tian Di Hui')) {
		if (ns.getPlayer().city != 'Chongqing') {
			if (ns.getPlayer().money < 200_000) {
				//ns.tprint('FAIL: Not enough money to travel to Chongqing');
				return;
			}
			ns.singularity.travelToCity('Chongqing');
		}
		//ns.tprint('FAIL: No invitation from Tian Di Hui');
		return;
	}
	//ns.tprint('WARN: Joining faction Tian Di Hui');
	ns.singularity.joinFaction('Tian Di Hui');
}