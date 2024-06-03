import { LogMessage, GetServerPath, GetAllServers } from 'utils.js';

/** @param {NS} ns */
export async function main(ns) {
	try {
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
				if (!ns.args.includes('silent'))
					ns.tprint('INFO: Connected to ' + node);
			}
		}

		try {
			await ns.singularity.installBackdoor();

			if (ns.getServer(WD).backdoorInstalled) {
				ns.tprint('INFO: Installed backdoor on ' + WD);
				LogMessage(ns, 'INFO: Installed backdoor on ' + WD);
				for (let server of GetAllServers(ns)) {
					ns.killall(server, true);
				}
			}
		}
		catch { }

		ns.singularity.connect('home');
	}
	catch {}
}