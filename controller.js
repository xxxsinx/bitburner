import { AnalyzeAllServers } from 'metrics.js'
import { FormatMoney } from 'utils.js'
import { IsPrepped } from 'prep.js'
import { PrintTable, DefaultStyle } from 'tables.js'

const QmConfig = {
	MaxPreppingServers: 2,		// how many servers can be in prep simultaneously
	MaxBatchingServers: 1,		// how many servers can be batching at the same time
	MaxServers: 1,				// how many servers can be active at all times (if this is smaller than the two previous values, they will alternate as needed)
	ListMaxServers: 30,			// how many servers are analyzed. More trivial servers are dropped from the list.
	EvalDelay: 10 * 60 * 1000,	// frequency in ms that we re-evaluate the metrics on the server list
	LoopDelay: 5000,			// delay in the main loop
	MaxPrepingDepth: 30,		// This is how deep from the top of the server list we can allow prep
	MaxBatchingDepth: 30		// This is how deep from the top of the server list we can allow batching
};

const SERVER_STATES = {
	UNPREPPED: "UNPREPPED",
	PREPARING: "PREPPING",
	PREPPED: "READY",
	BATCHING: "BATCHING"
};

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	ns.resizeTail(1020, 620);
	//await ns.sleep(0);
	//ns.resizeTail(1080, 600);
	const qm = new QuarterMaster(ns, QmConfig.EvalDelay); // re-eval every 2 min

	// Config overrides
	const [prep, batch, max] = ns.args;
	if (prep && batch && max) {
		QmConfig.MaxPreppingServers = prep;
		QmConfig.MaxBatchingServers = batch;
		QmConfig.MaxServers = max;
	}

	while (true) {
		await qm.Dispatch();
		//ns.print('WARN: config: ' + JSON.stringify(QmConfig));
		//ns.print('INFO: Loop over, sleeping ' + Math.round(QmConfig.LoopDelay / 1000) + ' second');
		ns.print('');
		await ns.sleep(QmConfig.LoopDelay);
	}
}

export class QuarterMaster {
	constructor(ns, refreshTime) {
		this.ns = ns;
		this.refreshTime = refreshTime;
		this.lastRefresh = 0;
		this.topServers = undefined;
	}

	async Dispatch() {
		// Find top targets
		if (this.lastRefresh == 0 || Date.now() - this.lastRefresh > this.refreshTime) {
			this.ns.print('INFO: Re-evaluating top targets!');
			this.topServers = await this.GetTopServers(this.ns, QmConfig.ListMaxServers, 1);
			this.lastRefresh = Date.now();
		}

		// Determine the current state of all top servers
		for (const metrics of this.topServers) {
			// Check if prep is running for that server
			metrics.prepping = this.IsProcRunning('prep.js', metrics.server);
			// Check if batcher is running for that server
			metrics.batching = this.IsProcRunning('manager.js', metrics.server);

			if (metrics.batching)
				metrics.state = SERVER_STATES.BATCHING;
			else if (metrics.prepping)
				metrics.state = SERVER_STATES.PREPARING;
			else if (IsPrepped(this.ns, metrics.server))
				metrics.state = SERVER_STATES.PREPPED;
			else
				metrics.state = SERVER_STATES.UNPREPPED;
		}

		// Prep targets
		let nbPrepping = this.topServers.filter(p => p.prepping).length;
		let nbBatching = this.topServers.filter(p => p.batching).length;

		// Assign tasks
		let depth = 0;
		for (let metrics of this.topServers) {
			if (depth > QmConfig.MaxBatchingDepth) break;

			// Check if we can launch a batch cycle for this target
			if (metrics.batching == false && IsPrepped(this.ns, metrics.server) && nbBatching < QmConfig.MaxBatchingServers && nbPrepping + nbBatching < QmConfig.MaxServers) {
				this.ns.print('WARN: Launched manager for ' + metrics.server);

				//const ram = new MemoryMap(this.ns);
				//const ramRatio = ram.available / ram.total;
				const ramRatio = 1// / (QmConfig.MaxPreppingServers + QmConfig.MaxBatchingServers);

				this.ns.exec('manager.js', 'home', 1, metrics.server, ramRatio, false);

				metrics.state = SERVER_STATES.BATCHING;

				nbBatching++;
				continue;
			}

			depth++;
		}
		depth = 0;
		for (let metrics of this.topServers) {
			if (depth > QmConfig.MaxPrepingDepth) continue;
			depth++;

			if (metrics.batching) continue;
			if (metrics.prepping) continue;
			if (IsPrepped(this.ns, metrics.server)) continue;

			// Opportunistic prep: if the server is almost prepped, we dedicate a bit of resources to prepping it opportunistically
			const so = this.ns.getServer(metrics.server);
			const opportunisticPrep = so.hackDifficulty - so.minDifficulty < 5 || so.moneyAvailable / so.moneyMax >= 0.5;

			if (!opportunisticPrep) {
				if (nbPrepping >= QmConfig.MaxPreppingServers) continue;
				if (nbPrepping + nbBatching >= QmConfig.MaxServers) continue;
			}

			if (!opportunisticPrep)
				this.ns.print('WARN: Launched prep for ' + metrics.server);
			else
				this.ns.print('WARN: Launched opportunistic prep for ' + metrics.server);
			this.ns.exec('prep.js', 'home', 1, metrics.server);
			metrics.state = SERVER_STATES.PREPARING;

			if (!opportunisticPrep)
				nbPrepping++;
		}
		//this.ns.print('We now have ' + nbPrepping + ' servers in prep and ' + nbBatching + ' servers batching');

		let tableData = [];
		const columns = [
			{ header: ' Server', width: 20 },
			{ header: ' Hack %', width: 8 },
			{ header: '   $/sec', width: 9 },
			{ header: ' BatchTime', width: 25 },
			{ header: ' Cash', width: 6 },
			{ header: ' Sec', width: 5 },
			{ header: ' State', width: 12 }
		];

		for (let metrics of this.topServers) {
			let so = this.ns.getServer(metrics.server);

			let stateCol = 'white';
			switch (metrics.state) {
				case SERVER_STATES.UNPREPPED:
					stateCol = 'red';
					break;
				case SERVER_STATES.PREPARING:
					stateCol = 'yellow';
					break;
				case SERVER_STATES.PREPPED:
					stateCol = 'lime';
					break;
				case SERVER_STATES.BATCHING:
					stateCol = 'aqua';
					break;
			}

			tableData.push([
				{ color: 'white', text: ' ' + metrics.server },
				{ color: 'white', text: ((metrics.pct * 100).toFixed(2) + '%').padStart(7) },
				{ color: 'white', text: this.ns.nFormat(metrics.cashPerSecond, '0.0a').padStart(8) },
				{ color: 'white', text: ' ' + this.ns.tFormat(metrics.batchTime) },
				{ color: 'white', text: (Math.round(so.moneyAvailable / so.moneyMax * 100).toString() + '%').padStart(5) },
				{ color: 'white', text: (Math.round(so.hackDifficulty - so.minDifficulty).toString()).padStart(4) },
				{ color: stateCol, text: ' ' + metrics.state },
			]);
		}

		PrintTable(this.ns, tableData, columns, DefaultStyle(), this.ns.print);

		// Display report
		// this.ns.print('INFO: Server name'.padEnd(30) +
		// 	'$'.padEnd(15) +
		// 	'Security'.padEnd(25) +
		// 	'State'.padEnd(15));

		// for (let metrics of this.topServers) {
		// 	let so = this.ns.getServer(metrics.server);

		// 	let prefix = 'WARN: ';
		// 	if (!IsPrepped(this.ns, metrics.server) && metrics.state != 'BATCHING')
		// 		prefix = 'FAIL: ';

		// 	this.ns.print((prefix + metrics.server).padEnd(30) +
		// 		(Math.round(so.moneyAvailable / so.moneyMax * 100).toString()).padEnd(15) +
		// 		(Math.round(so.hackDifficulty - so.minDifficulty).toString()).padEnd(25) +
		// 		metrics.state);
		// }
	}

	IsProcRunning(scriptName, argument = undefined) {
		return this.ns.ps().find(p => p.filename == scriptName && (argument != undefined ? p.args.includes(argument) : true)) != undefined;
	}

	async GetTopServers(ns, count = QmConfig.ListMaxServers, maxNetworkRamPct = 0.5) {
		var data = await AnalyzeAllServers(ns, maxNetworkRamPct, false);
		return data.slice(0, Math.max(count, 0));
		// const data = new Array();
		// const servers = GetAllServers(this.ns).filter(s => this.ns.getServer(s).hasAdminRights && this.ns.getServer(s).moneyMax > 0);;
		// for (let server of servers) {
		// 	let subData = new Array();
		// 	for (let pct = 0.05; pct <= 0.95; pct += 0.05) {
		// 		const metrics = new Metrics(this.ns, server, Math.min(pct, 0.99), BATCH_SPACER, 1, maxNetworkRamPct)
		// 		// Skip stuff we can't hack
		// 		//if (metrics.hackChance >= 0.50)
		// 		if (metrics.cashPerSecond == undefined) continue;
		// 		subData.push(metrics);
		// 		await this.ns.sleep(0);
		// 	}

		// 	if (subData.length > 0) {
		// 		subData = subData.sort((a, b) => b.cashPerSecond - a.cashPerSecond);
		// 		data.push(subData[0]);
		// 	}
		// }

		// let sorted = data.sort((a, b) => b.cashPerSecond - a.cashPerSecond);
		// return sorted.slice(0, count);
	}
}