/** @param {NS} ns */
export async function main(ns) {
	if (!ns.singularity.getOwnedAugmentations(true).includes("Stanek's Gift - Genesis"))
		ns.stanek.acceptGift();
}