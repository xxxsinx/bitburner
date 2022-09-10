/** @param {NS} ns */
export async function main(ns) {
	let servers= GetAllServers(ns);
	servers= servers.filter(s=> ns.getServerRequiredHackingLevel(s) <= ns.getPlayer().skills.hacking / 2 && ns.hasRootAccess(s) && ns.getServerMaxMoney(s) > 0);
	servers.sort((a,b) => ns.getServerMaxMoney(a) / ns.getServerMinSecurityLevel(a) - ns.getServerMaxMoney(b) / ns.getServerMinSecurityLevel(b));
	let bestServer= servers.pop();
	ns.tprint('Best server is ' + bestServer);
}

// Recursive network scan, compressed
export function GetAllServers(ns, root = 'home', found = []) {
	found.push(root);
	for (const server of root == 'home' ? ns.scan(root) : ns.scan(root).slice(1)) GetAllServers(ns, server, found);
	return found;
}