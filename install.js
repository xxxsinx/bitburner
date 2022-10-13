/** @param {NS} ns */
export async function main(ns) {
	if (ns.singularity.getOwnedAugmentations().length != ns.singularity.getOwnedAugmentations(true).length)
		ns.singularity.installAugmentations('autostart.js');
	else
		ns.singularity.softReset('autostart.js');
}