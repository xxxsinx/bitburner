import { LogMessage } from 'utils.js'

export async function main(ns) {
	ns.disableLog('ALL');

	const [silent = false] = ns.args;

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
	if (newlyRooted > 0) {
		ns.tprint('SUCCESS: Successfully breached ' + newlyRooted + ' new servers (before: ' + rooted + ' after: ' + (rooted + newlyRooted) + ')');
		LogMessage(ns, 'SUCCESS: Successfully breached ' + newlyRooted + ' new servers (before: ' + rooted + ' after: ' + (rooted + newlyRooted) + ')');
	}
	else if (!silent)
		ns.tprint('FAIL: No new servers rooted.');
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