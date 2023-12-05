import { Prep, IsPrepped } from "prep.js";
import { BATCH_SPACER, MaxHackForServer, GetBestMetricsForServer, HGW_MODE } from "metrics.js";
import { MemoryMap, RunScript } from "ram.js";
import { HasFormulas, ServerReport, WaitPids } from "utils.js";

const H = 0;
const W1 = 1;
const G = 2;
const W2 = 3;

export async function main(ns) {
	ns.disableLog('ALL');

	if (!HasFormulas(ns)) {
		ns.tprint('ERROR: Formulas.exe is needed to run this script.');
		ns.exit();
	}

	let [server, maxPctTotalRam, loop] = ns.args;

	// ns.args[0] = target server name
	if (server == null) {
		ns.tprint('ERROR: No server specified');
		ns.exit();
	}

	if (maxPctTotalRam == null) {
		ns.tprint('ERROR: No max percentage of total ram specified');
		ns.exit();
	}

	if (loop == null) {
		loop = true;
	}

	// Manage the server!
	await ManageServer(ns, server, maxPctTotalRam, loop);
}

async function ManageServer(ns, server, maxPctTotalRam, loop) {
	// Batch cycle counter
	let cycle = 0;
	let masterCycle= 0;

	// Store hack level, this is just for reporting it when we detect a desync.
	// Ideally, most desyncs are caused by an increase in hackLevel mid-cycle,
	// fudging the batch metrics to the point of throwing batches out of sync
	let hackLevel = ns.getPlayer().skills.hacking;

	while (true) {
		// const pct = await GetBestPctForServer(ns, server, BATCH_SPACER, 0.05, 0.8, 0.05, maxPctTotalRam);
		// let metrics = new Metrics(ns, server, pct, BATCH_SPACER, 1, maxPctTotalRam);
		ns.print('INFO: Cycle ' + masterCycle + ' - Gathering batch metrics');
		let metrics = await GetBestMetricsForServer(ns, server, 1, MaxHackForServer(ns, server), maxPctTotalRam);
		//const pct= metrics.pct;

		//metrics.Report(ns);
		ServerReport(ns, server, metrics);

		const hackLevelChanged = ns.getPlayer().skills.hacking != hackLevel;
		// if (hackLevelChanged)
		// 	ns.tprint('WARN: Cycle ' + masterCycle + ' - Hack level changed, was ' + hackLevel + ' now is ' + ns.getPlayer().skills.hacking);

		// Since we prepped in main(), the only reason why we would ever enter this is our metrics changed, something desynced, or some other external factor
		// changed the server state or player capacities
		if (!IsPrepped(ns, server)) {
			let msg = (hackLevelChanged ? 'WARN: ' : 'ERROR: ') +
				'Cycle ' + masterCycle + ' - Desync detected, re-prepping ' + server + ' cycles= ' + cycle + ' hack= ' + ns.getPlayer().skills.hacking + ' (was ' + hackLevel + ')';
			if (cycle == 0)
				msg = 'WARN: Cycle ' + masterCycle + ' prepping server!';

			//if (!hackLevelChanged)
			ns.tprint(msg);
			ns.print(msg);
			await Prep(ns, server, metrics);
			ns.print('SUCCESS: Server prepped!');
			cycle = 0; // reset cycle
			hackLevel = ns.getPlayer().skills.hacking;
			ServerReport(ns, server, metrics);
			continue;
		}
		cycle++;
		masterCycle++;

		let pids = new Array();
		let mem = new MemoryMap(ns);

		let coreBonus = 1 + (ns.getServer('home').cpuCores - 1) / 16;

		let batchCount = Math.min(metrics.maxBatches, Math.floor(mem.available * maxPctTotalRam / (metrics.batchRam / coreBonus)));
		if (batchCount <= 0) {
			ns.print('metrics.maxBatches = ' + metrics.maxBatches);
			ns.print('mem.available = ' + mem.available);
			ns.print('metrics.batchRam = ' + metrics.batchRam);
			ns.print('Math.floor(mem.available / metrics.batchRam) = ' + Math.floor(mem.available / metrics.batchRam));

			ns.print('FAIL: Insufficient ram to run a single batch! Aborting...');
			ns.exit();
		}
		ns.print('INFO: Cycle ' + masterCycle + ' - Spawning ' + batchCount + ' batches');

		for (let i = 0; i < batchCount; i++) {
			ns.print('INFO: Cycle ' + masterCycle + ' - Starting batch #' + (i + 1) + ' of ' + batchCount);
			if (!BatchFitsInMemoryBlocks(ns, metrics)) {
				ns.print('WARN: Not enough free memory to start batch #' + (i + 1) + ', lets take a break!');
				break;
			}

			pids = pids.concat(await StartBatch(ns, server, metrics, i));

			if (i % 250 == 249)
				//await ns.sleep(BATCH_SPACER * 4);
				await ns.sleep(0);
		}

		ServerReport(ns, server, metrics);
		ns.print('INFO: Cycle ' + masterCycle + ' - Waiting for batch to end (approx: ' + ns.tFormat(metrics.batchTime) + ')');

		await WaitPids(ns, pids);
		ns.print('SUCCESS: Cycle ' + masterCycle + ' - Cycle ended');
		ns.print('');

		if (!loop) {
			ns.print('SUCCESS: We are done, exiting, controller will restart us if needed...');
			return;
		}

		await ns.sleep(BATCH_SPACER);
	}
}

export function BatchFitsInMemoryBlocks(ns, metrics) {
	const mem = new MemoryMap(ns);

	const HACK_RAM = ns.getScriptRam('hack-once.js');
	const GROW_RAM = ns.getScriptRam('grow-once.js');
	const WEAKEN_RAM = ns.getScriptRam('weaken-once.js');

	// Failsafe, on veut pas trop taxer
	if (metrics.batchRam > mem.available * 0.9) {
		ns.print('Batch won\'t fit in 90% of total ram (failsalfe)');
		return false;
	}

	if (mem.ReserveBlock(metrics.threads[H] * HACK_RAM) == undefined) {
		ns.print('Could not find a block big enough for ' + metrics.threads[H] + ' hack threads');
		ns.print('Required = ' + metrics.threads[H] * HACK_RAM + ' Biggest block = ' + mem.BiggestBlock());

		return false;
	}
	if (mem.ReserveBlock(metrics.threads[G] * GROW_RAM) == undefined) {
		ns.print('Could not find a block big enough for ' + metrics.threads[G] + ' grow threads');
		return false;
	}
	for (let i = 0; i < (metrics.threads[W1] + metrics.threads[W2]) * WEAKEN_RAM; i++) {
		if (mem.ReserveBlock(WEAKEN_RAM) == undefined) {
			ns.print('Could not find enough network RAM for ' + (metrics.threads[W1] + metrics.threads[W2]) + ' weaken threads');
			return false;
		}
	}
	return true;
}

async function StartBatch(ns, server, metrics, batchNumber) {
	const colors = [
		'#9226e0', '#6b1a93', '#6754f7', '#e81284', '#dd9713', '#338fc4', '#6be84c', '#ea784b',
		'#1dd62a', '#ba02ed', '#4139dd', '#120087', '#4dcc53', '#8c2700', '#7f1ee8', '#2cb2ab',
		'#e84351', '#390b72', '#38c974', '#368293', '#e5a12b', '#4fe274', '#1230b7', '#21d392',
		'#9dd356', '#8c30e8', '#ed2fd3', '#d3303b', '#0dbf6f', '#e8009e', '#3799fc', '#bc3260'
	];

	//const logColor = colors[batchNumber % colors.length];
	const logColor = 0;
	//ns.tprint(logColor);

	let w1pids = [];

	const hpids = RunScript(ns, 'hack-once.js', metrics.threads[H], [server, metrics.delays[H], metrics.times[H], batchNumber, logColor], false, false);
	await ns.sleep(0);
	if (hpids.length == 0) {
		ns.print('FAIL: H Aborting batch');
		//await ns.sleep(metrics.batchTime);
		return [hpids, w1pids, gpids, w2pids].flat(Infinity);
	}

	if (!HGW_MODE) {
		w1pids = RunScript(ns, 'weaken-once.js', metrics.threads[W1], [server, 0, metrics.times[W1], batchNumber, logColor], true, false);
		//await ns.sleep(0);
		if (w1pids.length == 0) {
			ns.print('FAIL: W1 Aborting batch');
			//await ns.sleep(metrics.batchTime);
			return [w1pids].flat(Infinity);
		}
	}

	const gpids = RunScript(ns, 'grow-once.js', metrics.threads[G], [server, metrics.delays[G], metrics.times[G], batchNumber, logColor], false, false);
	//await ns.sleep(0);
	if (gpids.length == 0) {
		ns.print('FAIL: G Aborting batch');
		//await ns.sleep(metrics.batchTime);
		return [w1pids, gpids, w2pids].flat(Infinity);
	}


	const w2pids = RunScript(ns, 'weaken-once.js', metrics.threads[W2], [server, 0, metrics.times[W2], batchNumber, logColor], true, false);
	//const w2pids = await RunScript(ns, 'weaken-once.js', metrics.threads[W2], [server, metrics.delays[W2], metrics.times[W2], batchNumber, logColor], true, false);
	//await ns.sleep(0);
	if (w2pids.length == 0) {
		ns.print('FAIL: W2 Aborting batch');
		//await ns.sleep(metrics.batchTime);
		return [w1pids, w2pids].flat(Infinity);
	}

	return [hpids, w1pids, gpids, w2pids].flat(Infinity);
}