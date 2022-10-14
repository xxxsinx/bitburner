import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
	const sitrep = GetSitRep(ns);
	if (sitrep.targetFactions == undefined || sitrep.targetFactions.length == 0) return;

	for (const faction of sitrep.targetFactions) {
		if (!ns.getPlayer().factions.includes(faction)) continue;
		if (ns.singularity.getFactionFavor(faction) < 150) continue;

		ns.tprint('INFO: Maybe we should donate to ' + faction + '?');
		return;
	}
}