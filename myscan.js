/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	var servers = RecursiveScan(ns);
	var target = ns.args[0];

	for (const server of servers) {
		if (target != null) {
			if (server.name.search(target) != -1)
				ns.tprint(server.route);
		}
		else
			ns.tprint(server.route);
	}

	ns.tprint('Total servers explored: ' + servers.length);
}

function RecursiveScan(ns, root, found, route) {
	if (route == null) route = '';
	else route = route + ';connect ' + root;
	if (found == null) found = new Array();
	if (root == null) {
		root = 'home';
		route = 'connect home';
	}
	if (found.find(p => p == root) == undefined) {
		var entry = {};
		entry.name = root;
		entry.route = route;
		found.push(entry);
		for (const server of ns.scan(root))
			if (found.find(p => p.name == server) == undefined)
				RecursiveScan(ns, server, found, route);
	}
	return found;
}