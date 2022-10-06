import { AnyPidStillRunning, Prep, IsPrepped } from "prep.js";
import { BATCH_SPACER, Metrics, GetBestPctForServer } from "metrics.js";
import { MemoryMap, RunScript } from "ram.js";
import { ServerReport } from "utils.js";

const H = 0;
const W1 = 1;
const G = 2;
const W2 = 3;

export async function main(ns) {
	ns.disableLog('ALL');

	if (!ns.fileExists('Formulas.exe')) {
		ns.tprint('ERROR: Formulas.exe is needed to run this script.');
		ns.exit();
	}

	const server = ns.args[0];
	if (ns.args[0] == null) {
		ns.tprint('ERROR: No server specified');
		ns.exit();
	}

	// We need to prep the server before anything
	if (!IsPrepped(ns, server)) {
		ns.print('WARN: Server is not prepared, initiating Prep()...');
		await Prep(ns, server);
		ns.print('SUCCESS: Server prepped!');
	}

	// Manage the server!
	await ManageServer(ns, server);
}

async function ManageServer(ns, server) {
	ns.print('INFO: Gathering batch metrics');

	let totalBatches = 0;	// Total number of batches launched since start
	let batches = [];		// Currently executing batch list

	// Store hack level, this is just for reporting it when we detect a desync.
	// Ideally, most desyncs are caused by an increase in hackLevel mid-cycle,
	// fudging the batch metrics to the point of throwing batches out of sync
	let hackLevel = ns.getHackingLevel();
	let pct = await GetBestPctForServer(ns, server, BATCH_SPACER, 0.05, 1, 0.05, 1);
	let lastEval = Date.now() - (60 * 60 * 1000);
	let metrics = new Metrics(ns, server, pct, BATCH_SPACER, 1);
	let skipHack = 0;

	while (true) {
		const hackLevelChanged = ns.getHackingLevel() != hackLevel;
		const prevHackingLevel = hackLevel;
		hackLevel = ns.getHackingLevel();

		if (Date.now() - lastEval > 5 * 60 * 1000) {
			ns.print('WARN: Evaluating best percentage');
			pct = await GetBestPctForServer(ns, server, BATCH_SPACER, 0.05, 1, 0.05, 1);
			ns.print('WARN: Best percentage: ' + (pct * 100) + '%');
			lastEval = Date.now();
		}

		if (hackLevelChanged)
			metrics = new Metrics(ns, server, pct, BATCH_SPACER, 1);
		metrics.Report(ns);

		ServerReport(ns, server);

		// Need to wait for the next window before we check prep state, otherwise we could check during a paywindow
		if (await WaitNextWindow(ns, metrics, batches)) {
			// Since we prepped in main(), the only reason why we would ever enter this is our metrics changed, something desynced, or some other external factor
			// changed the server state or player capacities
			if (!IsPrepped(ns, server)) {
				// let msg = (hackLevelChanged ? 'WARN: ' : 'ERROR: ') +
				// 	'Desync detected, compensating... ' + server + ' batchCount= ' + batches.length + ' total batches = ' + totalBatches + ' hack= ' + ns.getHackingLevel() + ' (was ' + prevHackingLevel + ')';
				//ns.tprint(msg);
				//ns.print(msg);

				let killCount = 0;

				//let pids = new Array();
				for (const b of batches) {
					if (b.startTime + b.metrics.delays[H] <= performance.now()) continue;

					// pids = pids.concat(b.w1pids);
					// pids = pids.concat(b.w2pids);
					//pids = pids.concat(b.gpids);
					//pids = pids.concat(b.hpids);
					// Kill the hack scripts to try to salvage the situation
					for (let pid of b.hpids) {
						ns.kill(pid);
						killCount++;
					}
				}

				ns.print('WARN: Killed ' + killCount + ' hack jobs to help resync...');

				// Recalc metrics
				if (hackLevelChanged)
					metrics = new Metrics(ns, server, pct, BATCH_SPACER, 1);
				metrics.Report(ns);

				skipHack = 10;
			}
		}
		else {
			ns.print('WARN: Could not find a valid window to fit this batch.');
			await ns.sleep(BATCH_SPACER);
			if (hackLevelChanged)
				metrics = new Metrics(ns, server, pct, BATCH_SPACER, 1);
		}

		for (let b = batches.length - 1; b >= 0; b--) {
			let batch = batches[b];

			let pids = new Array();
			pids = pids.concat(batch.w1pids);
			pids = pids.concat(batch.w2pids);
			pids = pids.concat(batch.gpids);
			pids = pids.concat(batch.hpids);

			if (!AnyPidStillRunning(ns, pids)) {
				batches.splice(b, 1);
			}

			//await ns.sleep(0);
		}

		let mem = new MemoryMap(ns);

		if (mem.available * 0.9 < metrics.batchRam) {
			ns.print('WARN: Not enough free memory to start batch #' + (totalBatches + 1) + ', lets take a break!');
			await ns.sleep(BATCH_SPACER);
			continue;
		}

		ns.print('INFO: Spawning batch #' + (totalBatches + 1) + ' (' + batches.length + ' are currently running)');
		if (!BatchFitsInMemoryBlocks(ns, metrics)) {
			ns.print('WARN: Not memory block configuration available to start batch #' + (totalBatches + 1) + ', lets take a break!');

			ServerReport(ns, server);
			metrics.Report(ns);

			await ns.sleep(BATCH_SPACER);
			if (hackLevelChanged)
				metrics = new Metrics(ns, server, pct, BATCH_SPACER, 1);
			continue;
		}

		if (await WaitNextWindow(ns, metrics, batches)) {
			// Create batch and add it to batches
			const batch = await StartBatch(ns, server, metrics, ++totalBatches, skipHack);
			batches.push(batch);
			if (skipHack > 0) {
				ns.print('WARN: Skipped a hack job to resync!')
				skipHack--;
			}
		}
		else {
			ns.print('WARN: Could not find a valid window to fit this batch.');
			await ns.sleep(BATCH_SPACER);
		}

		ns.print('INFO: Started a total of ' + totalBatches + ' during this session.');

		await ns.sleep(BATCH_SPACER);
	}
}

function DumpBatches(ns, batches, newBatch) {
	return;
	let oldestBatchStart = 0;
	if (batches.length > 0)
		oldestBatchStart = batches[0].startTime;

	for (let batch of batches) {
		let offset = batch.startTime - oldestBatchStart;
		let sliceOffset = Math.ceil(offset / BATCH_SPACER);
		let prefix = '';
		for (let i = 0; i < sliceOffset; i++)
			prefix += ' ';

		//ns.print('oldestBatchStart: ' + oldestBatchStart + ' batch.startTime: ' + batch.startTime);

		ns.print(prefix + batch.metrics.Visualize());
	}

	let offset = Math.ceil((performance.now - oldestBatchStart) / BATCH_SPACER);
	let prefix = '';
	for (let i = 0; i < offset; i++)
		prefix += ' ';

	ns.print('vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv');
	ns.print(prefix + newBatch.Visualize());
	ns.print('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
}

async function WaitNextWindow(ns, metrics, batches, maxWait = 5000) {
	const start = performance.now();

	ns.print('batches: ' + batches.length);
	if (batches.length == 0) return true;

	let iterations = 0;
	for (; ;) {
		let isValid = true;
		let startTime = performance.now();
		iterations++;

		for (const batch of batches) {
			const securityWindows = [];
			securityWindows.push(
				{
					start: batch.startTime + batch.metrics.ends[H],
					end: batch.startTime + batch.metrics.ends[W1]
				}
			);
			securityWindows.push(
				{
					start: batch.startTime + batch.metrics.ends[G],
					end: batch.startTime + batch.metrics.ends[W2]
				}
			);

			for (let windw of securityWindows) {
				for (let i = 0; i < 4; i++) {
					if (IsBetween(ns, windw.start, windw.end, startTime + metrics.delays[i])) {
						isValid = false;
						break;
					}
					if (i % 2 == 0 && IsBetween(ns, windw.start, windw.end, startTime + metrics.ends[i])) {
						isValid = false;
						break;
					}
				}
			}

			//await ns.sleep(0);
		}

		if (isValid) {
			const elapsed = Math.round(performance.now() - start);
			ns.print('WaitNextWindow took ' + elapsed + ' millisecond(s) in ' + iterations + ' iterations');
			return true;
		}

		// Could not find a window in the allocated time
		//if (performance.now() - start > maxWait) {
		//	ns.print('FAIL: Could not start batch in the allowed time (' + maxWait + ' milliseconds) ' + batches.length);
		//	return false;
		//}

		await ns.sleep(0);
	}
}

function IsBetween(ns, min, max, value) {
	let ret = true;
	if (value < min) ret = false;
	if (value > max) ret = false;
	// if (ret)
	// 	ns.tprint('min: ' + min.toFixed(0).padEnd(10) + '  max: ' + max.toFixed(0).padEnd(10) + '  value: ' + value.toFixed(0).padEnd(10) + ' isBetween: ' + ret);
	return ret;
}

export function BatchFitsInMemoryBlocks(ns, metrics) {
	const mem = new MemoryMap(ns);

	const HACK_RAM = ns.getScriptRam('hack-once.js');
	const GROW_RAM = ns.getScriptRam('grow-once.js');
	const WEAKEN_RAM = ns.getScriptRam('weaken-once.js');

	// Failsafe, on veut pas trop taxer
	if (metrics.batchRam > mem.available * 0.5) {
		ns.print('FAIL: metrics.batchRam = ' + metrics.batchRam + ' mem.available = ' + mem.available);
		return false;
	}

	if (mem.ReserveBlock(metrics.threads[H] * HACK_RAM) == undefined) {
		ns.print('FAIL: Could not fit HACK ' + metrics.threads[H] * HACK_RAM);
		return false;
	}
	if (mem.ReserveBlock(metrics.threads[G] * GROW_RAM) == undefined) {
		ns.print('FAIL: Could not fit GROW ' + metrics.threads[G] * GROW_RAM);
		return false;
	}
	for (let i = 0; i < (metrics.threads[W1] + metrics.threads[W2]) * WEAKEN_RAM; i++) {
		if (mem.ReserveBlock(WEAKEN_RAM) == undefined) {
			ns.print('FAIL: Could not fit WEAKEN ' + (metrics.threads[W1] + metrics.threads[W2] * WEAKEN_RAM));
			return false;
		}
	}
	return true;
}

async function StartBatch(ns, server, metrics, batchNumber, skipHack) {
	const colors = [
		'#9226e0', '#6b1a93', '#6754f7', '#e81284', '#dd9713', '#338fc4', '#6be84c', '#ea784b',
		'#1dd62a', '#ba02ed', '#4139dd', '#120087', '#4dcc53', '#8c2700', '#7f1ee8', '#2cb2ab',
		'#e84351', '#390b72', '#38c974', '#368293', '#e5a12b', '#4fe274', '#1230b7', '#21d392',
		'#9dd356', '#8c30e8', '#ed2fd3', '#d3303b', '#0dbf6f', '#e8009e', '#3799fc', '#bc3260'
	];

	const logColor = 0;// colors[batchNumber % colors.length];

	const ret = new Object();
	ret.server = server;
	ret.metrics = metrics;
	ret.startTime = performance.now();
	ret.w1pids = await RunScript(ns, 'weaken-once.js', metrics.threads[W1], [server, 0, metrics.times[W1], batchNumber, logColor], true, false);
	await ns.sleep(0);
	ret.w2pids = await RunScript(ns, 'weaken-once.js', metrics.threads[W2], [server, metrics.delays[W2], metrics.times[W2], batchNumber, logColor], true, false);
	await ns.sleep(0);
	ret.gpids = await RunScript(ns, 'grow-once.js', metrics.threads[G], [server, metrics.delays[G], metrics.times[G], batchNumber, logColor], false, false);
	await ns.sleep(0);
	if (!skipHack) {
		ret.hpids = await RunScript(ns, 'hack-once.js', metrics.threads[H], [server, metrics.delays[H], metrics.times[H], batchNumber, logColor], false, false);
		await ns.sleep(0);
	}
	else
		ret.hpids = [];
	return ret;
}