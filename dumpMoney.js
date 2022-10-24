import { FormatRam, LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	while (ns.singularity.upgradeHomeRam()) {
		ns.tprint('INFO: Upgraded home ram to ' + FormatRam(ns, ns.getServer('home').maxRam));
		LogMessage(ns, 'INFO: Upgraded home ram to ' + FormatRam(ns, ns.getServer('home').maxRam));
	}
	while (ns.singularity.upgradeHomeCores()) {
		ns.tprint('INFO: Upgraded home cores to ' + ns.getServer('home').cpuCores);
		LogMessage(ns, 'INFO: Upgraded home cores to ' + ns.getServer('home').cpuCores);
	}
}