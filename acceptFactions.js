import { GetSitRep } from 'sitrep.js'
import { LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	const sitrep = GetSitRep(ns);
	let invites = ns.singularity.checkFactionInvitations();
	if (sitrep.targetFactions == undefined) return;
	for (const faction of sitrep.targetFactions) {
		if (invites.includes(faction)) {
			ns.tprint('INFO: Joining faction ' + faction);
			ns.singularity.joinFaction(faction);
			LogMessage(ns, 'INFO: Joining faction ' + faction);
		}
	}

	// Make sure we join our best NFG faction for default work
	for (const faction of sitrep.nfgFactions) {
		if (ns.getPlayer().factions.includes(faction)) continue;
		if (!invites.includes(faction)) continue;
		ns.tprint('INFO: Joining faction ' + faction + ' for NFG access/grind');
		ns.singularity.joinFaction(faction);
		LogMessage(ns, 'INFO: Joining faction ' + faction + ' for NFG access/grind');
	}
}