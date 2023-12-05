/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');
	const [target = 'n00dles', pct = 0.05] = ns.args;

	// Create the worker scripts on the current server
	if (!ns.fileExists('tinyhack.js', 'home') || target == 'reset')
		CreateScript(ns, 'hack');
	if (!ns.fileExists('tinygrow.js', 'home') || target == 'reset')
		CreateScript(ns, 'grow');
	if (!ns.fileExists('tinyweaken.js', 'home') || target == 'reset')
		CreateScript(ns, 'weaken');

	// Copy worker scripts to all the servers
	for (const server of GetAllServers(ns)) {
		if (server == 'home') continue; // we skip home since it's the source
		if (!ns.fileExists('tinyhack.js', server) || target == 'reset')
			ns.scp('tinyhack.js', server);
		if (!ns.fileExists('tinygrow.js', server) || target == 'reset')
			ns.scp('tinygrow.js', server);
		if (!ns.fileExists('tinyweaken.js', server) || target == 'reset')
			ns.scp('tinyweaken.js', server);
	}

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
		so = ns.getServer(target);

		const pids = [];
		let batchCount = 0;
		// This check could be better, it will produce one partial batch at the end often.
		while (BiggestRam(ns).available > growRam && AvailableRam(ns) > batchRam) {
			batchCount++;
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

function RamSnapshot(ns) {
	return GetAllServers(ns)
		.filter(p => ns.hasRootAccess(p) && ns.getServerMaxRam(p) > 0)
		.map(s => { return { name: s, available: ns.getServer(s).maxRam - ns.getServer(s).ramUsed } })
		.sort((a, b) => (ns.getServer(b.name).maxRam - ns.getServer(b.name).ramUsed) - (ns.getServer(a.name).maxRam - ns.getServer(a.name).ramUsed));
}

function AvailableRam(ns) {
	return RamSnapshot(ns).reduce((sum, s) => sum + s.available, 0);
}

function BiggestRam(ns) {
	return RamSnapshot(ns)[0];
}

function CreateScript(ns, command) {
	ns.write('tiny' + command + '.js', 'export async function main(ns) { await ns.' + command + '(ns.args[0], { additionalMsec: ns.args[1] }) }', 'w');
}

function GetAllServers(ns) {
	const z = t => [t, ...ns.scan(t).slice(t != 'home').flatMap(z)];
	return z('home');
}

function IsPrepped(ns, target) {
	return ns.getServerSecurityLevel(target) === ns.getServerMinSecurityLevel(target) &&
		ns.getServerSecurityLevel(target) === ns.getServerMinSecurityLevel(target);
}

async function BatchPrep(ns, server) {
	ns.print('WARN: Prepping ' + server);
	ns.print('WARN: Security is ' + ns.getServerSecurityLevel(server) + ' min: ' + ns.getServerMinSecurityLevel(server));
	ns.print('WARN: Money is ' + ns.getServerMoneyAvailable(server) + ' max: ' + ns.getServerMaxMoney(server));

	const so = ns.getServer(server);
	const player = ns.getPlayer();

	let security = so.hackDifficulty - so.minDifficulty;

	let gthreads = ns.formulas.hacking.growThreads(so, player, so.moneyMax);
	const gtime = ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 3.2;

	let w1threads = Math.ceil(security / 0.05);
	const wtime = ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 4;

	let w2threads = Math.ceil((gthreads * 0.004) / 0.05);

	const allPids = [];

	if (w1threads > 0) {
		ns.print('INFO: Security is over minimum, starting ' + w1threads + ' threads to floor it');
		const pids = RunScript(ns, 'tinyweaken.js', server, 0, w1threads);
		allPids.push(...pids);
	}

	if (gthreads > 0) {
		ns.print('INFO: Funds are not maxed, starting ' + gthreads + ' threads to grow them');
		const pids = RunScript(ns, 'tinygrow.js', server, ns.formulas.hacking.hackTime(so, ns.getPlayer()) * 0.8, gthreads);
		allPids.push(...pids);
	}

	if (w2threads > 0) {
		ns.print('INFO: We launched grow threads, starting ' + w2threads + ' weaken threads to cancel them it');
		const pids = RunScript(ns, 'tinyweaken.js', server, 0, w2threads);
		allPids.push(...pids);
	}

	await WaitPids(ns, allPids);
}

async function WaitPids(ns, pids) {
	if (!Array.isArray(pids)) pids = [pids];
	while (pids.some(p => ns.getRunningScript(p) != undefined)) { await ns.sleep(5); }
}

function RunScript(ns, scriptName, target, delay, threads, allowPartial= false) {
	// Find all servers
	const snap = RamSnapshot(ns);

	// Find script RAM usage
	const ramPerThread = ns.getScriptRam(scriptName);

	// Fired threads counter
	let fired = 0;
	const pids = [];

	for (const server of snap) {
		let availableRam = server.available;
		let possibleThreads = Math.floor(availableRam / ramPerThread);

		// We don't wanna break jobs
		if (possibleThreads < threads && threads != Infinity && !allowPartial) {
			ns.print('WARN: Impossible to launch job without breaking it apart');
			throw "not enough ram";
		}
		else if (possibleThreads > threads)
			possibleThreads = threads;

		if (possibleThreads == 0) {
			continue;
		}

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
		throw "not enough ram";
	}
	if (fired != threads && threads != Infinity) {
		ns.print('FAIL: There wasn\'t enough ram to run ' + threads + ' threads of ' + scriptName + ' (fired: ' + fired + ').');
		throw "not enough ram";
	}

	return pids;
}