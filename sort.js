import { FormatMoney } from "utils.js";

export async function main(ns) {
	ns.disableLog('ALL');

	ns.tprint('');

	const servers = RecursiveScan(ns);

	const hackableServers = HackableServers(ns, servers);
	ns.tprint(hackableServers.length + ' hackable servers found out of ' + servers.length);

	if (ns.fileExists('Formulas.exe'))
		ns.tprint('INFO: Using formulas for hack % (showing maximum %)');
	else
		ns.tprint('WARNING: NOT using formulas for hack % (showing current %)');

	ns.tprint('┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐');
	ns.tprint('│  Server            |  $$$      │  HackReq │  MinSec │  Prepped  │  Chance  |  Weaken Time                   │');
	ns.tprint('├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤');

	let cut = false;
	const player = ns.getPlayer();

	if (ns.args[0] != undefined) {
		player.hacking = ns.args[0];
		player.hacking_speed_mult = 1;
		player.hacking_chance_mult = 1;
		player.hacking_exp_mult = 1;
		player.hacking_exp = 1;
		player.hacking_grow_mult = 1;
		player.hacking_money_mult = 1;
	}

	for (const hackable of hackableServers) {

		const so = ns.getServer(hackable);

		if (!cut && so.requiredHackingSkill < player.hacking / 2) {
			ns.tprint('├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤');
			cut = true;
		}

		const minSec = ns.getServerMinSecurityLevel(hackable);
		let chance = ns.hackAnalyzeChance(hackable);
		const maxMoney = ns.getServerMaxMoney(hackable);

		so.hackDifficulty = so.minDifficulty;
		let wtime= ns.getWeakenTime(so.hostname);

		if (ns.fileExists('Formulas.exe')) {
			chance = ns.formulas.hacking.hackChance(so, player);
			wtime = ns.formulas.hacking.weakenTime(so, player);
		}

		ns.tprint('│  ' + hackable.padEnd(18) + '│  ' +
			FormatMoney(ns, maxMoney).padEnd(9) + '│  ' +
			so.requiredHackingSkill.toString().padEnd(8) + '│  ' +
			Math.round(minSec).toString().padEnd(7) + '│  ' +
			Prepped(ns, hackable).toString().padEnd(9) + '│  ' +
			((chance * 100).toFixed(0).toString() + '%').padEnd(8) + '│  ' +
			ns.tFormat(wtime).padEnd(30) + '│'
		);
	}
	ns.tprint('└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘');
	ns.tprint('');

	if (ns.args[0] == 'prep') {
		ns.tprint("INFO: Looking for prep targets");

		for (const hackable of hackableServers) {
			if (Prepped(ns, hackable)) {
				continue;
			}

			let procs = await ns.ps();
			let alreadyRunning = false;
			for (const proc of procs) {
				if (proc.filename != 'prep.js') continue;
				if (proc.args != hackable) continue;

				alreadyRunning = true;
				break;
			}

			if (alreadyRunning == false) {
				ns.tprint("INFO: Launching prep.js for " + hackable);

				//const needed = ns.getScriptRam('prep.js');
				//let ram = new MemoryMap(ns);
				//const server = ram.ReserveBlock(needed);
				if (ns.exec('prep.js', 'home', 1, hackable) == 0) {
					ns.tprint("FAILED: Launching prep.js for " + hackable);
				}
			}
			else {
				//ns.tprint("prep.js already running for for " + hackable);
			}
		}
	}

	const usableServers = UsableServers(ns, servers);
	ns.tprint(usableServers.length + ' usable servers found out of ' + servers.length);

	for (const usable of usableServers) {
		if (ns.args[0] == 'mem') {
			ns.tprint(usable + ' => ' + ns.nFormat(ServerUsableRam(ns, usable) * 1000000000, '0.00b'));
		}
	}

	for (const hackable of hackableServers) {
		if (ns.args[0] == 'run') {
			let target = 'v1.js';
			const so = ns.getServer(hackable);
			if (so.requiredHackingSkill > player.hacking / 2)
				continue;

			let procs = await ns.ps();
			let alreadyRunning = false;
			for (const proc of procs) {
				if (proc.filename != target) continue;
				if (proc.args[0] != hackable) continue;
				alreadyRunning = true;
				break;
			}

			if (alreadyRunning == false) {
				ns.tprint('INFO: Launching ' + target + ' for ' + hackable);

				if (ns.exec(target, 'home', 1, hackable, 0.5, 10000) == 0) {
					ns.tprint('FAILED: Launching ' + target + ' for ' + hackable);
				}

				await ns.sleep(10);
			}
		}
	}

	ns.tprint('');

	//let ram = new MemoryMap(ns);
	//ns.tprint('Total usable RAM: ' + ns.nFormat(ram.available * 1000000000, '0.00b') + ' / ' + ns.nFormat(ram.total * 1000000000, '0.00b') + ' (' + Math.round(ram.available * 100.0 / ram.total) + '%)');
	//ns.tprint('Possible grow/weaken/hack threads: approx ' + Math.floor(ram.available / ns.getScriptRam('grow-once.js')) + ' / ' + Math.floor(ram.total / ns.getScriptRam('grow-once.js')));
}

function Prepped(ns, server) {
	const so = ns.getServer(server);
	if (so.moneyAvailable < so.moneyMax) return false;
	if (so.hackDifficulty > so.minDifficulty) return false;
	return true;
}


async function ReplaceProcess(ns, script, params, server) {
	// args			string[]	Script's arguments
	// filename		string		Script name.
	// pid			number		Process ID
	// threads		number		Number of threads script is running with	
	const procs = await ns.ps(server);
	for (const proc of procs) {
		if (proc.filename != script) continue;
		if (proc.args != params) continue;

		ns.tprint('Killing ' + script + ' (args: ' + params + ') on ' + server);
		await ns.kill(proc.pid);
	}

	if (params == 'n00dles') return;

	ns.tprint('Spawning ' + script + ' (args: ' + params + ') on ' + server);
	ns.exec(script, server, 1, params);
}


function ServerUsableRam(ns, server) {
	return ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
}

function HackableServers(ns, servers) {
	//const ret = servers.filter(s => !KeepServer(s));
	const ret = servers.filter(s => ns.hasRootAccess(s) && ns.getServerMaxMoney(s) > 0);
	ret.sort(MoneySort);
	return ret;

	function KeepServer(z) {
		return true;

		const so = ns.getServer(s);
		const player = ns.getPlayer();

		if (!ns.hasRootAccess(s)) return false;
		if (ns.getServerMaxMoney(s) == 0) return false;
		if (s == 'home') return false
		if (so.purchasedByPlayer) return false;
		if (so.requiredHackingSkill < player.hacking) return false;
		if (ns.fileExists('Formulas.exe')) {
			so.hackDifficulty = so.minDifficulty;
			const chance = ns.formulas.hacking.hackChance(so, player);
			if (chance < 0.25) return false;
		}

		return true;
	}

	function MoneySort(a, b) {
		if (ns.getServerMaxMoney(a) > ns.getServerMaxMoney(b)) return -1;
		if (ns.getServerMaxMoney(a) < ns.getServerMaxMoney(b)) return 1;
		return 0;
	}
}

function UsableServers(ns, servers) {
	const ret = servers.filter(s => ns.hasRootAccess(s) && ServerUsableRam(ns, s) > 0);
	ret.sort(RamSort);
	return ret;

	function RamSort(a, b) {
		if (ServerUsableRam(ns, a) > ServerUsableRam(ns, b)) return -1;
		if (ServerUsableRam(ns, a) < ServerUsableRam(ns, b)) return 1;
		return 0;
	}
}

function RecursiveScan(ns, root, found) {
	if (found == null) found = new Array();
	if (root == null) root = 'home';
	if (found.find(p => p == root) == undefined) {
		found.push(root);
		for (const server of ns.scan(root))
			if (found.find(p => p == server) == undefined)
				RecursiveScan(ns, server, found);
	}
	return found;
}