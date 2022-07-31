import { Metrics } from 'metrics.js'
import { GetAllServers } from 'utils.js'
import { IsPrepped, BatchSpacer, FormatMoney } from 'prep.js'
import { MemoryMap } from 'ram.js'

const QmConfig = new Object({
	MaxPreppingServers: 2,		// how many servers can be in prep simultaneously
	MaxBatchingServers: 2,		// how many servers can be batching at the same time
	MaxServers: 3,				// how many servers can be active at all times (if this is smaller than the two previous values, they will alternate as needed)
	ListMaxServers: 20,			// how many servers are analyzed. More trivial servers are dropped from the list.
	EvalDelay: 120 * 1000,		// frequency in ms that we re-evaluate the metrics on the server list
	LoopDelay: 1000,			// delay in the main loop
	MaxPrepingDepth: 20,		// This is how deep from the top of the server list we can allow prep
	MaxBatchingDepth: 30		// This is how deep from the top of the server list we can allow batching
});


const SERVER_STATES = Object.freeze({
	UNPREPPED: "not ready",
	PREPARING: "PREPPING",
	PREPPED: "ready",
	BATCHING: "BATCHING"
});

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');
	ns.tail();
	const qm = new QuarterMaster(ns, QmConfig.EvalDelay); // re-eval every 2 min
	while (true) {
		await qm.Dispatch();
		ns.print('INFO: Loop over, sleeping ' + Math.round(QmConfig.LoopDelay / 1000) + ' second');
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
			this.ns.print('INFO: Re-evaluating top targets');
			this.topServers = await this.GetTopServers(QmConfig.ListMaxServers, 1);
			this.lastRefresh = Date.now();

			this.ns.print('INFO: Top targets given the current memory available are as follow: ');
			for (let metrics of this.topServers) {
				this.ns.print('WARN: x ' + metrics.cashPerSecond);
				this.ns.print('WARN: x ' + metrics.batchMoney);
				this.ns.print('WARN: x ' + metrics.maxRunnableBatches);
				this.ns.print('WARN: x ' + metrics.batchTime);

				this.ns.print('INFO: ' + metrics.server.toString().padEnd(25) +
					(Math.round(metrics.pct * 100) + '%').padEnd(10) +
					(FormatMoney(this.ns, metrics.cashPerSecond) + '/s').padEnd(20) +
					this.ns.tFormat(metrics.batchTime).padEnd(30) +
					this.ns.tFormat(metrics.currentStateWeakenTime).padEnd(30));
			}
		}

		// TODO:
		// ?? kill any manager & children not handling a top?
		// ?? kill any prepper & children not handling a top?

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

		//this.ns.print('We had ' + nbPrepping + ' servers in prep and ' + nbBatching + ' servers batching');

		// Assign tasks
		let depth = 0;
		for (let metrics of this.topServers) {
			//if (metrics.server.startsWith('joes')) continue;

			// Check if we need to prep the target
			if (!metrics.batching && metrics.prepping == false && !IsPrepped(this.ns, metrics.server) && nbPrepping < QmConfig.MaxPreppingServers && nbPrepping + nbBatching < QmConfig.MaxServers && depth <= QmConfig.MaxPrepingDepth) {
				this.ns.print('WARN: Launched prep for ' + metrics.server);
				this.ns.exec('prep.js', 'home', 1, metrics.server);
				metrics.state = SERVER_STATES.PREPARING;
				nbPrepping++;
				continue;
			}

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
		//this.ns.print('We now have ' + nbPrepping + ' servers in prep and ' + nbBatching + ' servers batching');

		// Display report
		this.ns.print('INFO: Server name'.padEnd(30) +
			'$'.padEnd(15) +
			'Security'.padEnd(25) +
			'State'.padEnd(15));

		for (let metrics of this.topServers) {
			let so = this.ns.getServer(metrics.server);

			let prefix = 'WARN: ';
			if (!IsPrepped(this.ns, metrics.server))
				prefix = 'FAIL: ';

			this.ns.print((prefix + metrics.server).padEnd(30) +
				(Math.round(so.moneyAvailable / so.moneyMax * 100).toString()).padEnd(15) +
				(Math.round(so.hackDifficulty - so.minDifficulty).toString()).padEnd(25) +
				metrics.state);
		}
	}

	IsProcRunning(scriptName, argument = undefined) {
		return this.ns.ps().find(p => p.filename == scriptName && (argument != undefined ? p.args.includes(argument) : true)) != undefined;
	}

	async GetTopServers(count = QmConfig.ListMaxServers, maxNetworkRamPct = 0.5) {
		const data = new Array();
		const servers = GetAllServers(this.ns).filter(s => this.ns.hasRootAccess(s) && this.ns.getServerMaxMoney(s) > 0);;
		for (let server of servers) {
			let subData = new Array();
			for (let pct = 0.05; pct <= 0.95; pct += 0.05) {
				const metrics = new Metrics(this.ns, server, Math.min(pct, 0.99), BatchSpacer(), 1, maxNetworkRamPct)
				// Skip stuff we can't hack
				//if (metrics.hackChance >= 0.50)
				if (metrics.cashPerSecond == undefined) continue;
				subData.push(metrics);
				await this.ns.sleep(0);
			}

			if (subData.length > 0) {
				subData = subData.sort((a, b) => b.cashPerSecond - a.cashPerSecond);
				data.push(subData[0]);
			}
		}

		let sorted = data.sort((a, b) => b.cashPerSecond - a.cashPerSecond);
		return sorted.slice(0, count);
	}
}