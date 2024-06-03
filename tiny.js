/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');
	const [target = 'n00dles', pct = 0.05] = ns.args;

	// Create the worker scripts on the current server
	if (!ns.fileExists('tinyhack.js', 'home') || target == 'reset') CreateScript(ns, 'hack');
	if (!ns.fileExists('tinygrow.js', 'home') || target == 'reset')	CreateScript(ns, 'grow');
	if (!ns.fileExists('tinyweaken.js', 'home') || target == 'reset') CreateScript(ns, 'weaken');

	// Copy worker scripts to all the servers
	for (const server of GetAllServers(ns)) {
		if (server == 'home') continue; // we skip home since it's the source
		if (!ns.fileExists('tinyhack.js', server) || target == 'reset') ns.scp('tinyhack.js', server);
		if (!ns.fileExists('tinygrow.js', server) || target == 'reset') ns.scp('tinygrow.js', server);
		if (!ns.fileExists('tinyweaken.js', server) || target == 'reset') ns.scp('tinyweaken.js', server);
	}
	
	// Reset mode just replaces the files and then exits
	if (target == 'reset') return;

	// Start the main loop
	while (true) {
		// Prep the server (we want it at minimum security and maximum money)
		if (!IsPrepped(ns, target)) await BatchPrep(ns, target);

		// Initialize server and player for Formulas.exe functions
		let player = ns.getPlayer();
		let so = ns.getServer(target);

		// Set it to prepped state (it should already be because of the prep but still...)
		so.hackDifficulty = so.minDifficulty;
		so.moneyAvailable = so.moneyMax;

		// hack calculations
		const hackPctThread = ns.formulas.hacking.hackPercent(so, player);
		const hThreads = Math.floor(pct / hackPctThread);
		const effectivePct = hackPctThread * hThreads;
		const batchMoney = so.moneyAvailable * effectivePct;
		const hackRam = ns.getScriptRam('tinyhack.js');

		// grow calculations
		so.moneyAvailable -= batchMoney;
		so.hackDifficulty += hThreads * 0.002;
		const gThreads = ns.formulas.hacking.growThreads(so, player, so.moneyMax);
		const growRam = ns.getScriptRam('tinygrow.js');

		// weaken calculations
		const wThreads = Math.ceil((hThreads * 0.002 + gThreads * 0.004) / 0.05);
		const weakenRam = ns.getScriptRam('tinyweaken.js');
		const batchRam = hackRam + growRam + weakenRam;

		// Report hack/grow/weaken threads to terminal
		ns.print('INFO: Thread balance: H: ' + hThreads + ' G: ' + gThreads + ' W: ' + wThreads);

		// Reset the server since we changed it's money and security for thread calculations
		so = ns.getServer(target);

		const pids = [];
		let batchCount = 0;
		// This check could be better, it will produce one partial batch at the end often.
		// 130k batches maximum, which amounts to 390k scripts. 400k is the limit before crashing the game into a black screen on most browsers.
		while (BiggestRam(ns).available > growRam && AvailableRam(ns) > batchRam && batchCount < 130000) {
			batchCount++;
			// This prevents the batch spawning loop we're in from locking the interface
			if (batchCount % 200 == 0) await ns.sleep(0);
			ns.print('Starting batch #' + batchCount);
			const tempPids = [];
			try {
				tempPids.push(...RunScript(ns, 'tinyhack.js', target, ns.formulas.hacking.weakenTime(so, player) - ns.formulas.hacking.hackTime(so, player), hThreads));
				tempPids.push(...RunScript(ns, 'tinygrow.js', target, ns.formulas.hacking.weakenTime(so, player) - ns.formulas.hacking.growTime(so, player), gThreads));
				tempPids.push(...RunScript(ns, 'tinyweaken.js', target, 0, wThreads));
			}
			catch {
				ns.print('WARN: Could not spawn batch #' + batchCount);
				if (tempPids.length > 0) {
					ns.print('    WARN: Deleting partial batch #' + batchCount + ', total ' + tempPids.length + ' job(s)');
					for (let _pid of tempPids) {
						ns.kill(_pid);
					}
				}
				batchCount--; // The last batch is cancelled
				break;
			}
			pids.push(...tempPids);
		}
		ns.print('INFO: Waiting on ' + batchCount + ' batches to end');
		await WaitPids(ns, pids);
		await ns.sleep(0);
	}
}

// Returns a list of all usable servers (for running workers) and their available memory
function RamSnapshot(ns) {
	return GetAllServers(ns)
		.filter(p => ns.getServer(p).hasAdminRights && ns.getServer(p).maxRam > 0)
		.map(s => { return { name: s, available: ns.getServer(s).maxRam - ns.getServer(s).ramUsed } })
		.sort((a, b) => (ns.getServer(b.name).maxRam - ns.getServer(b.name).ramUsed) - (ns.getServer(a.name).maxRam - ns.getServer(a.name).ramUsed));
}

// Returns the total amount of free ram on the usable network
function AvailableRam(ns) { return RamSnapshot(ns).reduce((sum, s) => sum + s.available, 0); }

// Returns the biggest free block of ram
function BiggestRam(ns) { return RamSnapshot(ns)[0]; }

// Creates one of the worker scripts
function CreateScript(ns, command) {
	ns.write('tiny' + command + '.js', 'export async function main(ns) { await ns.' + command + '(ns.args[0], { additionalMsec: ns.args[1] }) }', 'w');
}

// Returns all servers
function GetAllServers(ns) {
	const z = t => [t, ...ns.scan(t).slice(t != 'home').flatMap(z)];
	return z('home');
}

// Determines if the server is prepped or not
function IsPrepped(ns, target) {
	return ns.getServer(target).hackDifficulty === ns.getServer(target).minDifficulty &&
		ns.getServer(target).moneyAvailable === ns.getServer(target).moneyMax;
}

// Preps a server using a batch (if possible, otherwise sequential)
async function BatchPrep(ns, server) {
	ns.print('WARN: Prepping ' + server);
	ns.print('WARN: Security is ' + ns.getServer(server).hackDifficulty + ' min: ' + ns.getServer(server).minDifficulty);
	ns.print('WARN: Money is ' + ns.getServer(server).moneyAvailable + ' max: ' + ns.getServer(server).moneyMax);

	while (!IsPrepped(ns, server)) {
		const so = ns.getServer(server);
		const player = ns.getPlayer();

		let sec = so.hackDifficulty - so.minDifficulty;

		let w1threads = Math.ceil(sec / 0.05);
		let gthreads = ns.formulas.hacking.growThreads(so, player, so.moneyMax);
		let w2threads = Math.ceil((gthreads * 0.004) / 0.05);

		const allPids = [];
		if (w1threads > 0) {
			ns.print('INFO: Security is over minimum, starting ' + w1threads + ' threads to floor it');
			const pids = RunScript(ns, 'tinyweaken.js', server, 0, w1threads, true);
			allPids.push(...pids);
		}
		if (gthreads > 0) {
			ns.print('INFO: Funds are not maxed, starting ' + gthreads + ' threads to grow them');
			const pids = RunScript(ns, 'tinygrow.js', server, ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 0.8, gthreads, true);
			allPids.push(...pids);
		}
		if (w2threads > 0) {
			ns.print('INFO: We launched grow threads, starting ' + w2threads + ' weaken threads to cancel them it');
			const pids = RunScript(ns, 'tinyweaken.js', server, 0, w2threads, true);
			allPids.push(...pids);
		}
		await WaitPids(ns, allPids);
		await ns.sleep(0);
	}
}

async function WaitPids(ns, pids) {
	if (!Array.isArray(pids)) pids = [pids];
	while (pids.some(p => ns.isRunning(p))) { await ns.sleep(5); }
}

function RunScript(ns, scriptName, target, delay, threads, allowPartial = false) {
	// Find script RAM usage
	const ramPerThread = ns.getScriptRam(scriptName);

	// Fired threads counter
	let fired = 0;
	const pids = [];

	for (const server of RamSnapshot(ns)) {
		let possibleThreads = Math.floor(server.available / ramPerThread);

		// We don't wanna break jobs
		if (possibleThreads < threads && threads != Infinity && !allowPartial) {
			ns.print('WARN: Impossible to launch job without breaking it apart');
			throw "Impossible to launch job without breaking it apart";
		}
		else if (possibleThreads > threads)
			possibleThreads = threads;

		if (possibleThreads == 0) continue;

		// Fire the script with as many threads as possible
		ns.print('INFO: Starting script ' + scriptName + ' on ' + server.name + ' with ' + possibleThreads + ' threads');
		let pid = ns.exec(scriptName, server.name, possibleThreads, target, delay);
		if (pid == 0) 
			ns.print('WARN: Could not start script ' + scriptName + ' on ' + server.name + ' with ' + possibleThreads + ' threads');
		else {
			fired += possibleThreads;
			pids.push(pid);
		}
		if (fired >= threads) break;
	}

	if (fired == 0) {
		ns.print('FAIL: Not enough memory to launch a single thread of ' + scriptName + ' (out of memory on all servers!)');
		if (!allowPartial)
			throw 'Not enough memory to launch a single thread of ' + scriptName + ' (out of memory on all servers!)';
	}
	if (fired != threads && threads != Infinity) {
		ns.print('FAIL: There wasn\'t enough ram to run ' + threads + ' threads of ' + scriptName + ' (fired: ' + fired + ').');
		if (!allowPartial)
			throw 'There wasn\'t enough ram to run ' + threads + ' threads of ' + scriptName + ' (fired: ' + fired + ').';
	}

	return pids;
}