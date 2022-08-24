const MAX_SECURITY_DRIFT = 3; // This is how far from minimum security we allow the server to be before weakening
const MAX_MONEY_DRIFT_PCT = 0.1; // This is how far from 100% money we allow the server to be before growing (1-based percentage)
const DEFAULT_PCT= 0.25; // This is the default 1-based percentage of money we want to hack from the server in a single pass

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	// Parameters
	const [target, pct = DEFAULT_PCT] = ns.args;

	// Show usage if no parameters were passed
	if (target == undefined) {
		ns.tprint('ERROR: No server specified!');
		ns.tprint('INFO : Usage: v1.js <server> <pct>');
		ns.tprint('INFO :    <server> is the name of the target server');
		ns.tprint('INFO :    <pct> is the 1-based maximum percentage to hack from the target (Optional, default is 25%)');
		return;
	}

	// This script calls 1-liner worker scripts, the following commands create those scripts on the current host
	await CreateScript(ns, 'hack');
	await CreateScript(ns, 'grow');
	await CreateScript(ns, 'weaken');

	// Open the tail window, you can comment this if it bothers you
	ns.tail();

	await Exploit(ns, target, pct);
}

async function Exploit(ns, server, pct) {
	while (true) {
		// Security
		const minSec = ns.getServerMinSecurityLevel(server);
		const sec = ns.getServerSecurityLevel(server);
		const weakenThreads = Math.ceil((sec - minSec) / ns.weakenAnalyze(1));

		// Money
		let money = ns.getServerMoneyAvailable(server);
		if (money <= 0) money = 1; // division by zero safety
		const maxMoney = ns.getServerMaxMoney(server);
		const growThreads = Math.ceil(ns.growthAnalyze(server, maxMoney / money));

		// Hacking (limited by pct)
		const hackThreads = Math.floor(ns.hackAnalyzeThreads(server, money) * pct);

		// Report
		ns.print('');
		ns.print(server);
		ns.print('INFO: Money    : ' + ns.nFormat(money, "$0.000a") + ' / ' + ns.nFormat(maxMoney, "$0.000a") + ' (' + (money / maxMoney * 100).toFixed(2) + '%)');
		ns.print('INFO: Security : ' + (sec - minSec).toFixed(2));
		ns.print('INFO: Weaken   : ' + ns.tFormat(ns.getWeakenTime(server)) + ' (t=' + weakenThreads + ')');
		ns.print('INFO: Grow     : ' + ns.tFormat(ns.getGrowTime(server)) + ' (t=' + growThreads + ')');
		ns.print('INFO: Hack     : ' + ns.tFormat(ns.getHackTime(server)) + ' (t=' + hackThreads + ')');
		ns.print('');

		// Check if security is above minimum
		if (sec > minSec + MAX_SECURITY_DRIFT && weakenThreads > 0) {
			// We need to lower security
			ns.print('WARN: ***WEAKENING*** Security is over threshold, we need ' + weakenThreads + ' threads to floor it');
			let pid = await RunScript(ns, 'weaken-once.script', server, weakenThreads);

			ns.print('INFO: Waiting for script completion (approx ' + ns.tFormat(ns.getWeakenTime(server)) + ')');
			await WaitPids(ns, pid);
		}
		else if (money < maxMoney - maxMoney * MAX_MONEY_DRIFT_PCT && growThreads > 0) {
			// We need to grow the server
			ns.print('WARN: ***GROWING*** Money is getting low, we need ' + growThreads + ' threads to max it');
			let pid = await RunScript(ns, 'grow-once.script', server, growThreads);

			ns.print('INFO: Waiting for script completion (approx ' + ns.tFormat(ns.getGrowTime(server)) + ')');
			await WaitPids(ns, pid);
		}
		else if (hackThreads > 0) {
			// Server is ripe for hacking
			ns.print('WARN: ***HACKING*** Server is ripe for hacking, hitting our target would require ' + hackThreads + ' threads');
			let pid = await RunScript(ns, 'hack-once.script', server, hackThreads);

			ns.print('INFO: Waiting for script completion (approx ' + ns.tFormat(ns.getHackTime(server)) + ')');
			await WaitPids(ns, pid);
		}
		else {
			ns.print('FAIL: ***STALLING*** Could not start any of the scripts, this is most likely because we do not have enough RAM to do so. Waiting a bit.');
			await ns.sleep(1000); // If we didn't have enough ram to start anything, we need to sleep here to avoid a lock
		}
	}
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

async function RunScript(ns, scriptName, target, threads) {
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
		const availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
		let possibleThreads = Math.floor(availableRam / ramPerThread);

		// Check if server is already at max capacity
		if (possibleThreads <= 0)
			continue;

		// Lower thread count if we are over target
		if (possibleThreads > threads - fired)
			possibleThreads = threads - fired;

		// Copy script to the server
		if (server != 'home')
			await ns.scp(scriptName, server);

		// Fire the script with as many threads as possible
		ns.print('INFO: Starting script ' + scriptName + ' on ' + server + ' with ' + possibleThreads + ' threads');
		let pid = ns.exec(scriptName, server, possibleThreads, target);
		if (pid == 0)
			ns.print('WARN: Could not start script ' + scriptName + ' on ' + server + ' with ' + possibleThreads + ' threads');
		else
			pids.push(pid);

		fired += possibleThreads;

		if (fired >= threads) break;
	}

	if (fired == 0) {
		ns.print('FAIL: Not enough memory to launch a single thread of ' + scriptName + ' (out of memory on all servers!)');
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