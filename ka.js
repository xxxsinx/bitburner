export async function main(ns) {
	for (var server of RecursiveScan(ns)) {
		await ns.scriptKill('weaken.js', server);
		await ns.scriptKill('grow.js', server);
		await ns.scriptKill('hack.js', server);
		await ns.scriptKill('weaken-once.js', server);
		await ns.scriptKill('grow.js-once.js', server);
		await ns.scriptKill('hack.js-once.js', server);
		await ns.scriptKill('dothemagic.js', server);
	}

	await ns.print('Killed all proceeses');
}

function RecursiveScan(ns, root, found) {
	if (found == null) found = new Array();
	if (root == null) root = 'home';
	if (found.find(p => p == root) == undefined) {
		found.push(root);
		for (const server of ns.scan(root))
			if (found.find(p => p == server) == undefined)
				RecursiveScan(ns, server, found);
	}
	return found;
}