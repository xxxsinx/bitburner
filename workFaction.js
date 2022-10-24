import { GetSitRep } from 'sitrep.js'
import { LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	const sitrep = GetSitRep(ns);

	if (sitrep.targetFactions == undefined) return;
	if (sitrep.nfgFactions == undefined) return;
	if (sitrep.targetFactions.length == 0 && sitrep.nfgFactions.length == 0) return;

	//ns.tprint('INFO: sitrep.targetFactions: ' + sitrep.targetFactions);

	for (const faction of sitrep.targetFactions) {
		if (faction == 'Slum Snakes') continue;
		if (ns.getPlayer().factions.includes(faction)) {
			//ns.tprint('INFO: Initiating Hacking Contracts work for ' + faction)
			ns.singularity.workForFaction(faction, 'Hacking Contracts', false);
			//LogMessage(ns, 'INFO: Initiating Hacking Contracts work for ' + faction);
			return;
		}
	}

	for (const faction of sitrep.nfgFactions) {
		if (faction == 'Slum Snakes') continue;
		if (faction == 'Church of the Machine God') continue;
		if (ns.getPlayer().factions.includes(faction)) {
			//ns.tprint('INFO: Initiating Hacking Contracts work for ' + faction)
			ns.singularity.workForFaction(faction, 'Hacking Contracts', false);
			//LogMessage(ns, 'INFO: Initiating Hacking Contracts work for ' + faction + ' (for NFG purposes)');
			return;
		}
	}
}