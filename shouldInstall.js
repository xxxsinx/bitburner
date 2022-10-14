import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
	let shouldInstall = false;
	let sitrep = GetSitRep(ns);

	if (sitrep.suggestedAugs?.length >= 8) {
		shouldInstall = true;
	}

	if (ns.singularity.getOwnedAugmentations().length < ns.singularity.getOwnedAugmentations(true).length && sitrep.suggestedAugs?.length === 0) {
		shouldInstall = true;
	}

	if (!ns.singularity.getOwnedAugmentations().includes('The Red Pill')) {
		//ns.tprint('Red pill check');
		if (ns.singularity.getOwnedAugmentations(true).includes('The Red Pill')) {
			ns.tprint('Red pill is in queue lets go!');
			shouldInstall = true;
		}

		if (sitrep.suggestedAugs != undefined && sitrep.suggestedAugs.some(s => s.name == 'The Red Pill')) {
			ns.tprint('Red pill is available!');
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