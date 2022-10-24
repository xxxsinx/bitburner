import { GetAllServers } from "utils.js";
import { RunScript, MemoryMap } from "ram.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let [pct = 0.95] = ns.args;

	if (ns.args.includes('auto')) {
		const ram = new MemoryMap(ns, true);
		if (ram.total < 5000)
			return;
		else if (ram.total < 5000)
			pct = 0.15;
		else if (ram.total < 10000)
			pct = 0.2;
		else if (ram.total < 15000)
			pct = 0.25;
		else if (ram.total < 25000)
			pct = 0.30;
		else
			pct = 0.35
	}

	if (ns.args.includes('stop')) {
		const data = FindInstances(ns)
		// Kill all existing instances of share-forever.js
		for (const proc of data.shares) {
			ns.tprint('Killing share-forever.js PID ' + proc.pid);
			ns.kill(proc.pid);
		}
		for (const proc of data.dupes) {
			ns.tprint('Killing share.js PID ' + proc.pid);
			ns.kill(proc.pid);
		}
		return;
	}

	for (; ;) {
		ns.print('');
		ns.print('');
		await AdjustUsage(ns, pct);
		ns.print('Current share power: ' + ns.getSharePower());
		await ns.sleep(5000);
	}
}

function FindInstances(ns) {
	let allProcs = [];
	let dupes = [];
	let totalRam = 0;
	for (const server of GetAllServers(ns)) {
		let procs = ns.ps(server);
		allProcs.push(...procs.filter(s => s.filename == 'share-forever.js'));
		dupes.push(...procs.filter(s => s.filename == 'share.js' && s.args[0] != 'stop'));
		if (ns.hasRootAccess(server))
			totalRam += ns.getServerMaxRam(server);
	}
	return {
		shares: allProcs.sort((a, b) => a.threads - b.threads),
		dupes: dupes,
		totalRam: totalRam
	};
}

async function AdjustUsage(ns, pct) {
	let data = FindInstances(ns);
	let shareThreads = data.shares.reduce((a, s) => a += s.threads, 0);
	let scriptRam = ns.getScriptRam('share-forever.js');
	let sharePct = (shareThreads * scriptRam) / data.totalRam;
	let targetThreads = Math.ceil(data.totalRam * pct / scriptRam);

	if (shareThreads > targetThreads) {
		let needToKill = shareThreads - targetThreads;
		while (needToKill > 0 && data.shares.length > 0) {
			ns.print('Killing ' + data.shares[0].threads + ' share threads');
			shareThreads -= data.shares[0].threads;
			needToKill -= data.shares[0].threads;
			ns.kill(data.shares[0].pid);
			data.shares.shift();
		}
		sharePct = (shareThreads * scriptRam) / data.totalRam;
	}

	if (sharePct < pct) {
		let missingThreads = targetThreads - shareThreads;
		ns.print('Attempting to start ' + missingThreads + ' share threads.');
		await RunScript(ns, 'share-forever.js', missingThreads, ['', performance.now(), true], true, true);
	}
}