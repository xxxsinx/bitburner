import { PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

/** @param {NS} ns */
export async function main(ns) {
	// getAugmentationGraftPrice(augName)
	// getAugmentationGraftTime(augName)
	// getGraftableAugmentations()
	// graftAugmentation(augName, focus)

	const owned = ns.singularity.getOwnedAugmentations(true);
	let graftable = ns.grafting.getGraftableAugmentations()
		.filter(s => !owned.includes(s))
		.map((s) => {
			return {
				name: s,
				cost: ns.grafting.getAugmentationGraftPrice(s),
				time: ns.grafting.getAugmentationGraftTime(s)
			}
		});

	graftable = graftable./*filter(s => s.cost < 1_000_000_000).*/sort((a, b) => a.time - b.time);

	//graftable.forEach(s => s.ratio = s.time * s.cost);
	//graftable.sort((a, b) => a.ratio - b.ratio);

	for (const graft of graftable)
		ns.tprint(graft.name.padEnd(60) + ns.tFormat(graft.time).padEnd(35) + ns.nFormat(graft.cost, '0.000a'));

}