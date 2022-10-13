import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
	const sitrep = GetSitRep(ns);
	if (sitrep.targetFactions == undefined || sitrep.targetFactions.length == 0) return;

	for (const faction of sitrep.targetFactions) {
		if (ns.getPlayer().factions.includes(faction)) {
			//ns.tprint('INFO: Initiating Hacking Contracts work for ' + faction)
			ns.singularity.workForFaction(faction, 'Hacking Contracts', false);
			return;
		}
	}
}