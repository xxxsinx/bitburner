import { GetAllServers } from "utils.js";
import { pctColor, PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

/** @param {NS} ns **/
export async function main(ns) {

	const columns = [
		{ header: ' Server', width: 22 },
		{ header: '    Total', width: 10 },
		{ header: '     Used', width: 15 },
		{ header: '     Free', width: 15 },
		{ header: ' Weaken', width: 8 },
		{ header: '   Grow', width: 8 },
		{ header: '   Hack', width: 8 },
		{ header: '  Share', width: 8 },
		{ header: ' Charge', width: 8 },
		{ header: '  Other', width: 8 },
		{ header: ' Scripts', width: 9 }
	];

	let data = [];
	let servers = GetAllServers(ns).filter(s => ns.getServer(s).hasAdminRights && !s.startsWith('hacknet-node-')).sort((a, b) => ns.getServer(b).maxRam - ns.getServer(a).maxRam);
	let details = [];
	let totalProcs = 0;

	if (ns.args.length == 0) {
		for (const server of servers) {
			if (ns.getServer(server).maxRam < 1.6) continue;

			let total = ns.getServer(server).maxRam;
			let used = ns.getServer(server).ramUsed;
			let free = total - used;
			let usedPct = Math.round(used / total * 100);
			let freePct = Math.round(free / total * 100);

			let entry = [
				{ color: 'white', text: ' ' + server },
				{ color: 'white', text: ns.nFormat(total * 1e9, '0.00b').padStart(9) },
				{ color: pctColor(1 - (usedPct / 100)), text: ns.nFormat(used * 1e9, '0.00b').padStart(9) + (usedPct.toFixed(0) + '%').padStart(5) },
				{ color: pctColor(freePct / 100), text: ns.nFormat(free * 1e9, '0.00b').padStart(9) + (freePct.toFixed(0) + '%').padStart(5) }
			];

			let [procs, nbProcs] = GetProcessDetails(ns, server);
			details.push(procs);
			procs.forEach(function (s) {
				entry.push(
					{ color: pctColor(1 - (s.percent / 100)), text: s.percent > 0 ? (s.percent.toFixed(0) + '%').padStart(7) : '' }
				)
			});

			totalProcs += nbProcs;
			entry.push({ color: 'white', text: nbProcs.toString().padStart(8) });

			data.push(entry);
		}
	}
	else {
		let home = servers.filter(s => s == 'home');
		let personals = ns.getPurchasedServers();
		//let hashnet = servers.filter(s => s.startsWith('hacknet-node-'));
		let network = servers.filter(s => s != 'home' && !personals.includes(s) /*&& !hashnet.includes(s)*/);

		const cats = [
			{ desc: ' Home', servers: home },
			{ desc: ' Personals', servers: personals },
			//{ desc: ' Hacknet', servers: hashnet },
			{ desc: ' Network', servers: network }
		];

		for (const cat of cats) {
			if (cat.servers.length == 0) continue;

			let total = cat.servers.reduce((a, s) => a += ns.getServer(s).maxRam, 0);
			let used = cat.servers.reduce((a, s) => a += ns.getServer(s).ramUsed, 0);
			let free = total - used;
			let usedPct = Math.round(used / total * 100);
			let freePct = Math.round(free / total * 100);

			let procs = [];
			let nbProcs = 0;

			for (const server of cat.servers) {
				let [serverProcs, nbServerProcs] = GetProcessDetails(ns, server);

				//ns.tprint(JSON.stringify(serverProcs));

				for (let proc of serverProcs) {
					let match = procs.find(s => s.category == proc.category);
					if (match == undefined)
						procs.push(proc);
					else {
						match.ram += proc.ram;
						match.percent = Math.round(match.ram / total * 100);
					}
				}
				//procs.push(...serverProcs);

				nbProcs += nbServerProcs;
			}

			//ns.tprint('procs.length: ' + procs.length);

			let entry = [
				{ color: 'white', text: cat.desc },
				{ color: 'white', text: ns.nFormat(total * 1e9, '0.00b').padStart(9) },
				{ color: pctColor(1 - (usedPct / 100)), text: ns.nFormat(used * 1e9, '0.00b').padStart(9) + (usedPct.toFixed(0) + '%').padStart(5) },
				{ color: pctColor(freePct / 100), text: ns.nFormat(free * 1e9, '0.00b').padStart(9) + (freePct.toFixed(0) + '%').padStart(5) }
			];

			details.push(procs);
			procs.forEach(function (s) {
				entry.push(
					{ color: pctColor(1 - (s.percent / 100)), text: s.percent > 0 ? (s.percent.toFixed(0) + '%').padStart(7) : '' }
				)
			});
			totalProcs += nbProcs;
			entry.push({ color: 'white', text: nbProcs.toString().padStart(8) });

			data.push(entry);
		}

	}
	data.push(null);

	let total = servers.reduce((a, s) => a += ns.getServer(s).maxRam, 0);
	let used = servers.reduce((a, s) => a += ns.getServer(s).ramUsed, 0);
	let free = total - used;
	let usedPct = Math.round(used / total * 100);
	let freePct = Math.round(free / total * 100);

	let entry = [
		{ color: 'white', text: ' Total' },
		{ color: 'white', text: ns.nFormat(total * 1e9, '0.00b').padStart(9) },
		{ color: pctColor(1 - (usedPct / 100)), text: ns.nFormat(used * 1e9, '0.00b').padStart(9) + (usedPct.toFixed(0) + '%').padStart(5) },
		{ color: pctColor(freePct / 100), text: ns.nFormat(free * 1e9, '0.00b').padStart(9) + (freePct.toFixed(0) + '%').padStart(5) }
	];

	for (let i = 0; i < details[0].length; i++) {
		let pct = details.reduce((a, s) => a += s[i].ram, 0) / total * 100;
		entry.push(
			{ color: pctColor(1 - (pct / 100)), text: pct > 0 ? (pct.toFixed(1) + '%').padStart(7) : '' }
		)
	}

	entry.push({ color: 'white', text: totalProcs.toString().padStart(8) });

	data.push(entry);


	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}

function GetProcessDetails(ns, server) {
	const categories = [
		{ script: 'weaken', header: 'Weaken' },
		{ script: 'grow', header: 'Grow' },
		{ script: 'hack', header: 'Hack' },
		{ script: 'share-', header: 'Share' },
		{ script: 'charge', header: 'Charge' }
	];

	let procs = ns.ps(server);
	let serverRam = ns.getServer(server).maxRam;

	let ret = categories.map(function (cat) {
		let matches = procs.filter(p => p.filename.startsWith(cat.script));
		let ram = matches.reduce((a, s) => a += s.threads * ns.getScriptRam(s.filename, server), 0);
		let pct = Math.round(ram / serverRam * 100);
		return { category: cat.header, percent: pct, ram: ram };
	});

	// Other category
	let matches = procs.filter(p => !categories.some(c => p.filename.startsWith(c.script)));
	let ram = matches.reduce((a, s) => a += s.threads * ns.getScriptRam(s.filename, server), 0);
	let pct = Math.round(ram / serverRam * 100);
	ret.push({ category: 'Other', percent: pct, ram: ram });

	return [ret, procs.length];
}

export class MemoryMap {
	constructor(ns, simulateFull = false) {
		const servers = GetAllServers(ns).filter(s => ns.getServer(s).hasAdminRights);

		this.blocks = new Array();
		this.used = 0;
		this.available = 0;
		this.total = 0;
		this.purchased = 0;
		this.home = 0;
		this.other = 0;
		this.reserved = 0;

		for (var server of servers) {
			var so = ns.getServer(server);

			if (so.hostname.startsWith('hacknet')) continue;

			let free = so.maxRam - (simulateFull ? 0 : so.ramUsed);
			if (free < 1.6) free = 0;

			this.used += simulateFull ? 0 : so.ramUsed;
			this.available += free;
			this.total += so.maxRam;

			if (server == 'home')
				this.home = so.maxRam;
			else if (so.purchasedByPlayer)
				this.purchased += so.maxRam;
			else
				this.other += so.maxRam;

			if (free >= 0 && so.maxRam > 0) {
				let block = new Object();
				block.server = server;
				block.free = free;
				block.coreBonus = 1 + (so.cpuCores - 1) / 16;

				if (server == 'home') {
					let minFree = 64;
					if (free < minFree) {
						minFree = free;
					}
					block.reserved = minFree;
					this.reserved += minFree;
				}
				else
					block.reserved = 0;
				block.purchased = so.purchasedByPlayer;
				block.isHome = server == 'home';
				block.total = so.maxRam;
				this.blocks.push(block);
			}
		}
		this.blocks.sort(BlockSort(this.total, this.other));

		// let homeBlock= this.HomeBlock();
		// if (this.total > 3000) {
		// 	let reserved= this.homeBlock / 2;
		// 	const maxReserved= 256;
		// 	homeBlock.reserved= Math.min(reserved, maxReserved);
		// }

		function BlockSort(total, other) {
			return function (a, b) {
				// home is always last unless we have to use other servers
				if (a.isHome) return 1;
				if (b.isHome) return -1;

				// Priorize by block size, smallers first
				if (a.free - a.reserved > b.free - b.reserved) return 1;
				if (a.free - a.reserved < b.free - b.reserved) return -1;

				// Priorize purchased servers
				if (a.purchased && !b.purchased) return [total] > [other] ? -1 : 1;
				if (!a.purchased && b.purchased) return [total] > [other] ? 1 : -1;

				return 0;
			}
		}
	}

	get blockList() { return this.blocks; }

	ReserveBlock(minSize) {
		var match = this.blocks.find(b => (b.free - b.reserved) >= minSize);
		if (match == undefined) return undefined;
		match.reserved += minSize;
		return match.server;
	}

	SmallestBlock(minSize = 0) {
		let smallest = this.BiggestBlock();
		for (const block of this.blocks) {
			const available = block.free - block.reserved;
			if (available < smallest && available >= minSize)
				smallest = available;
		}
		return smallest;
	}

	BiggestBlock() {
		let biggest = 0;

		for (const block of this.blocks) {
			const available = block.free - block.reserved;
			if (available > biggest)
				biggest = available;
		}
		return biggest;
	}

	HomeBlock() {
		return this.blocks.find(b => b.isHome);
	}
}

export function RunScript(ns, scriptName, threads, params, allowSpread, allowPartial) {
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
		let server = ramMap.ReserveBlock(blockSize);

		let coreBonus = 1;

		if (scriptName.startsWith('grow') || scriptName.startsWith('weaken')) {
			let homeBlock = ramMap.HomeBlock();
			if (homeBlock != undefined && homeBlock.coreBonus > 1 && threads * ram < homeBlock.free - homeBlock.reserved) {
				if (server == 'home') {
					//ns.tprint('INFO: Favoring home for');
				}
				else {
					server = 'home';
					//ns.tprint('INFO: Spawning grow on home for bonus!');
				}
				coreBonus = homeBlock.coreBonus;
			}
		}

		if (server != undefined) {
			// if (!ns.fileExists(scriptName, server)) {
			// 	ns.print('WARN: ' + scriptName + ' not found on ' + server);
			// 	ns.print('WARN: Attempting to copy ' + scriptName + ' to ' + server);

			ns.scp(scriptName, server, "home");

			// 	if (!ns.fileExists(scriptName, server)) {
			// 		ns.print('FAIL: Could not copy ' + scriptName + ' to ' + server + ', aborting.');
			// 		break;
			// 	}
			// 	else {
			// 		ns.print('SUCCESS: Copied ' + scriptName + ' to ' + server + ', resuming.');
			// 	}
			// }

			//ns.print('Attempting to start ' + scriptName + ' on ' + server + ' with ' + maxThreads + ' threads');

			let actualThreads = Math.ceil(maxThreads / coreBonus);
			if (actualThreads != maxThreads) {
				ns.print('INFO: Readjusting threads from ' + maxThreads + ' to ' + actualThreads);
			}

			let pid = ns.exec(scriptName, server, actualThreads, ...params, performance.now() + unique++);
			if (pid > 0) {
				ns.print('Started script ' + scriptName + ' on ' + server + ' with ' + actualThreads + ' threads');
				pids.push(pid);
				fired += maxThreads;
			}
			else {
				ns.print('FAIL: Failed to launch script ' + scriptName + ' on ' + server + ' with ' + actualThreads + ' threads');
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