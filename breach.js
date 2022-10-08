export async function main(ns) {
	ns.disableLog('ALL');

	const [silent = false] = ns.args;

	BuyPrograms(ns);

	const servers = GetAllServers(ns);

	let rooted = 0;
	let newlyRooted = 0;

	for (const server of servers) {
		if (ns.hasRootAccess(server)) {
			rooted++;
		}
		else if (await Breach(ns, server) == true) {
			ns.tprint('SUCCESS: Rooted new server: ' + server);
			newlyRooted++;
		}

	}
	if (newlyRooted > 0)
		ns.tprint('SUCCESS: Successfully breached ' + newlyRooted + ' new servers (before: ' + rooted + ' after: ' + (rooted + newlyRooted) + ')');
	else if (!silent)
		ns.tprint('FAIL: No new servers rooted.');
}

function BuyPrograms(ns) {
	// Buy TOR
	if (!ns.getPlayer().tor) {
		ns.print('WARN: TOR router not found.');
		if (ns.getPlayer().money < 200000) {
			ns.print('WARN: Not enough money to purchase TOR router, postponing purchase.');
			return;
		}
		else {
			if (ns.singularity.purchaseTor()) {
				ns.tprint('INFO: Succesfully bought TOR router.');
			}
			else {
				ns.print('ERROR: Something went wrong buying the TOR router.');
				return;
			}
		}
	}

	// Buy BruteSSH.exe
	if (!ns.fileExists('BruteSSH.exe')) {
		ns.print('INFO: Checking if we can buy BruteSSH.exe.');
		if (ns.singularity.purchaseProgram("BruteSSH.exe"))
			ns.tprint('SUCCESS: Purchased BruteSSH.exe');
	}

	// Buy FTPCrack.exe
	if (!ns.fileExists('FTPCrack.exe')) {
		ns.print('INFO: Checking if we can buy FTPCrack.exe.');
		if (ns.singularity.purchaseProgram("FTPCrack.exe"))
			ns.tprint('SUCCESS: Purchased FTPCrack.exe');
	}

	// Buy relaySMTP.exe
	if (!ns.fileExists('relaySMTP.exe')) {
		ns.print('INFO: Checking if we can buy relaySMTP.exe.');
		if (ns.singularity.purchaseProgram("relaySMTP.exe"))
			ns.tprint('SUCCESS: Purchased relaySMTP.exe');
	}

	// Buy SQLInject.exe
	if (!ns.fileExists('SQLInject.exe')) {
		ns.print('INFO: Checking if we can buy SQLInject.exe.');
		if (ns.singularity.purchaseProgram("SQLInject.exe"))
			ns.tprint('SUCCESS: Purchased SQLInject.exe');
	}

	// Buy HTTPWorm.exe 
	if (!ns.fileExists('HTTPWorm.exe')) {
		ns.print('INFO: Checking if we can buy HTTPWorm.exe.');
		if (ns.singularity.purchaseProgram("HTTPWorm.exe"))
			ns.tprint('SUCCESS: Purchased HTTPWorm.exe');
	}
}

async function Breach(ns, server) {
	try { ns.brutessh(server); } catch { }
	try { ns.ftpcrack(server); } catch { }
	try { ns.relaysmtp(server); } catch { }
	try { ns.httpworm(server); } catch { }
	try { ns.sqlinject(server); } catch { }
	try { ns.nuke(server); } catch { }
	return ns.hasRootAccess(server);
}

export function GetAllServers(ns, root = 'home', found = []) {
	found.push(root);
	for (const server of ns.scan(root))
		if (!found.includes(server)) GetAllServers(ns, server, found);
	return found;
}