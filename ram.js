import { GetAllServers } from "utils.js";
import { PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

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
	let servers = GetAllServers(ns).filter(s => ns.getServer(s).hasAdminRights).sort((a, b) => ns.getServer(b).maxRam - ns.getServer(a).maxRam);
	let details = [];
	let totalProcs = 0;

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
	data.push(null);

	let total = servers.reduce((a, s) => a += ns.getServer(s).maxRam, 0);
	let used = servers.reduce((a, s) => a += ns.getServer(b).ramUsed, 0);
	let free = total - used;
	let usedPct = Math.round(used / total * 100);
	let freePct = Math.round(free / total * 100);

	let entry = [
		{ color: 'white', text: 'Total' },
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

export function GetProcessDetails(ns, server) {
	const categories = [
		{ script: 'weaken-once.js', header: 'Weaken' },
		{ script: 'grow-once.js', header: 'Grow' },
		{ script: 'hack-once.js', header: 'Hack' },
		{ script: 'share-forever.js', header: 'Share' },
		{ script: 'charge.js', header: 'Charge' }
	];

	let procs = ns.ps(server);
	let serverRam = ns.getServer(server).maxRam;

	let ret = categories.map(function (cat) {
		let matches = procs.filter(p => p.filename == cat.script);
		let ram = matches.reduce((a, s) => a += s.threads * ns.getScriptRam(s.filename, server), 0);
		let pct = Math.round(ram / serverRam * 100);
		return { category: cat, percent: pct, ram: ram };
	});

	// Other category
	let matches = procs.filter(p => !categories.map(s => s.script).includes(p.filename));
	let ram = matches.reduce((a, s) => a += s.threads * ns.getScriptRam(s.filename, server), 0);
	let pct = Math.round(ram / serverRam * 100);
	ret.push({ category: 'Other', percent: pct, ram: ram });

	return [ret, procs.length];
}


function pctColor(pct) {
	if (pct >= 1) return 'Lime';
	else if (pct >= 0.9) return 'Green';
	else if (pct >= 0.75) return 'ForestGreen';
	else if (pct >= 0.5) return 'GreenYellow';
	else if (pct >= 0.25) return 'Orange';
	else if (pct >= 0.1) return 'DarkOrange';
	else if (pct > 0) return 'OrangeRed';
	return 'Red';
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

				if (server == 'home') {
					let minFree = 256;
					//if (minFree > so.maxRam * 0.25) {
					minFree = 45;//so.maxRam * 0.25;
					//}
					if (free < minFree) {
						minFree = free;
					}
					block.reserved = minFree;
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

			await ns.scp(scriptName, server, "home");

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