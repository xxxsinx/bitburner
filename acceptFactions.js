import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
	const sitrep = GetSitRep(ns);
	let invites = ns.singularity.checkFactionInvitations();
	if (sitrep.targetFactions == undefined) return;
	for (const faction of sitrep.targetFactions) {
		if (invites.includes(faction)) {
			ns.tprint('INFO: Joining faction ' + faction);
			ns.singularity.joinFaction(faction);
		}
	}
}