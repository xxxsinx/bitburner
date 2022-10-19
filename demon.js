import { GetServerPath } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
	const WD = 'w0r1d_d43m0n';
	const server = ns.getServer(WD);
	if (ns.scan(WD).length == 0) {
		if (!ns.args.includes('silent'))
			ns.tprint('WARN: ' + WD + ' isn\'t connected yet');
		return;
	}
	if (server.hackDifficulty > ns.getHackingLevel()) {
		if (!ns.args.includes('silent'))
			ns.tprint('WARN: Hacking level (' + ns.getHackingLevel() + ') isn\'t high enough to destroy ' + WD);
		return;
	}
	if (!server.hasAdminRights) {
		if (!ns.args.includes('silent'))
			ns.tprint('WARN: We do not have root access to ' + WD);
		return;
	}

	const path = GetServerPath(ns, WD);

	for (const node of path) {
		if (!ns.singularity.connect(node)) {
			ns.tprint('ERROR: Could not connect to ' + node);
		}
		else {
			ns.tprint('INFO: Connected to ' + node);
		}
	}

	ns.tprint('INFO: Installing backdoor on ' + WD);
	try {
		await ns.singularity.installBackdoor();
	}
	catch { }
}