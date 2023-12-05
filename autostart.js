import { WaitPids, LogMessage } from "utils.js";
import { Goal, Goals } from "goals.js";

/*
Brainstorm of what's needed for a "main brain" script

- Get all the cracker programs ASAP and nuke everything we can as they become available
- Increase hacking level ASAP (using personal and sleeve study free or paid, xp script and/or batching)
- Increase home ram to a minimal level (for faster install recovery)
- Buy a few personal servers
- Run the casino script if we aren't banned
- Decide what's the best use for sleeves at any given time
	- Focus gang acquisition if gang isn't created yet
	- Reduce shock if shock > 95
	- Trail stats? Not sure? If money allows it might increase gang speed with easier homicides?
	- In some cases setting them on money making tasks might be best?
- Factions
	- Chose what factions to try getting into
	- Chose which one to focus (personal vs sleeves if they are free/makes sense)
	- Mesh with augs script to see what's best
	- Decide if/when we need to install/reset for favor depending on current faction focus
- Decide when to install/soft reset and do it
- Decide when to close the node and do it
- Check for coding contracts + solve
- Decide what servers to hack (using starter or manager as needed/allowed)
- Hacknet servers
	- Decide if/how much we want to invest (if at all)
	- Spend hashes on whatever makes the most sense given current situation
	- Install related augs if we are going to focus/invest in hacknet as a significant node strategy
- Stocks
	- Start stock market script if/when it makes sense
	- Stop it or ask it to release shares if we need the money it's holding (some priorities might call for that)
- Install backdoors when applicable/necessary
- Save money for corporation
	- We don't have a corp script yet so for now we're just focusing on amassing the 150b investment (if node strategy calls for it)
- Go to Chongqing and receive the gift ASAP if it makes sense (based on node multipliers)
*/


/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	const started = performance.now();

	const goals = new Goals(ns, 'autostart.txt', [
		// new Goal(ns, '1H', function () {
		// 	const reached = performance.now() - started > 1000 * 60 * 60;
		// 	if (reached)
		// 		ns.tprint('INFO: Karma after 1H is ' + ns.heart.break());
		// 	return reached;
		// }),
	]);

	goals.ResetGoals();

	//let pid = ns.getRunningScript('v1.js', 'home', 'xp');

	while (true) {
		// Situation report script
		await TryRunScript(ns, 'sitrep.js');
		await TryRunScript(ns, 'sitrepSleeves.js');
		await TryRunScript(ns, 'factions.js', ['plan', 'silent']);
		await TryRunScript(ns, 'acceptFactions.js');
		await TryRunScript(ns, 'workFaction.js');
		await TryRunScript(ns, 'joinTian.js', ['silent']);
		await TryRunScript(ns, 'favorStatus.js');
		await TryRunScript(ns, 'shouldInstall.js');
		await TryRunScript(ns, 'acceptStanek.js');
		await TryRunScript(ns, 'loadStanek.js');
		await TryRunScript(ns, 'hashes.js');
		ns.run('share.js', 1, 'auto');
		//ns.run('casino.js', 1, 'silent');
		ns.run('stanek.js', 1, 0.3);
		let sitrep = JSON.parse(ns.read('sitrep.txt'));
		let karma = sitrep.karma;

		// if (sitrep.money >= 150_000_000_000) {
		// 	ns.tprint('WARN: We got 150b! ' + ns.tFormat(ns.getPlayer().playtimeSinceLastBitnode));
		// 	return;
		// }

		// Check if we need to buy more port crackers
		if (sitrep.portCrackers < 5) {
			// Buy programs, run programs, nuke
			await TryRunScript(ns, 'programs.js', [true]);
		}

		if (sitrep.servers.some(s => s.ports.open < s.ports.needed) || // Check if we have servers who need cracking
			sitrep.servers.some(s => s.ports.nuked == false)) { // Check if we have servers that need nuking
			// Buy programs, run programs, nuke
			await TryRunScript(ns, 'breach.js', [true]);
		}

		if (sitrep.servers.some(s => s.contracts.length > 0)) {
			// Solve contracts
			await TryRunScript(ns, 'contractPrep.js', [true]);
			await TryRunScript(ns, 'solver.js', [true]);
		}

		// Donate money
		// if (ns.getPlayer().hasCorporation || ns.getPlayer().money > 150e9) {
		// 	//if (ns.getServerMaxRam('home') >= Math.pow(2, 1))
		// 	ns.run('jakob-corp.js');
		// 	await TryRunScript(ns, 'corpDonate.js');
		// 	//let corp= eval('ns.corporation');
		// }
		// else {

		// }
		await TryRunScript(ns, 'donate.js');

		// Buy personal server(s)
		await TryRunScript(ns, 'budget.js', ['silent']);
		sitrep = JSON.parse(ns.read('sitrep.txt'));
		let budget = sitrep.ramBudget ?? 0;
		//ns.tprint('INFO: Ram budget is ' + ns.nFormat(budget, '0.000a'));
		ns.print('INFO: Ram budget is ' + ns.nFormat(budget, '0.000a'));
		await TryRunScript(ns, 'buyserver.js', ['upgrade', 'silent']);

		// Save work reputation to it's faction
		//await TryRunScript(ns, 'SaveRep.js');

		const BACKDOOR_TARGETS = [
			'CSEC',
			'I.I.I.I',
			'avmnite-02h',
			'run4theh111z',
			//'w0r1d_d43m0n',
			// 'millenium-fitness',
			// 'powerhouse-fitness',
			// 'crush-fitness',
			// 'snap-fitness'
		];

		if (sitrep.servers.some(s => BACKDOOR_TARGETS.includes(s.name) && s.ports.backdoored == false && s.difficulty.current >= s.difficulty.required)) {
			// Install backdoors
			await TryRunScript(ns, 'installBackdoor.js', [true]);
		}

		// Sleeve management
		await SleeveManagement(ns, karma);

		// Start gangs if we have the karma for it
		if (karma <= -54000 || ns.getPlayer().bitNodeN == 2) {
			if (!sitrep.hasGang) {
				LogMessage(ns, 'INFO: Creating gang');
				await TryRunScript(ns, '/gang/create.js');

				// Situation report script
				await TryRunScript(ns, 'sitrep.js');
				sitrep = JSON.parse(ns.read('sitrep.txt'));
				karma = sitrep.karma;
			}
			if (sitrep.hasGang) {
				await TryRunScript(ns, '/gang/members.js');
				await TryRunScript(ns, '/gang/canClash.js');
				await TryRunScript(ns, 'budget.js', ['silent']);
				sitrep = JSON.parse(ns.read('sitrep.txt'));

				let budget = sitrep.gangBudget ?? 0;
				//ns.tprint('INFO: Gang equipment budget is ' + ns.nFormat(budget, '0.000a'));
				ns.print('INFO: Gang equipment budget is ' + ns.nFormat(budget, '0.000a'));
				if (budget > 0) {
					await TryRunScript(ns, '/gang/equipment.js');
					await TryRunScript(ns, '/gang/buy.js', [budget, true]);
				}

				ns.run('gangman.js');
			}
		}
		else {
			ns.print('Current karma: ' + karma.toFixed(0));
		}

		// Farm XP for a bit
		if (ns.getPlayer().skills.hacking < 100) {
			await TryRunScript(ns, 'study.js', ['silent']);
		}

		// 	let pid = ns.getRunningScript('v1.js', 'home', 'xp');
		// 	if (pid == undefined) {
		// 		ns.tprint('INFO: Starting v1.js with params [xp]');
		// 		pid = ns.run('v1.js', 1, 'xp');
		// 		if (pid == undefined) {
		// 			ns.tprint('FAIL: Failed to start v1.js with params [xp]');
		// 		}
		// 	}
		// }
		// else {
		// 	// Kill XP farming script
		// 	let pid = ns.getRunningScript('v1.js', 'home', 'xp');
		// 	if (pid != undefined) {
		// 		ns.tprint('INFO: XP goal reached, killing v1.js with params [xp]');
		// 		ns.kill(pid.pid);
		// 		pid = undefined;
		// 	}

		// Run manager on joesguns until we have all ports open
		if ((sitrep.servers.some(s => s.ports.nuked == false) /*|| sitrep.ram.total < 5000*/) && sitrep.canHackJoe) {
			let pid = ns.getRunningScript('manager.js', 'home', 'joesguns', 1, 420);
			if (pid == undefined) {
				ns.tprint('INFO: Starting manager.js with params [joesguns, 1]');
				LogMessage(ns, 'INFO: Starting manager.js with params [joesguns, 1]');
				let pid = ns.run('manager.js', 1, 'joesguns', 1, 420);
				if (pid == undefined) {
					ns.tprint('FAIL: Failed to start manager.js with params [joesguns, 1]');
				}
			}
		}
		else {
			// Kill XP farming script
			let pid = ns.getRunningScript('manager.js', 'home', 'joesguns', 1, 420);
			if (pid != undefined) {
				ns.tprint('INFO: We now have all 5 port crackers available and enough ram to start controller mode. Killing manager.js on joesguns');
				LogMessage(ns, 'WARN: Killing manager.js with params [joesguns, 1]');
				ns.kill(pid.pid);
				pid = undefined;
			}

			const processInfo = ns.ps().find(p => p.filename == 'controller.js');
			const overrides = GetControllerOverrides(ns, sitrep);

			let parametersChanged = false;
			for (let i = 0; i < overrides.length; i++) {
				if (processInfo != null && processInfo.args[i] != overrides[i]) {
					parametersChanged = true;
					break;
				};
			}
			if (processInfo == null || parametersChanged) {
				if (processInfo != null) {
					ns.tprint('WARN: Killing controller.js ' + processInfo.args);
					LogMessage(ns, 'WARN: Killing controller.js ' + processInfo.args);
					ns.kill(processInfo.pid);
				}
				ns.tprint('INFO: Starting controller.js with params ' + overrides);
				LogMessage(ns, 'INFO: Starting controller.js with params ' + overrides);
				pid = ns.run('controller.js', 1, ...overrides);
				if (pid == undefined) {
					ns.tprint('FAIL: Failed to start controller.js ' + overrides);
				}
			}
		}
		//}

		await TryRunScript(ns, 'demon.js', ['silent']);

		let waitingOnDaedalus = sitrep.flightStatus != undefined && sitrep.flightStatus.augs >= sitrep.flightStatus.augsNeeded
			&& sitrep.money >= 100e9 && sitrep.level > 2500 && !ns.getPlayer().factions.includes('Daedalus');

		// Check if we're ready to install
		if ((sitrep.favorInstall || sitrep.shouldInstall) && !waitingOnDaedalus /*&& ns.getPlayer().hasCorporation && eval('ns.corporation').getCorporation().public == 1 && eval('ns.corporation').getCorporation().funds > 1e33*/) {
			await TryRunScript(ns, 'factions.js', ['buy', 'silent']);
			await TryRunScript(ns, 'dumpMoney.js');

			LogMessage(ns, 'INFO: autostart.js: killing all other scripts on home ');
			ns.killall('home', true);

			ns.tprint('WARN: About to install/soft reset! You got 10 seconds...');
			await ns.sleep(5000);
			ns.tprint('WARN: About to install/soft reset! You got 5 seconds...');
			await ns.sleep(1000);
			ns.tprint('WARN: About to install/soft reset! You got 4 seconds...');
			await ns.sleep(1000);
			ns.tprint('WARN: About to install/soft reset! You got 3 seconds...');
			await ns.sleep(1000);
			ns.tprint('WARN: About to install/soft reset! You got 2 seconds...');
			await ns.sleep(1000);
			ns.tprint('WARN: About to install/soft reset! You got 1 seconds...');
			await ns.sleep(1000);

			ns.spawn('install.js');
			return;
		}

		// start/stop stocks?

		goals.CheckGoals();

		ns.print('');
		await ns.sleep(10000);
	}
}

function GetControllerOverrides(ns, sitrep) {
	if (sitrep.ram.total < Math.pow(2, 18) || sitrep.ram.home <= 128) {
		return [2, 1, 2];
	}
	else if (sitrep.ram.total < Math.pow(2, 21) || sitrep.ram.home <= 256) {
		return [3, 2, 3];
	}
	else if (sitrep.ram.total < Math.pow(2, 22)) {
		return [4, 3, 4];
	}
	else if (sitrep.ram.total < Math.pow(2, 23)) {
		return [6, 5, 8];
	}
	else if (sitrep.ram.total < Math.pow(2, 24)) {
		return [12, 5, 8];
	}
	else {
		return [12, 5, 8];
	}
}

async function SleeveManagement(ns, karma) {

	// // If shock > 95% we force shock recovery
	// if (stats.shock > 95) {
	// 	//ns.print('Shock is ' + stats.shock)
	// 	await TryRunScript(ns, 'shock.js', [0, 8]);
	// 	return;
	// }

	// // Mug for a bit if our stats are shit, getting us a tiny bit of income
	// if (stats.strengt < 30 || stats.defense < 30 || stats.dexterity < 30 || stats.agility < 15) {
	// 	await TryRunScript(ns, 'sleevecrime.js', ['mug', 0, 8]);
	// 	return;
	// }

	// Homicide for karma
	if (karma > -54000) {
		await TryRunScript(ns, 'sleevecrime.js', ['Homicide', 0, 8]);
		return;
	}

	for (let i = 0; i < 8; i++) {
		let stats = ns.sleeve.getSleeveStats(i);
		if (stats.shock > 0)
			await TryRunScript(ns, 'shock.js', [i, 1]);
		else
			await TryRunScript(ns, 'sleevecrime.js', ['Homicide', i, 1]);
	}
}

export async function TryRunScript(ns, script, params = []) {
	const pids = ns.run(script, 1, ...params);
	await WaitPids(ns, pids);
	if (pids.length == 0) {
		ns.tprint('WARN: Not enough ram to run ' + script);
	}
	else
		ns.print('INFO: Started ' + script + ' with params [' + params + ']');
}