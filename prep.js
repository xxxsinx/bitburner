import { MemoryMap } from "ram.js";

export function BatchSpacer() {
	return 30;
}

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	if (ns.args[0] == null) {
		ns.print('ERROR: No server specified');
		ns.exit();
	}
	var server = ns.args[0];

	if (ns.args[0] == 'mem') {
		let ram = new MemoryMap(ns);
		for (let block of ram.blocks)
			ns.tprint(block.server + ' size= ' + block.free);
	}
	else if (ns.args[1] == undefined || ns.args[1] == 'prep') {
		if (IsPrepped(ns, server)) {
			//ns.tprint('INFO: Server is already prepped (' + server + ')');
		}
		else {
			//ns.tprint('INFO: Prep initiated on ' + server);
			await Prep(ns, server);
			//ns.tprint('SUCCESS: Prep completed on ' + server);
		}
	}
	else if (ns.args[1] == 'hack') {
		let so = ns.getServer(server);
		await Hack(ns, server, 1);
	}
}

export function IsPrepped(ns, server) {
	var so = ns.getServer(server);
	if (so.moneyAvailable < so.moneyMax) return false;
	if (so.hackDifficulty > so.minDifficulty) return false;
	return true;
}

export async function Grow(ns, server, allowSpread = false, allowPartial = true, extra = 1.1) {
	const script = 'grow-once.js';
	const so = ns.getServer(server);
	let threads = Math.ceil(ns.growthAnalyze(server, so.moneyMax / Math.max(so.moneyAvailable, 1), 1) * extra);
	const estTime = ns.getGrowTime(server);
	ns.print('INFO: Funds are not maxed, starting ' + threads + ' threads to grow them');
	const pids = await RunScript(ns, script, server, threads, 0, estTime, 0, 0, allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

export async function Weaken(ns, server, allowSpread = true, allowPartial = true, extra = 1.0) {
	const script = 'weaken-once.js';
	const so = ns.getServer(server);
	const threads = Math.ceil((so.hackDifficulty - so.minDifficulty) / ns.weakenAnalyze(1, 1) * extra);
	const estTime = ns.getWeakenTime(server);
	ns.print('INFO: Security is over minimum, starting ' + threads + ' threads to floor it');
	const pids = await RunScript(ns, script, server, threads, 0, estTime, 0, 0, allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

export async function Hack(ns, server, pct, allowSpread = false, allowPartial = true, extra = 1.1) {
	const script = 'hack-once.js';
	const so = ns.getServer(server);
	const threads = Math.floor(ns.hackAnalyzeThreads(server, so.moneyAvailable) * pct * extra);
	const estTime = ns.getHackTime(server);
	ns.print('INFO: Server is ripe for hacking, starting ' + threads + ' threads to hack it');
	const pids = await RunScript(ns, script, server, threads, 0, estTime, 0, 0, allowSpread, allowPartial);
	await WaitPids(ns, pids);
	return [threads, estTime];
}

export async function Prep(ns, server, metrics) {
	while (!IsPrepped(ns, server)) {
		let so = ns.getServer(server);
		await ServerReport(ns, server, metrics);

		if (so.hackDifficulty > so.minDifficulty)
			await Weaken(ns, server, true, true);
		else if (so.moneyAvailable < so.moneyMax)
			await Grow(ns, server, false, true);

		await ns.sleep(200);
	}
}

export async function ServerReport(ns, server, metrics = undefined, printfunc = ns.print) {
	// Get server object for this server
	var so = ns.getServer(server);

	// weaken threads
	const tweaken = Math.ceil((so.hackDifficulty - so.minDifficulty) / ns.weakenAnalyze(1, 1)); //Math.ceil((sec - minSec) * 20);
	// grow threads
	const tgrow = Math.ceil(ns.growthAnalyze(server, so.moneyMax / Math.max(so.moneyAvailable, 1), 1));
	// hack threads
	const thack = Math.ceil(ns.hackAnalyzeThreads(server, so.moneyAvailable));

	printfunc('┌─────────────────────────────────────────────────────┐');
	printfunc('│ ' + server.padStart(52 / 2 + server.length / 2).padEnd(52) + '│');
	printfunc('├─────────────────────────────────────────────────────┤');
	printfunc('│ ' + ('Money        : ' + ns.nFormat(so.moneyAvailable, "$0.000a") + ' / ' + ns.nFormat(so.moneyMax, "$0.000a") + ' (' + (so.moneyAvailable / so.moneyMax * 100).toFixed(2) + '%)').padEnd(52) + '│');
	printfunc('│ ' + ('Security     : ' + (so.hackDifficulty - so.minDifficulty).toFixed(2) + ' min= ' + so.minDifficulty.toFixed(2) + ' current= ' + so.hackDifficulty.toFixed(2)).padEnd(52) + '│');
	printfunc('├─────────────────────────────────────────────────────┤');
	printfunc('│ ' + ('Weaken time  : ' + ns.tFormat(ns.getWeakenTime(server)) + ' (t=' + tweaken + ')').padEnd(52) + '│');
	//printfunc('│ ' + ('Grow         : ' + ns.tFormat(ns.getGrowTime(server)) + ' (t=' + tgrow + ')').padEnd(52) + '│');
	//printfunc('│ ' + ('Hack         : ' + ns.tFormat(ns.getHackTime(server)) + ' (t=' + thack + ')').padEnd(52) + '│');
	printfunc('├─────────────────────────────────────────────────────┤');

	let mem = new MemoryMap(ns);
	printfunc('│ ' + ('Memory       : ' + ns.nFormat(mem.available * 1000000000, '0.00b') + ' (' + ns.nFormat(mem.total * 1000000000, '0.00b') + ' - ' + ns.nFormat(mem.used * 1000000000, '0.00b') + ') (used: ' + (Math.round(mem.used / mem.total * 100)) + '%)').padEnd(52) + '│');
	printfunc('└─────────────────────────────────────────────────────┘');

	if (metrics != undefined) {
		metrics.Report(ns, printfunc);
	}
}

export function ServerUsableRam(ns, server) {
	return ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
}

export async function WaitPids(ns, pids) {
	if (pids.length == undefined) pids = [pids];
	for (; ;) {
		let stillRunning = false;
		for (var pid of pids) {
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

export function AnyPidStillRunning(ns, pids) {
	for (var pid of pids) {
		const process = ns.getRunningScript(pid);
		if (process != undefined) return true;
	}
	return false;
}

export async function RunScript(ns, scriptName, target, threads, delay, expectedTime, batchNumber, logColor, allowSpread, allowPartial) {
	let ramMap = new MemoryMap(ns);

	// Find script RAM usage
	let ram = ns.getScriptRam(scriptName);

	// Fired threads counter
	let fired = 0;
	let pids = new Array();

	let prot = 0;

	let unique = 0;

	while (fired < threads) {
		// const biggest = ramMap.BiggestBlock();
		// let maxThreads = Math.floor(biggest / ram);
		// if (maxThreads == 0) break;
		// if (maxThreads > threads - fired) {
		// 	maxThreads = threads - fired;
		// }
		// const blockSize = maxThreads * ram;
		// const server = ramMap.ReserveBlock(blockSize);

		let candidate = ramMap.BiggestBlock();
		// if (allowSpread) {
		// 	candidate = ramMap.SmallestBlock(ram);
		// 	//ns.tprint('smallest='+ candidate);
		// }

		let maxThreads = Math.floor(candidate / ram);
		if (maxThreads == 0) break;
		if (maxThreads > threads - fired) {
			maxThreads = threads - fired;
		}
		const blockSize = maxThreads * ram;
		const server = ramMap.ReserveBlock(blockSize);

		if (server != undefined) {
			// if (!ns.fileExists(scriptName, server)) {
			// 	ns.print('WARN: ' + scriptName + ' not found on ' + server);
			// 	ns.print('WARN: Attempting to copy ' + scriptName + ' to ' + server);

			await ns.scp(scriptName, server);

			// 	if (!ns.fileExists(scriptName, server)) {
			// 		ns.print('FAIL: Could not copy ' + scriptName + ' to ' + server + ', aborting.');
			// 		break;
			// 	}
			// 	else {
			// 		ns.print('SUCCESS: Copied ' + scriptName + ' to ' + server + ', resuming.');
			// 	}
			// }

			//ns.print('Attempting to start ' + scriptName + ' on ' + server + ' with ' + maxThreads + ' threads');
			let pid = ns.exec(scriptName, server, maxThreads, target, delay, expectedTime, batchNumber, logColor, performance.now() + unique++);
			if (pid > 0) {
				ns.print('Started script ' + scriptName + ' on ' + server + ' with ' + maxThreads + ' threads');
				pids.push(pid);
				fired += maxThreads;
			}
			else {
				ns.print('FAIL: Failed to launch script ' + scriptName + ' on ' + server + ' with ' + maxThreads + ' threads');
			}
		}
		else if (!allowPartial) {
			// Couldn't find a block big enough so can't allowPartial
			break;
		}
		else if (!allowSpread) {
			// Couldn't find a block big enough and cannot allowSpread
			break;
		}

		prot++;
		if (prot > 100) {
			ns.print('ERROR: RunScript infinite loop detected.');
			ns.print('INFO: candidate= ' + candidate + ' ram= ' + ram + ' maxThreads= ' + maxThreads + ' threads= ' + threads + ' fired=' + fired + ' blockSize=' + blockSize);
			break;
		}
	}

	if (fired != threads) {
		ns.print('ERROR: No server big enough to handle ' + threads + ' threads of ' + scriptName + ' (fired ' + fired + ' total)');
	}
	return pids;
}

export function FormatMoney(ns, value) {
	return ns.nFormat(value, "$0.000a");
}