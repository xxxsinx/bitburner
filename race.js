/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');

	let start = performance.now();

	let pids = RunScript(ns, 'hack.script', 'foodnstuff', Infinity)
	await WaitPids(ns, pids);

	pids = RunScript(ns, 'hack.script', 'sigma-cosmetics', Infinity)
	await WaitPids(ns, pids);

	while (ns.getPlayer().skills.hacking < 200 && ns.getServerSecurityLevel('joesguns') != ns.getServerMinSecurityLevel('joesguns')) {
		let pids = RunScript(ns, 'weaken.script', 'joesguns', Infinity)
		await WaitPids(ns, pids);
	}

	while (ns.getPlayer().skills.hacking < 200) {
		let pids = RunScript(ns, 'grow.script', 'joesguns', Infinity)
		await WaitPids(ns, pids);
	}

	let elapsed = performance.now() - start;

	ns.tprint('WARN: Got to 200 hacking in ' + ns.tFormat(elapsed));
}

function RunScript(ns, scriptName, target, threads) {
	// Find all servers
	const allServers = GetAllServers(ns);

	// Sort by maximum memory
	allServers.sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a));

	// Find script RAM usage
	const ramPerThread = ns.getScriptRam(scriptName);

	// Find usable servers
	const usableServers = allServers.filter(p => ns.hasRootAccess(p) && ns.getServerMaxRam(p) > 0);

	// Fired threads counter
	let fired = 0;
	const pids = [];

	const MIN_HOME_RAM= 120; 

	for (const server of usableServers) {
		// Determin how many threads we can run on target server for the given script
		let availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
		if (server == 'home') {
			availableRam -= MIN_HOME_RAM;
			if (availableRam < 0) availableRam = 0;
		}
		let possibleThreads = Math.floor(availableRam / ramPerThread);

		// Check if server is already at max capacity
		if (possibleThreads <= 0)
			continue;

		// Lower thread count if we are over target
		if (possibleThreads > threads - fired)
			possibleThreads = threads - fired;

		// Copy script to the server if it's not the current
		if (server != ns.getHostname())
			ns.scp(scriptName, server);

		// Fire the script with as many threads as possible
		ns.print('INFO: Starting script ' + scriptName + ' on ' + server + ' with ' + possibleThreads + ' threads');
		let pid = ns.exec(scriptName, server, possibleThreads, target);
		if (pid == 0)
			ns.print('WARN: Could not start script ' + scriptName + ' on ' + server + ' with ' + possibleThreads + ' threads');
		else {
			fired += possibleThreads;
			pids.push(pid);
		}

		if (fired >= threads) break;
	}

	if (fired == 0) {
		ns.print('FAIL: Not enough memory to launch a single thread of ' + scriptName + ' (out of memory on all servers!)');
	}
	if (fired != threads) {
		ns.print('FAIL: There wasn\'t enough ram to run ' + threads + ' threads of ' + scriptName + ' (fired: ' + fired + ').');
	}

	return pids;
}

export async function WaitPids(ns, pids) {
	if (!Array.isArray(pids)) pids = [pids];
	while (pids.some(p => ns.getRunningScript(p) != undefined)) { await ns.sleep(5); }
}

// Iterative network scan
export function GetAllServers(ns) {
	let servers = ['home'];
	for (const server of servers) {
		const found = ns.scan(server);
		if (server != 'home') found.splice(0, 1);
		servers.push(...found);
	}
	return servers;
}