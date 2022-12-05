import { MemoryMap } from "ram.js";
import { HasFormulas, FormatMoney, GetAllServers, GetNextLevelXp } from "utils.js";
import { ColorPrint, PrintTable, DefaultStyle } from 'tables.js'

export const H = 0;		// Index of HACK data
export const W1 = 1;	// Index of first WEAKEN data
export const G = 2;		// Index of GROW data
export const W2 = 3;	// Index of second WEAKEN data

export const BATCH_SPACER = 30; // Spacer between jobs (and batches) in milliseconds

export let HGW_MODE = false;

const DEPTH = 10;

let LEECH = [];

/** @param {NS} ns **/
export async function main(ns) {
	LEECH = [];
	for (let i = 0.05; i < 1; i += 0.05) LEECH.push(i);
	LEECH.push(1);

	let start = performance.now();

	if (!HasFormulas(ns)) {
		ns.tprint('ERROR: Formulas.exe not found, running this command would take years, aborting.');
		ns.exit();
	}

	if (ns.args[0] == 'test') {
		let servers = GetAllServers(ns).filter(s => ns.getServerMaxMoney(s) > 0);
		let player= ns.getPlayer();

		for (let server of servers) {
			let so = ns.getServer(server);
			so.hackDifficulty = so.minDifficulty;
			player.skills.hacking = 3000;
			solveGrow(ns.formulas.hacking.growPercent(so, 1, player, 1), so.moneyMax / 2, so.moneyMax);
		}

		ns.tprint('WARN: Solving grow on ' + servers.length + ' servers took ' + (performance.now() - start).toFixed(0) + 'ms');

		return;
	}

	// args[0] : max total network ram percentage
	// args[1] : server name to analyze (if empty, do a full server list report)
	let [server, maxNetworkRamPct = 1, HGW] = ns.args;
	if (HGW != undefined)
		HGW_MODE = HGW;

	if (server == undefined) {
		AnalyzeAllServers(ns, maxNetworkRamPct, true);
		ns.tprint('Executed in ' + Math.ceil(performance.now() - start) + ' milliseconds');
		return;
	}
	else if (server == 'seq') {
		AnalyzeAllServersSequential(ns, maxNetworkRamPct);

		// let metrics = GetBestSequentialMetricsForServer(ns, 'foodnstuff', 1, MaxHackForServer(ns, 'foodnstuff'), maxNetworkRamPct);
		// if (metrics) metrics.Report(ns, ns.tprint);

		ns.tprint('Executed in ' + Math.ceil(performance.now() - start) + ' milliseconds');
		return;
	}
	else {
		let results = [];

		for (const pct of LEECH) {
			let metrics = new Metrics(ns, server, pct, BATCH_SPACER, 1, 1);
			if (metrics == undefined)
				ns.tprint('metrics is null?')
			else if (metrics.cashPerSecond == undefined)
				ns.tprint('cashPerSecond is null?')
			results.push(metrics);
		}

		let bestPct = GetBestPctForServer(ns, server, BATCH_SPACER, 0.05, 1, 0.05, 1)?.pct ?? 0;

		let cpsorder = [...results].sort((a, b) => a.cashPerSecond - b.cashPerSecond);
		let ramorder = [...results].sort((a, b) => a.batchRam - b.batchRam);
		let batches = [...results].sort((a, b) => a.maxRunnableBatches - b.maxRunnableBatches);

		let tableData = [];
		const columns = [
			{ header: ' ' + server, width: server.length + 2 },
			{ header: '  $/sec', width: 10 },
			{ header: ' BatchRam', width: 10 },
			{ header: '    Count', width: 12 },
			{ header: ' Charts', width: 34 },
			{ header: ' Threads', width: 37 },
			{ header: ' Cycle $', width: 9 },
			{ header: ' Cycle time', width: 25 },
			{ header: ' Batch XP', width: 10 },
			{ header: ' Max to lvl', width: 12 }
		];

		const barchar = '■';

		let maxH = Math.max(...results.map(s => s.threads[H]));
		let maxG = Math.max(...results.map(s => s.threads[G]));
		let maxW = Math.max(...results.map(s => s.threads[W1] + s.threads[W2]));

		for (const metrics of results) {
			let maxThreads = Math.max(...metrics.threads);
			let pctOfMax = Math.round(metrics.cashPerSecond / cpsorder[cpsorder.length - 1].cashPerSecond * 100);
			let pctH = Math.round(metrics.threads[H] / maxH * 100);
			let pctH2 = Math.round(metrics.threads[H] / maxThreads * 100);
			pctH = pctH2;
			tableData.push([
				{ color: bestPct == metrics.pct ? 'lime' : 'white', text: ((metrics.pct * 100).toFixed(2) + '% ').padStart(server.length + 1) },
				{ color: 'white', text: ns.nFormat(metrics.cashPerSecond, '0.000a').padStart(9) },
				{ color: 'white', text: ns.nFormat(Math.ceil(metrics.batchRam) * 1000000000, '0.0b').padStart(9) },
				{ color: 'white', text: (metrics.maxRunnableBatches + '/' + metrics.maxBatches).padStart(11) },
				{ color: metrics.maxRunnableBatches == 0 ? 'red' : 'lime', text: metrics.maxRunnableBatches == 0 ? ' Not enough RAM available!' : '$/sec'.padStart(6) + ' '.padEnd(pctOfMax / 4 + 2, barchar) },
				{ color: 'darkorange', text: ' H ' + metrics.threads[H].toString().padStart(7) + ' '.padEnd(pctH / 4 + 1, barchar) },
				{ color: 'white', text: ns.nFormat(metrics.batchMoney * metrics.maxRunnableBatches, '0.0a').padStart(8) },
				{ color: 'white', text: ' ' + ns.tFormat(metrics.batchTime + BATCH_SPACER * metrics.maxRunnableBatches).padStart(9) },
				{ color: 'white', text: ' ' + ns.nFormat(metrics.batchXp, '0.000a').padStart(8) },
				{ color: 'white', text: ' ' + Math.ceil(GetNextLevelXp(ns).remaining / metrics.batchXp).toString().padStart(10) }
			]);

			pctOfMax = Math.round(metrics.maxRunnableBatches / batches[ramorder.length - 1].maxRunnableBatches * 100);

			let pctG = Math.round(metrics.threads[G] / maxG * 100);
			let pctG2 = Math.round(metrics.threads[G] / maxThreads * 100);
			pctG = pctG2;
			tableData.push([
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'darkorange', text: metrics.maxRunnableBatches == 0 ? '' : 'Count'.padStart(6) + ' '.padEnd(pctOfMax / 4 + 2, barchar) },
				{ color: 'lime', text: ' G ' + metrics.threads[G].toString().padStart(7) + ' '.padEnd(pctG / 4 + 1, barchar) },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' }
			]);

			pctOfMax = Math.round(metrics.batchRam / ramorder[ramorder.length - 1].batchRam * 100);

			let pctW = Math.round((metrics.threads[W1] + metrics.threads[W2]) / maxW * 100);
			let pctW2 = Math.round((metrics.threads[W1] + metrics.threads[W2]) / maxThreads * 100);
			pctW = pctW2;//(pctW + pctW2) / 2;
			let weakenThreadsText = HGW_MODE ? metrics.threads[W2].toString() : (metrics.threads[W1] + '/' + metrics.threads[W2]).toString();
			tableData.push([
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'yellow', text: metrics.maxRunnableBatches == 0 ? '' : 'B.Ram'.padStart(6) + ' '.padEnd(pctOfMax / 4 + 2, barchar) },
				{ color: '#4488FF', text: ' W ' + weakenThreadsText.padStart(7) + ' '.padEnd(pctW / 4 + 1, barchar) },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' }
			]);

			tableData.push(null);
		}

		tableData.pop();
		PrintTable(ns, tableData, columns, DefaultStyle(), ColorPrint);
		ns.tprint('Executed in ' + Math.ceil(performance.now() - start) + ' milliseconds');
	}
}

export function GetBestPctForServer(ns, server, spacer = BATCH_SPACER, minPct = 0.05, maxPct = 1, step = 0.05, maxNetworkRamPct) {
	let best = undefined;

	for (const pct of LEECH) {
		const metrics = new Metrics(ns, server, pct, spacer, 1, maxNetworkRamPct)
		if (metrics.cashPerSecond > (best?.cashPerSecond ?? 0))
			best = metrics;
	}

	return best;
}

export function AnalyzeAllServers(ns, maxNetworkRamPct, verbose = true) {
	const data = new Array();
	const servers = GetAllServers(ns).filter(s => ns.getServer(s).hasAdminRights && ns.getServer(s).moneyMax > 0);

	if (verbose) ns.tprint('INFO: Getting metrics for ' + servers.length + ' servers');
	for (let server of servers) {
		let metrics = GetBestMetricsForServer(ns, server, 1, MaxHackForServer(ns, server), maxNetworkRamPct);
		if (metrics)
			data.push(metrics);
	}
	if (verbose) ns.tprint('SUCCESS: Done gathering metrics on ' + servers.length + ' servers');

	let sorted = data.sort((a, b) => b.cashPerSecond - a.cashPerSecond);

	if (verbose) {
		let tableData = [];
		const columns = [
			{ header: ' server', width: 20 },
			{ header: ' Hack %', width: 8 },
			{ header: '   $/sec', width: 9 },
			{ header: ' batchTime', width: 25 },
			{ header: ' weakenTime', width: 25 }
		];

		for (let metrics of sorted) {
			tableData.push([
				{ color: 'white', text: ' ' + metrics.server },
				{ color: 'white', text: ((metrics.pct * 100).toFixed(2) + '%').padStart(7) },
				{ color: 'white', text: ns.nFormat(metrics.cashPerSecond, '0.0a').padStart(8) },
				{ color: 'white', text: ' ' + ns.tFormat(metrics.batchTime) },
				{ color: 'white', text: ' ' + ns.tFormat(metrics.currentStateWeakenTime) }
			]);
		}

		ns.tprint('Something should show.');
		ns.tprint('tableData.length: ' + tableData.length);
		ns.tprint('columns.length: ' + columns.length);
		PrintTable(ns, tableData, columns, DefaultStyle(), ColorPrint);
	}
	return sorted;
}

export class Metrics {
	constructor(ns, server, pct, spacer, cores = 1, maxNetworkRamPct = 1, forcedHackThreads = undefined) {
		// Params
		this.server = server;
		this.pct = pct;
		this.spacer = spacer;
		this.cores = cores;
		this.maxNetworkRamPct = maxNetworkRamPct;
		this.maxNetworkRam = undefined;
		this.forcedHackThreads = forcedHackThreads;

		// Metrics
		this.times = new Array(0, 0, 0, 0);
		this.threads = new Array(0, 0, 0, 0);

		// Calculated values
		this.delays = new Array(0, 0, 0, 0);
		this.ends = new Array(0, 0, 0, 0);

		// Additional information
		this.batchRam = 0;
		this.batchTime = 0;
		this.batchMoney = 0;
		this.hackChance = 0;
		this.effectivePct = 0;
		this.moneyPerRam = 0;
		this.maxRunnableBatches = 0;
		this.jobXp = new Array(0, 0, 0, 0);
		this.batchXp = 0;

		this.cashPerSecond = 0;

		// Fill the data
		this.UpdateMetrics(ns);
	}

	Report(ns, minimalist = false) {
		if (minimalist) {
			let pct = Math.round(this.pct * 100).toString() + '%';
			let threads = this.threads.toString();
			let cps = FormatMoney(ns, Math.ceil(this.batchMoney * this.maxRunnableBatches / (this.batchTime / 1000)));
			let ram = ns.nFormat(Math.ceil(this.maxRunnableBatches * this.batchRam) * 1000000000, '0.00b');
			let batchRam = ns.nFormat(Math.ceil(this.batchRam) * 1000000000, '0.00b');
			ns.print(pct.padEnd(6) + threads.padEnd(20) + cps.padEnd(12) + ram.padEnd(12) + batchRam.padEnd(12));
			return;
		}

		ns.print('┌─────────────────────────────────────────────────────┐');
		let line = 'Metrics for ' + this.server + ' skimming ' + Math.round(this.pct * 100) + '%';
		ns.print('│ ' + line.padStart(52 / 2 + line.length / 2).padEnd(52) + '│');
		ns.print('├─────────────────────────────────────────────────────┤');
		line = 'RAM                     :  ' + ns.nFormat(Math.ceil(this.batchRam) * 1000000000, '0.00b');
		ns.print('│ ' + line.padEnd(52) + '│');
		line = '$                       :  ' + FormatMoney(ns, this.batchMoney);
		ns.print('│ ' + line.padEnd(52) + '│');
		line = 'Time                    :  ' + ns.tFormat(this.batchTime);
		ns.print('├─────────────────────────────────────────────────────┤');
		ns.print('│ ' + line.padEnd(52) + '│');
		line = 'Max Count               :  ' + this.maxBatches;
		ns.print('│ ' + line.padEnd(52) + '│');
		line = '$/RAM                   :  ' + FormatMoney(ns, this.moneyPerRam);
		ns.print('│ ' + line.padEnd(52) + '│');
		line = 'Max in allowed ram      :  ' + this.maxRunnableBatches;
		ns.print('│ ' + line.padEnd(52) + '│');
		ns.print('├─────────────────────────────────────────────────────┤');
		line = 'Cycle profit            :  ' + FormatMoney(ns, this.batchMoney * this.maxRunnableBatches);
		ns.print('│ ' + line.padEnd(52) + '│');
		line = 'Cycle RAM               :  ' + ns.nFormat(Math.ceil(this.maxRunnableBatches * this.batchRam) * 1000000000, '0.00b');
		ns.print('│ ' + line.padEnd(52) + '│');
		line = '$/s                     :  ' + FormatMoney(ns, Math.ceil(this.batchMoney * this.maxRunnableBatches / (this.batchTime / 1000)));
		ns.print('│ ' + line.padEnd(52) + '│');

		ns.print('├─────────────────────────────────────────────────────┤');
		if (HGW_MODE) {
			ns.print('│ ' + ('HGW threads : ' + this.threads).padEnd(52) + '│');
			ns.print('│ ' + ('HGW times   : ' + this.times.map(p => Math.ceil(p))).padEnd(52) + '│');
			ns.print('│ ' + ('HGW delays  : ' + this.delays).padEnd(52) + '│');
			ns.print('│ ' + ('HGW ends    : ' + this.ends).padEnd(52) + '│');
		}
		else {
			ns.print('│ ' + ('HWGW threads : ' + this.threads).padEnd(52) + '│');
			ns.print('│ ' + ('HWGW times   : ' + this.times.map(p => Math.ceil(p))).padEnd(52) + '│');
			ns.print('│ ' + ('HWGW delays  : ' + this.delays).padEnd(52) + '│');
			ns.print('│ ' + ('HWGW ends    : ' + this.ends).padEnd(52) + '│');
		}

		ns.print('└─────────────────────────────────────────────────────┘');
	}

	UpdateMetrics(ns) {
		if (!HasFormulas(ns)) {
			ns.tprint('ERROR: Formulas.exe is required.');
			return;
		}

		// Figure hack time and threads
		const so = ns.getServer(this.server);
		const player = ns.getPlayer();

		// Note current security weaken time
		this.currentStateWeakenTime = ns.formulas.hacking.weakenTime(so, player);

		// Set server to min difficulty, it's the state where all 4 ops start at
		so.hackDifficulty = so.minDifficulty;
		so.moneyAvailable = so.moneyMax;

		// Get the times, those are fixed since we start at X security
		this.times[H] = ns.formulas.hacking.hackTime(so, player);
		this.times[W1] = ns.formulas.hacking.weakenTime(so, player);
		this.times[G] = ns.formulas.hacking.growTime(so, player);
		this.times[W2] = ns.formulas.hacking.weakenTime(so, player);

		// Figure first hack time and threads
		const hackPctThread = ns.formulas.hacking.hackPercent(so, player);
		this.threads[H] = Math.ceil(this.pct / hackPctThread);
		if (this.threads[H] == Infinity) this.threads[H] = 0;
		this.effectivePct = Math.min(hackPctThread * this.threads[H], 1 - 0.000001);
		this.batchMoney = Math.floor(so.moneyAvailable * hackPctThread) * this.threads[H];

		so.moneyAvailable -= this.batchMoney;
		so.hackDifficulty += this.threads[H] * 0.002; //ns.hackAnalyzeSecurity(this.threads[H]);

		if (this.pct == 1) {
			this.effectivePct = 1 - 0.000001;
			so.moneyAvailable = 0;
		}

		// Figure first weaken time and threads
		this.threads[W1] = Math.ceil((so.hackDifficulty - so.minDifficulty) / 0.05 /*ns.weakenAnalyze(1, this.cores)*/);
		if (!HGW_MODE)
			so.hackDifficulty = so.minDifficulty;

		if (isNaN(so.moneyAvailable)) {
			return;
		}
		//this.threads[G] = calculateGrowThreads(ns, so, player, this.cores);
		this.threads[G] = solveGrow(ns.formulas.hacking.growPercent(so, 1, player, 1), so.moneyAvailable, so.moneyMax);

		// Figure grow time and threads
		// const growFactor = 1 / (1 - ((so.moneyMax - 0.01) / so.moneyMax));
		// this.debugThreadsG = Math.ceil(Math.log(growFactor) / Math.log(ns.formulas.hacking.growPercent(so, 1, player, this.cores)));

		if (so.moneyAvailable == 0) so.moneyAvailable = 1;

		so.hackDifficulty += this.threads[G] * 0.004; //ns.growthAnalyzeSecurity(this.threads[G]);
		so.moneyAvailable = so.moneyMax;

		// Figure second weaken time and threads
		this.threads[W2] = Math.ceil((so.hackDifficulty - so.minDifficulty) / 0.05 /*ns.weakenAnalyze(1, this.cores)*/);
		so.hackDifficulty = so.minDifficulty;

		// Make sure we have whole values of threads and times
		this.threads = this.threads.map(p => Math.ceil(p));
		this.times = this.times.map(p => Math.ceil(p));

		if (HGW_MODE) {
			this.threads[W1] = 0;
			this.times[W1] = 0;

			this.delays[H] = this.times[W2] - this.spacer * 2 - this.times[H];
			this.delays[W1] = 0;
			this.delays[G] = this.times[W2] - this.spacer - this.times[G];
			this.delays[W2] = 0;

			this.ends[H] = this.delays[H] + this.times[H];
			this.ends[W1] = 0;
			this.ends[G] = this.delays[G] + this.times[G];
			this.ends[W2] = this.delays[W2] + this.times[W2];
		}
		else {
			this.delays[H] = this.times[W1] - this.spacer - this.times[H];
			this.delays[W1] = 0;
			this.delays[G] = this.times[W1] + this.spacer - this.times[G];
			this.delays[W2] = this.spacer * 2;

			this.ends[H] = this.delays[H] + this.times[H];
			this.ends[W1] = this.delays[W1] + this.times[W1];
			this.ends[G] = this.delays[G] + this.times[G];
			this.ends[W2] = this.delays[W2] + this.times[W2];
		}

		// Round delays
		this.delays = this.delays.map(p => Math.ceil(p))

		// Calculate batch time
		this.batchTime = Math.ceil(this.delays[W2] + this.times[W2]);

		// Calculate batch ram requirement
		const HACK_RAM = ns.getScriptRam('hack-once.js');
		const GROW_RAM = ns.getScriptRam('grow-once.js');
		const WEAKEN_RAM = ns.getScriptRam('weaken-once.js');
		this.batchRam = this.threads[G] * GROW_RAM;
		this.batchRam += this.threads[W1] * WEAKEN_RAM;
		this.batchRam += this.threads[W2] * WEAKEN_RAM;
		this.batchRam += this.threads[H] * HACK_RAM;

		// Calculate max concurrent batches (very rough arbitrary calculation)
		if (HGW_MODE)
			this.maxBatches = Math.ceil(Math.floor(this.times[W2] / (this.spacer * 3)));
		else
			this.maxBatches = Math.ceil(Math.floor(this.times[W2] / (this.spacer * 4)));

		// Calculate hackChance
		so.hackDifficulty = so.minDifficulty;
		this.hackChance = ns.formulas.hacking.hackChance(so, player);

		// Correct money by hack chance
		this.batchMoney *= this.hackChance;

		// Money vs ram ratio
		this.moneyPerRam = this.batchMoney / this.batchRam;

		// Max number of batches we can run in alloted memory
		const ram = new MemoryMap(ns, true);
		const MAX_RAM = ram.total;
		this.maxNetworkRam = MAX_RAM;

		let nbBatches = 0;
		for (let i = 0; i < this.maxBatches; i++) {
			if (ram.ReserveBlock(this.threads[H] * HACK_RAM) == undefined) break;
			if (!HGW_MODE)
				if (ram.ReserveBlock(this.threads[W1] * WEAKEN_RAM) == undefined) break;
			if (ram.ReserveBlock(this.threads[G] * GROW_RAM) == undefined) break;
			if (ram.ReserveBlock(this.threads[W2] * WEAKEN_RAM) == undefined) break;
			nbBatches++;
		}

		const maxBatchesInRam = nbBatches;
		// const maxBatchesInRam = Math.floor(this.maxNetworkRam / this.batchRam);

		this.maxRunnableBatches = Math.min(this.maxBatches, maxBatchesInRam);

		this.batchXp = 0;
		for (let i = 0; i < 4; i++) {
			this.jobXp[i] = this.threads[i] * ns.formulas.hacking.hackExp(so, player);
			this.batchXp += this.jobXp[i];
		}

		this.cashPerSecond = Math.ceil(this.batchMoney * this.maxRunnableBatches / (this.batchTime / 1000));
	}
}


export class SequentialMetrics {
	constructor(ns, server, pct) {
		// Params
		this.server = server;
		this.pct = pct;

		// Metrics
		this.times = new Array(0, 0, 0, 0);
		this.threads = new Array(0, 0, 0, 0);

		// Additional information
		this.maxRam = 0;
		this.cycleTime = 0;
		this.cycleMoney = 0;
		this.hackChance = 0;
		this.effectivePct = 0;

		this.cashPerSecond = 0;

		// Fill the data
		this.UpdateMetrics(ns);
	}

	Report(ns, minimalist = false) {
		if (minimalist) {
			let pct = Math.round(this.pct * 100).toString() + '%';
			let threads = this.threads.toString();
			let cps = FormatMoney(ns, Math.ceil(this.cycleMoney / (this.cycleTime / 1000)));
			let ram = ns.nFormat(this.maxRam * 1000000000, '0.00b');
			ns.print(pct.padEnd(6) + threads.padEnd(20) + cps.padEnd(12) + ram.padEnd(12));
			return;
		}

		ns.print('┌─────────────────────────────────────────────────────┐');
		let line = 'Sequential Metrics for ' + this.server + ' skimming ' + Math.round(this.pct * 100) + '%';
		ns.print('│ ' + line.padStart(52 / 2 + line.length / 2).padEnd(52) + '│');
		ns.print('├─────────────────────────────────────────────────────┤');
		line = 'RAM                     :  ' + ns.nFormat(Math.ceil(this.maxRam) * 1000000000, '0.00b');
		ns.print('│ ' + line.padEnd(52) + '│');
		line = '$                       :  ' + FormatMoney(ns, this.cycleMoney);
		ns.print('│ ' + line.padEnd(52) + '│');
		line = 'Time                    :  ' + ns.tFormat(this.cycleTime);
		ns.print('├─────────────────────────────────────────────────────┤');
		line = '$/s                     :  ' + FormatMoney(ns, Math.ceil(this.cycleMoney / (this.cycleTime / 1000)));
		ns.print('│ ' + line.padEnd(52) + '│');

		ns.print('├─────────────────────────────────────────────────────┤');
		ns.print('│ ' + ('HWGW threads : ' + this.threads).padEnd(52) + '│');
		ns.print('│ ' + ('HWGW times   : ' + this.times.map(p => Math.ceil(p))).padEnd(52) + '│');
		ns.print('└─────────────────────────────────────────────────────┘');
	}

	UpdateMetrics(ns) {
		if (!HasFormulas(ns)) {
			ns.tprint('ERROR: Formulas.exe is required.');
			return;
		}

		// Figure hack time and threads
		const so = ns.getServer(this.server);
		const player = ns.getPlayer();

		// Note current security weaken time
		this.currentStateWeakenTime = ns.formulas.hacking.weakenTime(so, player);

		// Set server to min difficulty, it's the state where all 4 ops start at
		so.hackDifficulty = so.minDifficulty;
		so.moneyAvailable = so.moneyMax;

		// Get the hack and grow times, those are fixed since we start at min security
		this.times[H] = ns.formulas.hacking.hackTime(so, player);
		this.times[G] = ns.formulas.hacking.growTime(so, player);

		// Figure first hack time and threads
		const hackPctThread = ns.formulas.hacking.hackPercent(so, player);
		this.threads[H] = Math.ceil(this.pct / hackPctThread);
		if (this.threads[H] == Infinity) this.threads[H] = 0;
		this.effectivePct = Math.min(hackPctThread * this.threads[H], 1 - 0.000001);
		this.cycleMoney = Math.floor(so.moneyAvailable * hackPctThread) * this.threads[H];

		so.moneyAvailable -= this.cycleMoney;
		so.hackDifficulty += this.threads[H] * 0.002; //ns.hackAnalyzeSecurity(this.threads[H]);
		this.times[W1] = ns.formulas.hacking.weakenTime(so, player);

		if (this.pct == 1) {
			this.effectivePct = 1 - 0.000001;
			so.moneyAvailable = 0;
		}

		// Figure first weaken time and threads
		this.threads[W1] = Math.ceil((so.hackDifficulty - so.minDifficulty) / 0.05 /*ns.weakenAnalyze(1, this.cores)*/);
		so.hackDifficulty = so.minDifficulty;

		if (isNaN(so.moneyAvailable)) {
			return;
		}
		//this.threads[G] = calculateGrowThreads(ns, so, player, this.cores);
		this.threads[G] = solveGrow(ns.formulas.hacking.growPercent(so, 1, player, 1), so.moneyAvailable, so.moneyMax);

		if (so.moneyAvailable == 0) so.moneyAvailable = 1;

		so.hackDifficulty += this.threads[G] * 0.004; //ns.growthAnalyzeSecurity(this.threads[G]);
		so.moneyAvailable = so.moneyMax;

		this.times[W2] = ns.formulas.hacking.weakenTime(so, player);

		// Figure second weaken time and threads
		this.threads[W2] = Math.ceil((so.hackDifficulty - so.minDifficulty) / 0.05 /*ns.weakenAnalyze(1, this.cores)*/);
		so.hackDifficulty = so.minDifficulty;

		// Make sure we have whole values of threads and times
		this.threads = this.threads.map(p => Math.ceil(p));
		this.times = this.times.map(p => Math.ceil(p));

		// Calculate batch time
		this.cycleTime = Math.ceil(this.times[H] + this.times[W2] + this.times[G] + this.times[W2]);

		// Calculate batch ram requirement
		const HACK_RAM = ns.getScriptRam('hack-once.js');
		const GROW_RAM = ns.getScriptRam('grow-once.js');
		const WEAKEN_RAM = ns.getScriptRam('weaken-once.js');
		this.maxRam = Math.max(this.threads[G] * GROW_RAM, this.threads[W1] * WEAKEN_RAM, this.threads[W2] * WEAKEN_RAM, this.threads[H] * HACK_RAM);

		// Calculate hackChance
		so.hackDifficulty = so.minDifficulty;
		this.hackChance = ns.formulas.hacking.hackChance(so, player);

		// Correct money by hack chance
		this.cycleMoney *= this.hackChance;

		this.cashPerSecond = Math.ceil(this.cycleMoney / (this.cycleTime / 1000));

		const MAX_RAM = new MemoryMap(ns, true).total;
		if (this.maxRam > MAX_RAM) {
			//ns.tprint('Zeroing metrics for ' + this.server);
			this.cashPerSecond = 0;
		}
		//this.Report(ns, ns.tprint);
	}
}

// export function calculateGrowThreads(ns, serverObject, playerObject, cores) {
// 	if (serverObject.moneyAvailable >= serverObject.moneyMax) return 0;
// 	let min = 1;

// 	// Use the flawed API to find a maximum value
// 	const growFactor = 1 / (1 - ((serverObject.moneyMax - 1) / serverObject.moneyMax));
// 	let max = Math.ceil(Math.log(growFactor) / Math.log(ns.formulas.hacking.growPercent(serverObject, 1, playerObject, cores)));

// 	let threads = binarySearchGrow(ns, min, max, serverObject, playerObject, cores);

// 	let newMoney = CalcGrowth(ns, serverObject, playerObject, threads, cores);
// 	let diff = (newMoney - serverObject.moneyMax);
// 	if (diff < 0)
// 		ns.tprint('FAIL: undershot by ' + diff);

// 	return threads;
// }

// function binarySearchGrow(ns, min, max, so, po, cores) {
// 	if (min == max) return max;
// 	let threads = Math.ceil(min + (max - min) / 2);

// 	let newMoney = CalcGrowth(ns, so, po, threads, cores);
// 	if (newMoney > so.moneyMax) {
// 		if (CalcGrowth(ns, so, po, threads - 1, cores) < so.moneyMax)
// 			return threads;
// 		return binarySearchGrow(ns, min, threads - 1, so, po, cores);
// 	}
// 	else if (newMoney < so.moneyMax) {
// 		return binarySearchGrow(ns, threads + 1, max, so, po, cores);
// 	}
// 	else {
// 		return threads;
// 	}
// }

// function CalcGrowth(ns, so, po, threads, cores) {
// 	let serverGrowth = ns.formulas.hacking.growPercent(so, threads, po, cores);
// 	return (so.moneyAvailable + threads) * serverGrowth;
// }

// Solve for number of growth threads required to get from money_lo to money_hi
// base is ns.formulas.hacking.growPercent(serverObject, 1, playerObject, cores)
export function solveGrow(base, money_lo, money_hi) {
	if (money_lo >= money_hi) { return 0; }

	let threads = 1000;
	let prev = threads;
	for (let i = 0; i < 30; ++i) {
		let factor = money_hi / Math.min(money_lo + threads, money_hi - 1);
		threads = Math.log(factor) / Math.log(base);
		if (Math.ceil(threads) == Math.ceil(prev)) { break; }
		prev = threads;
	}

	return Math.ceil(Math.max(threads, prev, 0));
}


export function MaxHackForServer(ns, server) {
	let so = ns.getServer(server);
	let po = ns.getPlayer();
	so.hackDifficulty = so.minDifficulty;
	const hackPctThread = ns.formulas.hacking.hackPercent(so, po);
	let ret = Math.ceil(1 / hackPctThread);
	if (ret == Infinity) ret = 0;
	//ns.tprint('Max threads for ' + server + ' is ' + ret);
	return ret;
}

export function GetBestMetricsForServer(ns, server, minThreads, maxThreads, maxNetworkRamPct, depth = DEPTH) {
	if (maxThreads == 0) return undefined;

	let STEP = (maxThreads - minThreads) / depth;
	// ns.tprint('');
	// ns.tprint('minThreads: ' + minThreads + ' maxThreads: ' + maxThreads + ' STEP: ' + STEP);
	let steps = new Set();
	for (let i = minThreads; i <= maxThreads; i += STEP)
		steps.add(Math.round(i));
	steps = [...steps];
	//ns.tprint('Steps: ' + steps);
	if (steps.length == 1) return steps[0];


	let bestMetrics = undefined;
	for (const threads of steps) {
		let pct = threads / MaxHackForServer(ns, server);
		const metrics = new Metrics(ns, server, pct, BATCH_SPACER, 1, maxNetworkRamPct)
		//ns.tprint('Trying pct: ' + (pct * 100).toFixed(2) + ' threads=' + threads + ' cps: ' + metrics.cashPerSecond);
		if (bestMetrics == undefined || metrics.cashPerSecond > bestMetrics.cashPerSecond) {
			bestMetrics = metrics;
		}
		else if (bestMetrics != undefined && metrics.cashPerSecond < bestMetrics.cashPerSecond * 0.95)
			break;

		//await ns.sleep(0);
	}

	if (STEP > 1) {
		//ns.tprint('WARN: Best threads yet for server is ' + bestMetrics.threads[H]);
		return GetBestMetricsForServer(ns, server, Math.max(Math.round(bestMetrics.threads[H] - STEP), minThreads), Math.min(Math.round(bestMetrics.threads[H] + STEP), maxThreads), maxNetworkRamPct);
	}

	return bestMetrics;
}

export function GetBestSequentialMetricsForServer(ns, server, minThreads, maxThreads, maxNetworkRamPct, depth = DEPTH) {
	if (maxThreads == 0) {
		//ns.tprint('max threads is 0');
		return undefined;
	}

	let STEP = (maxThreads - minThreads) / depth;
	// ns.tprint('');
	// ns.tprint('minThreads: ' + minThreads + ' maxThreads: ' + maxThreads + ' STEP: ' + STEP);
	let steps = new Set();
	for (let i = minThreads; i <= maxThreads; i += STEP)
		steps.add(Math.round(i));
	steps = [...steps];
	//ns.tprint('Steps: ' + steps);
	if (steps.length == 1) return steps[0];


	let bestMetrics = undefined;
	for (const threads of steps) {
		let pct = threads / MaxHackForServer(ns, server);
		const metrics = new SequentialMetrics(ns, server, pct);
		//ns.tprint('Trying pct: ' + (pct * 100).toFixed(2) + ' threads=' + threads + ' cps: ' + metrics.cashPerSecond);
		if (bestMetrics == undefined || metrics.cashPerSecond > bestMetrics.cashPerSecond) {
			if (metrics.cashPerSecond > 0)
				bestMetrics = metrics;
			else {
				//ns.tprint('shit metrics at ' + threads + ' threads')
			}
		}
		else if (bestMetrics != undefined && metrics.cashPerSecond < bestMetrics.cashPerSecond * 0.95)
			break;

		//await ns.sleep(0);
	}

	if (STEP > 1 && bestMetrics) {
		//ns.tprint('WARN: Best threads yet for server is ' + bestMetrics.threads[H]);
		return GetBestSequentialMetricsForServer(ns, server, Math.max(Math.round(bestMetrics.threads[H] - STEP), minThreads), Math.min(Math.round(bestMetrics.threads[H] + STEP), maxThreads), maxNetworkRamPct);
	}

	return bestMetrics;
}

export function AnalyzeAllServersSequential(ns, maxNetworkRamPct, verbose = true) {
	const data = new Array();
	const servers = GetAllServers(ns).filter(s => ns.getServer(s).hasAdminRights && ns.getServer(s).moneyMax > 0);

	if (verbose) ns.tprint('INFO: Getting metrics for ' + servers.length + ' servers');
	for (let server of servers) {
		let metrics = GetBestSequentialMetricsForServer(ns, server, 1, MaxHackForServer(ns, server), maxNetworkRamPct);
		if (metrics) {
			data.push(metrics);
		}
	}
	if (verbose) ns.tprint('SUCCESS: Done gathering metrics on ' + servers.length + ' servers');

	let sorted = data.sort((a, b) => b.cashPerSecond - a.cashPerSecond);

	if (verbose) {
		let tableData = [];
		const columns = [
			{ header: ' server', width: 20 },
			{ header: ' Hack %', width: 8 },
			{ header: '   $/sec', width: 9 },
			{ header: ' cycleTime', width: 25 },
			{ header: ' weakenTime', width: 25 },
			{ header: ' ram', width: 9 },
			{ header: ' threads', width: 25 },
		];

		for (let metrics of sorted) {
			tableData.push([
				{ color: 'white', text: ' ' + metrics.server },
				{ color: 'white', text: ((metrics.pct * 100).toFixed(2) + '%').padStart(7) },
				{ color: 'white', text: ns.nFormat(metrics.cashPerSecond, '0.0a').padStart(8) },
				{ color: 'white', text: ' ' + ns.tFormat(metrics.cycleTime) },
				{ color: 'white', text: ' ' + ns.tFormat(metrics.currentStateWeakenTime) },
				{ color: 'white', text: ' ' + ns.nFormat(Math.ceil(metrics.maxRam) * 1000000000, '0.0b').padStart(7) },
				{ color: 'white', text: ' ' + metrics.threads.toString().padStart(7) }
			]);
		}

		PrintTable(ns, tableData, columns, DefaultStyle(), ColorPrint);
	}

	return sorted;
}