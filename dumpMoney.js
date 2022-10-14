/** @param {NS} ns */
export async function main(ns) {
	while (ns.singularity.upgradeHomeRam())
		ns.tprint('INFO: Upgraded home ram.');
	while (ns.singularity.upgradeHomeCores())
		ns.tprint('INFO: Upgraded home cores.');
}