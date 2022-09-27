/** @param {NS} ns */
export async function main(ns) {
	const [runCount = 0, scriptName = 'v1.js', pct = 0.25] = ns.args;

	let servers = GetAllServers(ns).filter(s => Weight(ns, s) > 0);
	servers.sort((a, b) => Weight(ns, b) - Weight(ns, a));

	let ran = 0;

	ns.tprint('Best servers: ');
	for (let server of servers) {
		ns.tprint(server.padEnd(20) + ': ' + Weight(ns, server));
		if (ran < runCount) {
			let pid = ns.run(scriptName, 1, server, pct);
			if (pid != 0) {
				ns.tprint('INFO: Started ' + scriptName + ' on ' + server);
				ran++;
			}
		}
	}
}

// Returns a weight that can be used to sort servers by hack desirability
function Weight(ns, server) {
	if (!server) return 0;

	// Don't ask, endgame stuff
	if (server.startsWith('hacknet-node')) return 0;

	// Get the player information
	let player = ns.getPlayer();

	// Get the server information
	let so = ns.getServer(server);

	// Set security to minimum on the server object (for Formula.exe functions)
	so.hackDifficulty = so.minDifficulty;

	// We cannot hack a server that has more than our hacking skill so these have no value
	if (so.requiredHackingSkill > player.skills.hacking) return 0;

	// Default pre-Formulas.exe weight. minDifficulty directly affects times, so it substitutes for min security times
	let weight = so.moneyMax / so.minDifficulty;

	// If we have formulas, we can refine the weight calculation
	if (ns.fileExists('Formulas.exe')) {
		// We use weakenTime instead of minDifficulty since we got access to it, 
		// and we add hackChance to the mix (pre-formulas.exe hack chance formula is based on current security, which is useless)
		weight = so.moneyMax / ns.formulas.hacking.weakenTime(so, player) * ns.formulas.hacking.hackChance(so, player);
	}
	else
		// If we do not have formulas, we can't properly factor in hackchance, so we lower the hacking level tolerance by half
		if (so.requiredHackingSkill > player.skills.hacking / 2)
			return 0;

	return weight;
}

// Recursive network scan, compressed
export function GetAllServers(ns, root = 'home', found = []) {
	found.push(root);
	for (const server of root == 'home' ? ns.scan(root) : ns.scan(root).slice(1)) GetAllServers(ns, server, found);
	return found;
}