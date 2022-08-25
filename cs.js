/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	const [target] = ns.args;

	const servers = GetAllServers(ns);

	if (target == undefined) {
		for (const server of servers) {
			let output= ''.padEnd((server.route.length-1));
			ns.tprint(output + server.name);
		}
		return;
	}

	const server = servers.find(p => p.name.toLowerCase().startsWith(target.toLowerCase()));
	if (server == undefined) {
		ns.tprint('No match found for : ' + target);
		return;
	}

	ns.tprint(target + ' => ' + server.route);

	ns.tprint('Traversing the server chain to target: ' + target);
	for (const node of server.route) {
		if (!ns.singularity.connect(node)) {
			ns.tprint('ERROR: Could not connect to ' + node);
		}
		else {
			ns.tprint('INFO: Connected to ' + node);
		}
	}
	ns.tprint('SUCCESS: Done.');
}

export function GetAllServers(ns, root = 'home', found = new Array(), route = new Array()) {
	if (!found.find(p => p.name == root)) {
		let entry = { name: root, route: route };
		entry.route.push(root);
		found.push(entry);
	}

	for (const server of ns.scan(root)) {
		if (!found.find(p => p.name == server)) {
			let newRoute = route.map(p => p);
			GetAllServers(ns, server, found, newRoute);
		}
	}

	return [...found];
}