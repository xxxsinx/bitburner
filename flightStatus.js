import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
	const status = {
		augs: ns.singularity.getOwnedAugmentations(false).length,
		augsNeeded: ns.getBitNodeMultipliers().DaedalusAugsRequirement,
		money: ns.getServerMoneyAvailable('home'),
		level: ns.getHackingLevel()
	}

	const sitrep = GetSitRep(ns);
	sitrep.flightStatus = status;
	ns.write('sitrep.txt', JSON.stringify(sitrep), 'w');
}