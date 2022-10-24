import { LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	if (!ns.singularity.getOwnedAugmentations(true).includes("Stanek's Gift - Genesis")) {
		LogMessage(ns, 'INFO: Accepting Stanek\'s gift!');
		ns.stanek.acceptGift();
	}
}