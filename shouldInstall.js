import { GetSitRep } from 'sitrep.js'
import { LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	let shouldInstall = false;
	let sitrep = GetSitRep(ns);

	let firstCycle = ns.singularity.getOwnedAugmentations().length < 3;
	let nonNFGaugs = sitrep?.suggestedAugs?.filter(a => !a.name.startsWith('NeuroFlux')) ?? [];
	let suggestedAugs = sitrep?.suggestedAugs ?? [];

	let time = ns.getPlayer().playtimeSinceLastAug;
	let hours = Math.floor(time / 1000 / 60 / 60);
	//ns.tprint('hours: ' + hours);
	//ns.tprint('suggestedAugs.length: ' + suggestedAugs.length);

	if ((firstCycle && nonNFGaugs.length >= Math.max(8 - hours, 4)) || (!firstCycle && suggestedAugs.length >= 15 - hours)) {
		LogMessage(ns, 'INFO: Install trigger activated! Augmentation count is looking sexy. firstCycle=' + firstCycle + ' suggestedAugs.length=' + suggestedAugs.length + ' nonNFGaugs.length=' + nonNFGaugs.length);
		ns.tprint('INFO: Install trigger activated! Augmentation count is looking sexy. firstCycle=' + firstCycle + ' suggestedAugs.length=' + suggestedAugs.length + ' nonNFGaugs.length=' + nonNFGaugs.length);
		shouldInstall = true;
	}

	let count = ns.singularity.getOwnedAugmentations(true).length - ns.singularity.getOwnedAugmentations().length;
	if (count > 0 && sitrep.suggestedAugs?.length === 0) {
		LogMessage(ns, 'INFO: Install trigger activated! We have ' + count + 'queued augs and nothing more we can buy.');
		ns.tprint('INFO: Install trigger activated! We have ' + count + 'queued augs and nothing more we can buy.');
		shouldInstall = true;
	}

	if (!ns.singularity.getOwnedAugmentations().includes('The Red Pill')) {
		//ns.tprint('Red pill check');
		if (ns.singularity.getOwnedAugmentations(true).includes('The Red Pill')) {
			ns.tprint('Red pill is in queue lets go!');
			LogMessage(ns, 'INFO: Install trigger activated! We have The Red Pill queued.');
			ns.tprint('INFO: Install trigger activated! We have The Red Pill queued.');
			shouldInstall = true;
		}

		if (sitrep.suggestedAugs != undefined && sitrep.suggestedAugs.some(s => s.name == 'The Red Pill')) {
			LogMessage(ns, 'INFO: Install trigger activated! We have the reputation for The Red Pill.');
			ns.tprint('INFO: Install trigger activated! We have the reputation for The Red Pill.');
			shouldInstall = true;
		}

		// for (let aug of sitrep.suggestedAugs) {
		// 	if (aug.name == 'The Red Pill')
		// 		ns.tprint('Red pill is available!?!');
		// 	//ns.tprint(aug);
		// }
	}

	sitrep = GetSitRep(ns);
	sitrep.shouldInstall = shouldInstall;
	ns.write('sitrep.txt', JSON.stringify(sitrep), 'w');
}