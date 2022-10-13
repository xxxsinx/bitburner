const MAX_SECURITY_DRIFT = 3;		// This is how far from minimum security we allow the server to be before weakening
const MAX_MONEY_DRIFT_PCT = 0.1;	// This is how far from 100% money we allow the server to be before growing (1-based percentage)
const DEFAULT_PCT = 0.25;			// This is the default 1-based percentage of money we want to hack from the server in a single pass
const MIN_HOME_RAM = 64;			// Number of GBs we want to keep free on home


/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let xpMode = false;

	// Parameters
	const [target, pct = DEFAULT_PCT] = ns.args;

	// Show usage if no parameters were passed
	if (target == undefined) {
		ns.tprint('ERROR: No server specified!');
		ns.tprint('INFO : Usage: run v1.js <server> <pct>');
		ns.tprint('INFO :    <server> is the name of the target server');
		ns.tprint('INFO :    <pct> is the 1-based maximum percentage to hack from the target (Optional, default is 25%)');
		ns.tprint('INFO :');
		ns.tprint('INFO : XP MODE: run v1.js xp');
		ns.tprint('INFO :    This mode will simply prepare and then throw all the ram on grow at joesguns for XP');
		return;
	}

	// If the user passes xp as a target, we grow joesguns for XP
	if (target == 'xp') {
		xpMode = true;
	}

	// This script calls 1-liner worker scripts, the following commands create those scripts on the current host
	await CreateScript(ns, 'hack');
	await CreateScript(ns, 'grow');
	await CreateScript(ns, 'weaken');

	// Open the tail window when the script starts
	// ns.tail();

	await Exploit(ns, target, pct, xpMode);
}

async function Exploit(ns, server, pct, xpMode) {
	if (xpMode) server = 'joesguns';

	// Determines if we have got to the hack part of the cycle
	// This is used to show some warnings when the target percentage of hack is too high for current ram or target
	let hackedOnce = false;

	while (true) {
		// Security
		const minSec = ns.getServerMinSecurityLevel(server);
		const sec = ns.getServerSecurityLevel(server);
		let weakenThreads = Math.ceil((sec - minSec) / ns.weakenAnalyze(1));

		// Money
		let money = ns.getServerMoneyAvailable(server);
		if (money <= 0) money = 1; // division by zero safety
		const maxMoney = ns.getServerMaxMoney(server);
		let growThreads = Math.ceil(ns.growthAnalyze(server, maxMoney / money));

		// Hacking (limited by pct)
		let hackThreads = Math.floor(ns.hackAnalyzeThreads(server, money) * pct);

		if (xpMode) {
			if (weakenThreads > 0) weakenThreads = Infinity;
			growThreads = Infinity;
			hackThreads = 0;
		}

		// Report
		ns.print('');
		ns.print(server);
		ns.print('INFO: Money    : ' + ns.nFormat(money, "$0.000a") + ' / ' + ns.nFormat(maxMoney, "$0.000a") + ' (' + (money / maxMoney * 100).toFixed(2) + '%)');
		ns.print('INFO: Security : ' + (sec - minSec).toFixed(2));
		ns.print('INFO: Weaken   : ' + ns.tFormat(ns.getWeakenTime(server)) + ' (t=' + weakenThreads + ')');
		ns.print('INFO: Grow     : ' + ns.tFormat(ns.getGrowTime(server)) + ' (t=' + growThreads + ')');
		ns.print('INFO: Hack     : ' + ns.tFormat(ns.getHackTime(server)) + ' (t=' + hackThreads + ')');
		ns.print('');

		let startedAnything = false;

		// Check if security is above minimum
		if ((xpMode || (sec > minSec + MAX_SECURITY_DRIFT)) && weakenThreads > 0) {
			// We need to lower security
			ns.print('WARN: ***WEAKENING*** Security is over threshold, we need ' + weakenThreads + ' threads to floor it');
			let pids = await RunScript(ns, 'weaken-once.script', server, weakenThreads, hackedOnce);

			if (pids.length > 0 && pids.find(s => s != 0))
				startedAnything = true;

			ns.print('INFO: Waiting for script completion (approx ' + ns.tFormat(ns.getWeakenTime(server)) + ')');
			await WaitPids(ns, pids);
		}
		else if ((money < maxMoney - maxMoney * MAX_MONEY_DRIFT_PCT && growThreads > 0) || xpMode) {
			// We need to grow the server
			ns.print('WARN: ***GROWING*** Money is getting low, we need ' + growThreads + ' threads to max it');
			let pids = await RunScript(ns, 'grow-once.script', server, growThreads, hackedOnce);

			if (pids.length > 0 && pids.find(s => s != 0))
				startedAnything = true;

			if (hackedOnce)
				MemoryReport(ns);

			ns.print('INFO: Waiting for script completion (approx ' + ns.tFormat(ns.getGrowTime(server)) + ')');
			await WaitPids(ns, pids);
		}
		else if (hackThreads > 0) {
			// Server is ripe for hacking
			ns.print('WARN: ***HACKING*** Server is ripe for hacking, hitting our target would require ' + hackThreads + ' threads');
			let pids = await RunScript(ns, 'hack-once.script', server, hackThreads, hackedOnce);

			if (pids.length > 0 && pids.find(s => s != 0))
				startedAnything = true;

			hackedOnce = true;

			ns.print('INFO: Waiting for script completion (approx ' + ns.tFormat(ns.getHackTime(server)) + ')');
			await WaitPids(ns, pids);
		}

		if (!startedAnything) {
			ns.print('FAIL: ***STALLING*** Could not start any of the scripts, this is most likely because we do not have enough RAM to do so. Waiting a bit.');
			await ns.sleep(1000); // If we didn't have enough ram to start anything, we need to sleep here to avoid a lock
		}
	}
}

function MemoryReport(ns) {
	let servers = RecursiveScan(ns);
	let free = 0;
	let used = 0;
	let total = 0;
	for (const server of servers) {
		total += ns.getServerMaxRam(server);
		used += ns.getServerUsedRam(server);
		free = total - used;
	}
	let pct = (free / total * 100).toFixed(2);
	if (used / total < 0.85)
		ns.print('WARN: The full grow cycle for this hacking job is running with ' + pct + '% ram left. You could hack other servers, and/or increase the % hack of this server.')
}

// This function waits for one (or an array of) PID to stop running
export async function WaitPids(ns, pids) {
	if (!Array.isArray(pids)) pids = [pids];
	for (; ;) {
		let stillRunning = false;
		for (const pid of pids) {
			const process = ns.getRunningScript(pid);
			if (process != undefined) {
				stillRunning = true;
				break;
			}
			await ns.sleep(0);
		}
		if (!stillRunning) return;
		await ns.sleep(5);
	}
}

async function RunScript(ns, scriptName, target, threads, hackedOnce) {
	// Find all servers
	const allServers = RecursiveScan(ns);

	// Sort by maximum memory
	allServers.sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a));

	// Find script RAM usage
	const ramPerThread = ns.getScriptRam(scriptName);

	// Find usable servers
	const usableServers = allServers.filter(p => ns.hasRootAccess(p) && ns.getServerMaxRam(p) > 0);

	// Fired threads counter
	let fired = 0;
	const pids = [];

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
			await ns.scp(scriptName, server);

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
	if (hackedOnce && fired != threads) {
		ns.print('FAIL: There wasn\'t enough ram to run ' + threads + ' threads of ' + scriptName + ' (fired: ' + fired + '). It is recommended to either reduce the hack percentage or reduce memory usage from other scripts.');
	}

	return pids;
}

async function CreateScript(ns, command) {
	await ns.write(command + '-once.script', command + '(args[0])', 'w');
}

function RecursiveScan(ns, root = 'home', found = []) {
	if (!found.includes(root)) {
		found.push(root);
		for (const server of ns.scan(root))
			if (!found.includes(server))
				RecursiveScan(ns, server, found);
	}
	return found;
}