//this.hackDifficulty -= amt * BitNodeMultipliers.ServerWeakenRate;

import { BatchSpacer, FormatMoney } from "prep.js";
import { MemoryMap } from "ram.js";
import { GetAllServers } from "utils.js";
import { PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

const H = 0;	// Index of HACK data
const W1 = 1;	// Index of first WEAKEN data
const G = 2;	// Index of GROW data
const W2 = 3;	// Index of second WEAKEN data

export let HGW_MODE = false;

const LEECH = [
	0.01, 0.02, 0.03, 0.4, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.60, 0.65, 0.7, 0.75, 0.85, 0.90, 0.95
];

const EXTRA_THREAD_FACTOR = 1;		// Apply this factor to GROW and WEAKEN thread calculations, not used right now
const MIN_EXTRA_THREADS = 0;		// Add this many extra threads to GROW and WEAKEN thread calculations

/** @param {NS} ns **/
export async function main(ns) {
	let start = performance.now();

	if (!ns.fileExists('Formulas.exe')) {
		ns.tprint('ERROR: Formulas.exe not found, running this command would take years, aborting.');
		ns.exit();
	}

	// args[0] : max total network ram percentage
	// args[1] : server name to analyze (if empty, do a full server list report)
	let [server, maxNetworkRamPct = 1, HGW] = ns.args;
	if (HGW != undefined)
		HGW_MODE = HGW;

	// This is a test to compare different grow thread calculation methods
	if (server == 'grow') {
		for (let server of GetAllServers(ns).filter(s => ns.getServerMaxMoney(s) > 0 /*&& ns.hasRootAccess(s)*/).sort(s => ns.getServerMaxMoney(s))) {
			//			try {
			let so = ns.getServer(server);
			//if (so.minDifficulty > 99) continue;
			let metrics = new Metrics(ns, server, 1, 30, 1);

			let w = metrics.threads[G];
			let b = metrics.debugThreadsG;

			let pct = Math.round(b * 100 / w) - 100;

			ns.tprint(server.padEnd(25) + ('formula: ' + metrics.debugThreadsG).padEnd(25) + (' Lambert: ' + metrics.threads[G]).padEnd(25) + ' %: ' + pct.toString().padStart(4));
			//metrics.Report(ns, ns.tprint);
			await ns.sleep(0);
			// }
			// catch (e) {
			// 	ns.tprint('FAIL: Exception --- ' + e)

			// } 
		}
		return;
	}

	if (server == undefined) {
		await AnalyzeAllServers(ns, maxNetworkRamPct);
		ns.tprint('Executed in ' + Math.ceil(performance.now() - start) + ' milliseconds');
		return;
	}
	else {
		let results = [];

		for (const pct of LEECH) {
			let metrics = new Metrics(ns, server, pct, BatchSpacer(), 1, 1);
			//metrics.Report(ns, ns.tprint);
			results.push(metrics);
			await ns.sleep(0);
		}

		let bestPct = await GetBestPctForServer(ns, server, BatchSpacer(), 0.05, 1, 0.05, 1);

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
			{ header: ' Cycle time', width: 25 }
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
			pctH = pctH2;//(pctH + pctH2) / 2;
			tableData.push([
				{ color: bestPct == metrics.pct ? 'lime' : 'white', text: ((metrics.pct * 100).toFixed(2) + '% ').padStart(server.length + 1) },
				{ color: 'white', text: ns.nFormat(metrics.cashPerSecond, '0.000a').padStart(9) },
				{ color: 'white', text: ns.nFormat(Math.ceil(metrics.batchRam) * 1000000000, '0.0b').padStart(9) },
				{ color: 'white', text: (metrics.maxRunnableBatches + '/' + metrics.maxBatches).padStart(11) },
				{ color: metrics.maxRunnableBatches == 0 ? 'red' : 'lime', text: metrics.maxRunnableBatches == 0 ? ' Not enough RAM available!' : '$/sec'.padStart(6) + ' '.padEnd(pctOfMax / 4 + 2, barchar) },
				{ color: 'orange', text: 'H ' + metrics.threads[H].toString().padStart(7) + ' '.padEnd(pctH / 4 + 2, barchar) },
				{ color: 'white', text: ns.nFormat(metrics.batchMoney * metrics.maxRunnableBatches, '0.0a').padStart(8) },
				{ color: 'white', text: ' ' + ns.tFormat(metrics.batchTime + BatchSpacer() * metrics.maxRunnableBatches).padStart(9) }
			]);

			pctOfMax = Math.round(metrics.maxRunnableBatches / batches[ramorder.length - 1].maxRunnableBatches * 100);

			let pctG = Math.round(metrics.threads[G] / maxG * 100);
			let pctG2 = Math.round(metrics.threads[G] / maxThreads * 100);
			pctG = pctG2;	//(pctG + pctG2) / 2;
			tableData.push([
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'white', text: '' },
				{ color: 'orange', text: metrics.maxRunnableBatches == 0 ? '' : 'Count'.padStart(6) + ' '.padEnd(pctOfMax / 4 + 2, barchar) },
				{ color: 'lime', text: 'G ' + metrics.threads[G].toString().padStart(7) + ' '.padEnd(pctG / 4 + 2, barchar) },
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
				{ color: '#4488FF', text: 'W ' + weakenThreadsText.padStart(7) + ' '.padEnd(pctW / 4 + 2, barchar) },
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

export async function GetBestPctForServer(ns, server, spacer = BatchSpacer(), minPct = 0.05, maxPct = 1, step = 0.05, maxNetworkRamPct) {
	let bestPct = 0;
	let bestCps = 0;

	for (const pct of LEECH) { //= minPct; pct <= maxPct; pct += step) {
		const metrics = new Metrics(ns, server, pct, spacer, 1, maxNetworkRamPct)
		if (metrics.cashPerSecond > bestCps) {
			bestPct = pct;
			bestCps = metrics.cashPerSecond;
		}
		await ns.sleep(0);
	}

	return bestPct;
}

async function AnalyzeAllServers(ns, maxNetworkRamPct) {
	const data = new Array();
	const servers = GetAllServers(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxMoney(s) > 0);

	ns.tprint('INFO: Getting metrics for ' + servers.length + ' servers');
	for (let server of servers) {
		let subData = new Array();
		for (const pct of LEECH) {
			const metrics = new Metrics(ns, server, pct, BatchSpacer(), 1, maxNetworkRamPct)
			// Skip stuff we can't hack
			if (metrics.hackChance >= 0.50 && metrics.cashPerSecond > 0)
				subData.push(metrics);
			await ns.sleep(0);
		}

		if (subData.length > 0) {
			subData = subData.sort(RatioSort);
			data.push(subData[0]);
		}
	}
	ns.tprint('SUCCESS: Done gathering metrics on ' + servers.length + ' servers');

	let sorted = data.sort(RatioSort);
	function RatioSort(a, b) {
		const ra = a.cashPerSecond;
		const rb = b.cashPerSecond;

		return rb - ra;
	}

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
			{ color: 'white', text: (Math.round(metrics.pct * 100) + '%').padStart(7) },
			{ color: 'white', text: ns.nFormat(metrics.cashPerSecond, '0.0a').padStart(8) },
			{ color: 'white', text: ' ' + ns.tFormat(metrics.batchTime) },
			{ color: 'white', text: ' ' + ns.tFormat(metrics.currentStateWeakenTime) }
		]);
	}

	PrintTable(ns, tableData, columns, DefaultStyle(), ColorPrint);
}

export class Metrics {
	constructor(ns, server, pct, spacer, cores = 1, maxNetworkRamPct = 1) {
		// Params
		this.server = server;
		this.pct = pct;
		this.spacer = spacer;
		this.cores = cores;
		this.maxNetworkRamPct = maxNetworkRamPct;
		this.maxNetworkRam = undefined;

		// Metrics
		this.times = new Array(undefined, undefined, undefined, undefined);
		this.threads = new Array(undefined, undefined, undefined, undefined);

		// Calculated values
		this.delays = new Array(undefined, undefined, undefined, undefined);
		this.ends = new Array(undefined, undefined, undefined, undefined);

		// Additional information
		this.batchRam = undefined;
		this.batchTime = undefined;
		this.batchMoney = undefined;
		this.hackChance = undefined;
		this.effectivePct = undefined;
		this.moneyPerRam = undefined;
		this.maxRunnableBatches = undefined;

		// Fill the data
		this.UpdateMetrics(ns);
	}

	// Experimental code, not working as intended yet
	// Visualize(ns, graphLen) {
	// 	let prefix = 'W..W';
	// 	let suffix = 'H.W.G.W.';

	// 	let len = graphLen - prefix.length - suffix.length;

	// 	let ret = prefix;
	// 	for (let i = 0; i < len; i++)
	// 		ret += '.';

	// 	ret += suffix;

	// 	let nbSlice = this.batchTime / this.spacer;
	// 	let ratio = nbSlice / graphLen;

	// 	let gPos = Math.round(this.delays[G] / this.spacer / ratio);
	// 	let hPos = Math.round(this.delays[H] / this.spacer / ratio);

	// 	ret = SetCharAt(ret, gPos, 'G');
	// 	ret = SetCharAt(ret, hPos, 'H');

	// 	return ret;
	// }

	Report(ns, printfunc = ns.print, minimalist = false) {
		if (minimalist) {
			let pct = Math.round(this.pct * 100).toString() + '%';
			let threads = this.threads.toString();
			let cps = FormatMoney(ns, Math.ceil(this.batchMoney * this.maxRunnableBatches / (this.batchTime / 1000)));
			let ram = ns.nFormat(Math.ceil(this.maxRunnableBatches * this.batchRam) * 1000000000, '0.00b');
			let batchRam = ns.nFormat(Math.ceil(this.batchRam) * 1000000000, '0.00b');
			printfunc(pct.padEnd(6) + threads.padEnd(20) + cps.padEnd(12) + ram.padEnd(12) + batchRam.padEnd(12));
			return;
		}

		printfunc('┌─────────────────────────────────────────────────────┐');
		let line = 'Metrics for ' + this.server + ' skimming ' + Math.round(this.pct * 100) + '%';
		printfunc('│ ' + line.padStart(52 / 2 + line.length / 2).padEnd(52) + '│');
		printfunc('├─────────────────────────────────────────────────────┤');
		line = 'RAM                     :  ' + ns.nFormat(Math.ceil(this.batchRam) * 1000000000, '0.00b');
		printfunc('│ ' + line.padEnd(52) + '│');
		line = '$                       :  ' + FormatMoney(ns, this.batchMoney);
		printfunc('│ ' + line.padEnd(52) + '│');
		line = 'Time                    :  ' + ns.tFormat(this.batchTime);
		printfunc('├─────────────────────────────────────────────────────┤');
		printfunc('│ ' + line.padEnd(52) + '│');
		line = 'Max Count               :  ' + this.maxBatches;
		printfunc('│ ' + line.padEnd(52) + '│');
		line = '$/RAM                   :  ' + FormatMoney(ns, this.moneyPerRam);
		printfunc('│ ' + line.padEnd(52) + '│');
		line = 'Max in allowed ram      :  ' + this.maxRunnableBatches;
		printfunc('│ ' + line.padEnd(52) + '│');
		printfunc('├─────────────────────────────────────────────────────┤');
		line = 'Cycle profit            :  ' + FormatMoney(ns, this.batchMoney * this.maxRunnableBatches);
		printfunc('│ ' + line.padEnd(52) + '│');
		line = 'Cycle RAM               :  ' + ns.nFormat(Math.ceil(this.maxRunnableBatches * this.batchRam) * 1000000000, '0.00b');
		printfunc('│ ' + line.padEnd(52) + '│');
		line = '$/s                     :  ' + FormatMoney(ns, Math.ceil(this.batchMoney * this.maxRunnableBatches / (this.batchTime / 1000)));
		printfunc('│ ' + line.padEnd(52) + '│');

		printfunc('├─────────────────────────────────────────────────────┤');
		if (HGW_MODE) {
			printfunc('│ ' + ('HGW times   : ' + this.times.map(p => Math.ceil(p))).padEnd(52) + '│');
			printfunc('│ ' + ('HGW threads : ' + this.threads).padEnd(52) + '│');
			printfunc('│ ' + ('HGW delays  : ' + this.delays).padEnd(52) + '│');
			printfunc('│ ' + ('HGW ends    : ' + this.ends).padEnd(52) + '│');
		}
		else {
			printfunc('│ ' + ('HWGW times   : ' + this.times.map(p => Math.ceil(p))).padEnd(52) + '│');
			printfunc('│ ' + ('HWGW threads : ' + this.threads).padEnd(52) + '│');
			printfunc('│ ' + ('HWGW delays  : ' + this.delays).padEnd(52) + '│');
			printfunc('│ ' + ('HWGW ends    : ' + this.ends).padEnd(52) + '│');
		}

		//printfunc('│ ' + ('Lambert G    : ' + this.debugThreadsG).padEnd(52) + '│');
		//printfunc('│ ' + ('FISH delays  : ' + this.fishDelays).padEnd(52) + '│');
		//printfunc('│ ' + ('Period       : ' + this.period).padEnd(52) + '│');
		//printfunc('│ ' + ('Depth        : ' + this.depth).padEnd(52) + '│');
		//printfunc('│ ' + this.Visualize(ns, 51).padEnd(52) + '│');
		printfunc('└─────────────────────────────────────────────────────┘');
	}

	UpdateMetrics(ns) {
		if (!ns.fileExists('Formulas.exe')) {
			ns.tprint('ERROR: Formulas.exe is required.');
			return;
		}

		//const mults = ns.getBitNodeMultipliers();
		//ns.tprint('mults.ScriptHackMoney     : ' + mults.ScriptHackMoney);     // Influences how much the money on a server can be reduced when a script performs a hack against it.
		//ns.tprint('mults.ScriptHackMoneyGain : ' + mults.ScriptHackMoneyGain); // Influences how much of the money stolen by a scripted hack will be added to the player's money.
		//ns.tprint('mults.ServerGrowthRate    : ' + mults.ServerGrowthRate);    // Influences the growth percentage per cycle against a server.
		//ns.tprint('mults.ServerWeakenRate    : ' + mults.ServerWeakenRate);    // Influences the weaken amount per invocation against a server.

		// ServerMaxMoney               => 0.2
		// ServerStartingMoney          => 0.2
		// HackingLevelMultiplier       => 0.8


		// ServerGrowthRate             => 0.2
		// ScriptHackMoney              => 0.2

		// Emptying 100% is a mess lets avoid it
		//if (this.pct >= 1) this.pct = 0.99;

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
		this.threads[H] = Math.floor(this.pct / hackPctThread);
		this.effectivePct = Math.min(hackPctThread * this.threads[H], 1 - 0.000001);
		this.batchMoney = Math.floor(so.moneyAvailable * hackPctThread) * this.threads[H];// * mults.ScriptHackMoney;//* mults.ScriptHackMoneyGain;
		//this.batchMoney = Math.floor(so.moneyAvailable * hackPctThread * mults.ScriptHackMoney * mults.ScriptHackMoneyGain) * this.threads[H];

		so.moneyAvailable -= this.batchMoney;
		//if (so.moneyAvailable == 0) so.moneyAvailable = 1;
		so.hackDifficulty += ns.hackAnalyzeSecurity(this.threads[H]);

		if (this.pct == 1) {
			this.effectivePct = 1 - 0.000001;
			so.moneyAvailable = 0;
		}

		// Figure first weaken time and threads
		this.threads[W1] = Math.ceil((so.hackDifficulty - so.minDifficulty) / ns.weakenAnalyze(1, this.cores) /*/ mults.ServerWeakenRate*/);
		{
			let extraThreads = Math.ceil(this.threads[W1] * (EXTRA_THREAD_FACTOR - 1));
			if (extraThreads < MIN_EXTRA_THREADS) extraThreads = EXTRA_THREAD_FACTOR;
			this.threads[W1] += extraThreads;
		}
		if (!HGW_MODE)
			so.hackDifficulty = so.minDifficulty;

		//ns.tprint('calculateGrowThreads on ' + so.hostname + ' cores: ' + this.cores + ' so.moneyAvailable: ' + so.moneyAvailable);
		if (isNaN(so.moneyAvailable)) {
			//ns.tprint('ERROR: ??? isNaN(so.moneyAvailable) ??? ' + this.batchMoney);
			//if (this.pct == 0.05)
			//	this.Report(this.ns, ns.tprint);
			return;
		}
		// if (this.pct < 0.95) {
		// 	// Figure grow time and threads
		// 	const growFactor = 1 / (1 - this.effectivePct);
		// 	this.threads[G] = Math.ceil(Math.log(growFactor) / Math.log(ns.formulas.hacking.growPercent(so, 1, player, this.cores)));
		// }
		// else
		this.threads[G] = calculateGrowThreads(ns, so, player, this.cores, so.moneyAvailable);

		// Figure grow time and threads
		const growFactor = 1 / (1 - ((so.moneyMax-0.01)/so.moneyMax));
		//this.threads[G] = Math.ceil(Math.log(growFactor) / Math.log(ns.formulas.hacking.growPercent(so, 1, player, this.cores)/* / mults.ServerGrowthRate)*/));
		this.debugThreadsG = Math.ceil(Math.log(growFactor) / Math.log(ns.formulas.hacking.growPercent(so, 1, player, this.cores)/* / mults.ServerGrowthRate)*/));
		// this.debugThreads2 = calculateGrowThreads(ns, this.server, player, 1, so.moneyAvailable);

		// let opts = {
		// 	moneyAvailable: so.moneyAvailable,
		// 	hackDifficulty: so.minDifficulty,
		// 	ServerGrowthRate: ns.getBitNodeMultipliers().ServerGrowthRate
		// };
		// this.threads[G] = calculateGrowThreadsLambert(ns, so.hostname, so.moneyMax - so.moneyAvailable, 1, opts);
		//this.debugThreadsG = calculateGrowThreadsLambert(ns, so.hostname, so.moneyMax - so.moneyAvailable, 1, opts);

		// // *** ALTERNATE GROW ***
		// let growThreads = 1;
		// while (true) {
		// 	let growPct = ns.formulas.hacking.growPercent(so, growThreads, player, this.cores);
		// 	if (growPct > this.effectivePct)
		// 		break;
		// 	growThreads++;
		// 	if (growThreads > 100000) {
		// 		//ns.tprint('FAIL: We got over 100k threads');
		// 		break;
		// 	}
		// }

		// //if (growThreads < 100000)
		// //ns.tprint('WARN: Looks like we might need ' + growThreads + ' grow threads, maybe vs ' + this.threads[G]);

		// // let numHackThreads = 1;
		// // const growPerHackRatio = ns.growthAnalyze(server, 1 + ns.hackAnalyze(server, 1) * 2);
		// // const hackPerGrowCycle = ns.getGrowTime(server) / ns.getHackTime(server);
		// // let numGrowThreads = Math.ceil(numHackThreads * growPerHackRatio * hackPerGrowCycle); 

		// // *** ALTERNATE GROW ***

		{
			let extraThreads = Math.ceil(this.threads[G] * (EXTRA_THREAD_FACTOR - 1));
			if (extraThreads < MIN_EXTRA_THREADS) extraThreads = MIN_EXTRA_THREADS;
			this.threads[G] += extraThreads;
		}
		so.hackDifficulty += ns.growthAnalyzeSecurity(this.threads[G]);
		so.moneyAvailable = so.moneyMax;

		// Figure second weaken time and threads
		this.threads[W2] = Math.ceil((so.hackDifficulty - so.minDifficulty) / ns.weakenAnalyze(1, this.cores) /*/ mults.ServerWeakenRate*/);
		{
			let extraThreads = Math.ceil(this.threads[W2] * (EXTRA_THREAD_FACTOR - 1));
			if (extraThreads < MIN_EXTRA_THREADS) extraThreads = MIN_EXTRA_THREADS;
			this.threads[W2] += extraThreads;
		}
		so.hackDifficulty = so.minDifficulty;

		// Make sure we have whole values of threads and times
		this.threads = this.threads.map(p => Math.ceil(p));
		this.times = this.times.map(p => Math.ceil(p));

		if (HGW_MODE) {
			this.threads[W1] = 0;
			this.times[W1] = 0;

			this.delays[H] = this.times[W2] - this.spacer * 2 - this.times[H];
			this.delays[W1] = 0;
			this.delays[G] = this.times[W2] + this.spacer - this.times[G];
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
		if (HGW_MODE) {
			this.maxBatches = Math.ceil(Math.floor(this.times[W2] / (this.spacer * 3)));
			//this.maxBatches = Math.ceil(this.times[W2] / 0.1875);
			//if (this.maxBatches * 3 > 9500) this.maxBatches = Math.ceil(9500 / 3);
		}
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
		this.maxNetworkRam = ram.total * this.maxNetworkRamPct;

		// let nbBatches = 0;
		// for (let i = 0; i < this.maxBatches; i++) {
		// 	if (ram.ReserveBlock(this.threads[H] * HACK_RAM) == undefined) break;
		// 	if (!HGW_MODE)
		// 		if (ram.ReserveBlock(this.threads[W1] * WEAKEN_RAM) == undefined) break;
		// 	if (ram.ReserveBlock(this.threads[G] * GROW_RAM) == undefined) break;
		// 	if (ram.ReserveBlock(this.threads[W2] * WEAKEN_RAM) == undefined) break;
		// 	nbBatches++;
		// }

		// const maxBatchesInRam = nbBatches; //Math.floor(this.maxNetworkRam / this.batchRam);
		const maxBatchesInRam = Math.floor(this.maxNetworkRam / this.batchRam);

		this.maxRunnableBatches = Math.min(this.maxBatches, maxBatchesInRam);

		this.cashPerSecond = Math.ceil(this.batchMoney * this.maxRunnableBatches / (this.batchTime / 1000));

		//this.DoTheMagic(ns);
	}

	// CalculateStalefishDelays(ns) {
	// 	// Figure hack time and threads
	// 	const so = ns.getServer(this.server);
	// 	const player = ns.getPlayer();

	// 	// Set server to min difficulty, it's the state where all 4 ops start at
	// 	so.hackDifficulty = so.minDifficulty;

	// 	// Get the times, those are fixed since we start at X security
	// 	this.times[H] = ns.formulas.hacking.hackTime(so, player);
	// 	this.times[W1] = ns.formulas.hacking.weakenTime(so, player);
	// 	this.times[G] = ns.formulas.hacking.growTime(so, player);
	// 	this.times[W2] = ns.formulas.hacking.weakenTime(so, player);

	// 	this.period = 0;
	// 	this.depth = 0;

	// 	const kW_max = Math.floor(1 + (this.times[W1] - 4 * BatchSpacer()) / (8 * BatchSpacer()));
	// 	schedule: for (let kW = kW_max; kW >= 1; --kW) {
	// 		const t_min_W = (this.times[W1] + 4 * BatchSpacer()) / kW;
	// 		const t_max_W = (this.times[W1] - 4 * BatchSpacer()) / (kW - 1);
	// 		const kG_min = Math.ceil(Math.max((kW - 1) * 0.8, 1));
	// 		const kG_max = Math.floor(1 + kW * 0.8);
	// 		for (let kG = kG_max; kG >= kG_min; --kG) {
	// 			const t_min_G = (this.times[G] + 3 * BatchSpacer()) / kG
	// 			const t_max_G = (this.times[G] - 3 * BatchSpacer()) / (kG - 1);
	// 			const kH_min = Math.ceil(Math.max((kW - 1) * 0.25, (kG - 1) * 0.3125, 1));
	// 			const kH_max = Math.floor(Math.min(1 + kW * 0.25, 1 + kG * 0.3125));
	// 			for (let kH = kH_max; kH >= kH_min; --kH) {
	// 				const t_min_H = (this.times[H] + 5 * BatchSpacer()) / kH;
	// 				const t_max_H = (this.times[H] - 1 * BatchSpacer()) / (kH - 1);
	// 				const t_min = Math.max(t_min_H, t_min_G, t_min_W);
	// 				const t_max = Math.min(t_max_H, t_max_G, t_max_W);
	// 				if (t_min <= t_max) {
	// 					this.period = Math.round(t_min);
	// 					this.depth = Math.floor(kW);
	// 					break schedule;
	// 				}
	// 			}
	// 		}
	// 	}

	// 	this.fishDelays = [];
	// 	this.fishDelays[H] = Math.round(this.depth * this.period - 4 * BatchSpacer() - this.times[H]);
	// 	this.fishDelays[W1] = Math.round(this.depth * this.period - 3 * BatchSpacer() - this.times[W1]);
	// 	this.fishDelays[G] = Math.round(this.depth * this.period - 2 * BatchSpacer() - this.times[G]);
	// 	this.fishDelays[W2] = Math.round(this.depth * this.period - 1 * BatchSpacer() - this.times[W2]);
	// }
}

export function calculateGrowThreads(ns, serverObject, playerObject, cores, startMoney) {
	let threads = 1;
	let newMoney = 0;

	while (true) {
		let serverGrowth = ns.formulas.hacking.growPercent(serverObject, threads, playerObject, cores);
		newMoney = (serverObject.moneyAvailable + threads) * serverGrowth;
		if (newMoney >= serverObject.moneyMax)
			break;
		threads++;
	}

	return threads;
}

// function SetCharAt(str, index, chr) {
// 	if (index > str.length - 1) return str;
// 	return str.substring(0, index) + chr + str.substring(index + 1);
// }



/**
 * @author m0dar <gist.github.com/xmodar>
 * {@link https://discord.com/channels/415207508303544321/415211780999217153/954213342917050398}
 *
 * type GrowOptions = Partial<{
 *   moneyAvailable: number;
 *   hackDifficulty: number;
 *   ServerGrowthRate: number; // ns.getBitNodeMultipliers().ServerGrowthRate
 *   // https://github.com/danielyxie/bitburner/blob/dev/src/BitNode/BitNode.tsx
 * }>;
 */
export function calculateGrowGain(ns, host, threads = 1, cores = 1, opts = {}) {
	const moneyMax = ns.getServerMaxMoney(host);
	const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
	const rate = growPercent(ns, host, threads, cores, opts);
	return Math.min(moneyMax, rate * (moneyAvailable + threads)) - moneyAvailable;
}

/** @param gain money to be added to the server after grow */
export function calculateGrowThreadsLambert(ns, host, gain, cores = 1, opts = {}) {
	const moneyMax = ns.getServerMaxMoney(host);
	const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
	const money = Math.min(Math.max(moneyAvailable + gain, 0), moneyMax);
	const rate = Math.log(growPercent(ns, host, 1, cores, opts));
	const logX = Math.log(money * rate) + moneyAvailable * rate;
	const threads = lambertWLog(logX) / rate - moneyAvailable;
	return Math.max(Math.ceil(threads), 0);
}

function growPercent(ns, host, threads = 1, cores = 1, opts = {}) {
	const { ServerGrowthRate = 1, hackDifficulty = ns.getServerSecurityLevel(host), } = opts;
	const growth = ns.getServerGrowth(host) / 100;
	const multiplier = ns.getPlayer().mults["hacking_grow"];
	const base = Math.min(1 + 0.03 / hackDifficulty, 1.0035);
	const power = growth * ServerGrowthRate * multiplier * ((cores + 15) / 16);
	return base ** (power * threads);
}
/**
 * Lambert W-function for log(x) when k = 0
 * {@link https://gist.github.com/xmodar/baa392fc2bec447d10c2c20bbdcaf687}
 */
function lambertWLog(logX) {
	if (isNaN(logX)) return NaN;
	const logXE = logX + 1;
	const logY = 0.5 * log1Exp(logXE);
	const logZ = Math.log(log1Exp(logY));
	const logN = log1Exp(0.13938040121300527 + logY);
	const logD = log1Exp(-0.7875514895451805 + logZ);
	let w = -1 + 2.036 * (logN - logD);
	w *= (logXE - Math.log(w)) / (1 + w);
	w *= (logXE - Math.log(w)) / (1 + w);
	w *= (logXE - Math.log(w)) / (1 + w);
	return isNaN(w) ? (logXE < 0 ? 0 : Infinity) : w;
}

const log1Exp = (x) => x <= 0 ? Math.log(1 + Math.exp(x)) : x + log1Exp(-x);