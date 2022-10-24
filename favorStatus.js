import { GetSitRep } from 'sitrep.js'
import { LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	let favorInstall = false;
	for (const faction of ['BitRunners', 'Daedalus']) {
		if (!ns.getPlayer().factions.includes(faction)) {
			//ns.tprint('WARN: Player isn\'t part of ' + faction + ' factions: ' + ns.getPlayer().factions);
			continue;
		}

		const current = ns.singularity.getFactionFavor(faction);
		const gain = ns.singularity.getFactionFavorGain(faction);

		//ns.tprint('INFO: ' + faction + ' favor is ' + current + ' gain is ' + gain + ' total after install would be ' + (current + gain));

		if (current < 75 && current + gain >= 75) {
			LogMessage(ns, 'INFO: Ready to trigger an install for favor on ' + faction + ' current: ' + current + ' after install: ' + (current + gain));
			ns.tprint('INFO: Ready to trigger an install for favor on ' + faction + ' current: ' + current + ' after install: ' + (current + gain));
			favorInstall = true;
		}
		if (current < 150 && current + gain >= 150) {
			LogMessage(ns, 'INFO: Ready to trigger an install for favor on ' + faction + ' current: ' + current + ' after install: ' + (current + gain));
			ns.tprint('INFO: Ready to trigger an install for favor on ' + faction + ' current: ' + current + ' after install: ' + (current + gain));
			favorInstall = true;
		}
	}

	const sitrep = GetSitRep(ns);
	sitrep.favorInstall = favorInstall;
	ns.write('sitrep.txt', JSON.stringify(sitrep), 'w');
}