import { LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	BuyPrograms(ns);
}

export function BuyPrograms(ns) {
	// Buy TOR
	if (!ns.getPlayer().tor) {
		ns.print('WARN: TOR router not found.');
		if (ns.getPlayer().money < 200000) {
			ns.print('WARN: Not enough money to purchase TOR router, postponing purchase.');
		}
		else {
			if (ns.singularity.purchaseTor()) {
				ns.tprint('INFO: Succesfully bought TOR router.');
				LogMessage(ns, 'INFO: Succesfully bought TOR router.');
			}
			else {
				ns.print('ERROR: Something went wrong buying the TOR router.');
				return;
			}
		}
	}

	const PROGRAMS = [
		'BruteSSH.exe',
		'FTPCrack.exe',
		'relaySMTP.exe',
		'SQLInject.exe',
		'HTTPWorm.exe'
	];

	for (const program of PROGRAMS) {
		// Buy BruteSSH.exe
		if (!ns.fileExists(program)) {
			ns.print('INFO: Checking if we can buy ' + program + '.');
			if (ns.singularity.purchaseProgram(program)) {
				ns.tprint('SUCCESS: Purchased ' + program);
				LogMessage(ns, 'SUCCESS: Purchased ' + program);
			}
			else {
				if (ns.singularity.getCurrentWork() == null) {
					ns.singularity.createProgram(program, false);
					return;
				}
			}
		}
	}
}