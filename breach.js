export async function main(ns) {
	ns.disableLog('ALL');

	const servers = GetAllServers(ns);

	let nbRootAccessBefore = 0;
	let nbRootAccessAfter = 0;

	for (const server of servers) {
		let hasRoot = false;
		if (ns.hasRootAccess(server)) {
			nbRootAccessBefore++;
			hasRoot = true;
		}
		await Breach(ns, server);
		if (ns.hasRootAccess(server)) {
			nbRootAccessAfter++;
			if (hasRoot == false)
				ns.tprint('New server hacked: ' + server);
		}
	}

	if (nbRootAccessAfter > nbRootAccessBefore)
		ns.tprint('SUCCESS: Successfully breached new servers (before: ' + nbRootAccessBefore + ' after: ' + nbRootAccessAfter + '');
}

async function Breach(ns, server) {
	if (server == 'home') return true;
	let ports = 0;
	try { ns.brutessh(server); ports++; } catch { }
	try { ns.ftpcrack(server); ports++; } catch { }
	try { ns.relaysmtp(server); ports++; } catch { }
	try { ns.httpworm(server); ports++; } catch { }
	try { ns.sqlinject(server); ports++; } catch { }
	if (ports < ns.getServerNumPortsRequired(server)) return false;
	if (ns.hasRootAccess(server) == false) ns.nuke(server);
	//ns.tprint('server: ' + server);
	//debugger;
	await ns.scp(['weaken-once.js', 'grow-once.js', 'hack-once.js'], server, 'home');
	return ns.hasRootAccess(server);
}

export function GetAllServers(ns, root = 'home', found = new Set()) {
	found.add(root);
	for (const server of ns.scan(root))
		if (!found.has(server))
			GetAllServers(ns, server, found);
	return [...found];
}