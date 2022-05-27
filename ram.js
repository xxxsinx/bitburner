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
		{ header: '  Other', width: 8 }
	];

	let data = [];
	let servers = GetAllServers(ns).filter(s => ns.hasRootAccess(s)).sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a));
	let details = [];
	for (const server of servers) {
		if (ns.getServerMaxRam(server) < 1.6) continue;

		let total = ns.getServerMaxRam(server);
		let used = ns.getServerUsedRam(server);
		let free = total - used;
		let usedPct = Math.round(used / total * 100);
		let freePct = Math.round(free / total * 100);

		let entry = [
			{ color: 'white', text: ' ' + server },
			{ color: 'white', text: ns.nFormat(total * 1e9, '0.00b').padStart(9) },
			{ color: pctColor(1 - (usedPct / 100)), text: ns.nFormat(used * 1e9, '0.00b').padStart(9) + (usedPct.toFixed(0) + '%').padStart(5) },
			{ color: pctColor(freePct / 100), text: ns.nFormat(free * 1e9, '0.00b').padStart(9) + (freePct.toFixed(0) + '%').padStart(5) }
		];

		let procs = GetProcessDetails(ns, server);
		details.push(procs);
		procs.forEach(function (s) {
			entry.push(
				{ color: pctColor(1 - (s.percent / 100)), text: s.percent > 0 ? (s.percent.toFixed(0) + '%').padStart(7) : '' }
			)
		});
		data.push(entry);
	}
	data.push(null);

	let total = servers.reduce((a, s) => a += ns.getServerMaxRam(s), 0);
	let used = servers.reduce((a, s) => a += ns.getServerUsedRam(s), 0);
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
	data.push(entry);


	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
	return;




	const ram = new MemoryMap(ns);

	for (let block of ram.blocks) {
		let free = block.free;
		let total = block.total
		let pct = free / total;
		let prefix = 'SUCCESS';
		if (pct < 0.9) prefix = 'INFO';
		if (pct < 0.5) prefix = 'WARN';
		if (pct < 0.25) prefix = 'FAIL';
		prefix = prefix.padEnd(10);

		ns.tprint(prefix + block.server.padEnd(20) + ns.nFormat(free * 1000000000, '0.00b').padStart(10) + ns.nFormat(total * 1000000000, '0.00b').padStart(10) + Math.round(free / total * 100).toString().padStart(5) + '%');
	}

	ns.tprint(''.padEnd(56, '-'));

	let pct = ram.available / ram.total;
	let prefix = 'SUCCESS';
	if (pct < 0.9) prefix = 'INFO';
	if (pct < 0.5) prefix = 'WARN';
	if (pct < 0.25) prefix = 'FAIL';
	prefix = prefix.padEnd(10);

	ns.tprint(prefix + 'Total'.padEnd(20) + ns.nFormat(ram.available * 1000000000, '0.00b').padStart(10) + ns.nFormat(ram.total * 1000000000, '0.00b').padStart(10) + Math.round(ram.available / ram.total * 100).toString().padStart(5) + '%');

	let nbProcs = 0;
	let nbThreads = 0;

	let nbHack = 0;
	let nbGrow = 0;
	let nbWeaken = 0;

	let nbHackThreads = 0;
	let nbGrowThreads = 0;
	let nbWeakenThreads = 0;

	for (const server of GetAllServers(ns)) {
		let procs = ns.ps(server);
		nbProcs += procs.length;
		for (let proc of procs) {
			nbThreads += proc.threads;
			if (proc.filename.startsWith('hack-once')) {
				nbHack++;
				nbHackThreads += proc.threads;
			}
			if (proc.filename.startsWith('weaken-once')) {
				nbWeaken++;
				nbWeakenThreads += proc.threads;
			}
			if (proc.filename.startsWith('grow-once')) {
				nbGrow++;
				nbGrowThreads += proc.threads;
			}
		}
	}

	ns.tprint('--------------------------------------------------------------');
	ns.tprint('Processes: ' + nbProcs + ' threads: ' + nbThreads);
	ns.tprint('H: ' + nbHack + ' threads: ' + nbHackThreads);
	ns.tprint('W: ' + nbWeaken + ' threads: ' + nbWeakenThreads);
	ns.tprint('G: ' + nbGrow + ' threads: ' + nbGrowThreads);
	ns.tprint('--------------------------------------------------------------');

}

function GetProcessDetails(ns, server) {
	const categories = [
		{ script: 'weaken-once.js', header: 'Weaken' },
		{ script: 'grow-once.js', header: 'Grow' },
		{ script: 'hack-once.js', header: 'Hack' },
		{ script: 'share-forever.js', header: 'Share' },
		{ script: 'charge.js', header: 'Charge' }
	];

	let procs = ns.ps(server);
	let serverRam = ns.getServerMaxRam(server);

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

	return ret;
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
		const servers = GetAllServers(ns).filter(p => ns.hasRootAccess(p));

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

			this.used += simulateFull ? so.maxRam : so.ramUsed;
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