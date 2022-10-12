import { WaitPids } from "utils.js";
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
		new Goal(ns, '1H', function () {
			const reached = performance.now() - started > 1000 * 60 * 60;
			if (reached)
				ns.tprint('INFO: Karma after 1H is ' + ns.heart.break());
			return reached;
		}),
	]);

	goals.ResetGoals();

	let v1pid = ns.getRunningScript('v1.js', 'home', 'xp');

	while (true) {
		// Situation report script
		await TryRunScript(ns, 'sitrep.js');
		await TryRunScript(ns, 'sitrepSleeves.js');
		let sitrep = JSON.parse(ns.read('sitrep.txt'));
		let karma = sitrep.karma;

		if (sitrep.portCrackers < 5 || // Check if we need to buy more port crackers
			sitrep.servers.some(s => s.ports.open < s.ports.open.required) || // Check if we have servers who need cracking
			sitrep.servers.some(s => s.ports.nuked == false) // Check if we have servers that need nuking
		) {
			// Buy programs, run programs, nuke
			await TryRunScript(ns, 'breach.js', [true]);
		}

		if (sitrep.servers.some(s => s.contracts.length > 0)) {
			// Solve contracts
			await TryRunScript(ns, 'contractPrep.js', [true]);
			await TryRunScript(ns, 'solver.js', [true]);
		}

		// Buy personal server(s)
		await TryRunScript(ns, 'buyserver.js', ['loop', true]);

		// Save work reputation to it's faction
		await TryRunScript(ns, 'SaveRep.js');

		const BACKDOOR_TARGETS = [
			'CSEC',
			'I.I.I.I',
			'avmnite-02h',
			'run4theh111z',
			'millenium-fitness',
			'powerhouse-fitness',
			'crush-fitness',
			'snap-fitness'
		];

		if (sitrep.servers.some(s => BACKDOOR_TARGETS.includes(s.name) && s.ports.backdoored == false && s.difficulty.current >= s.difficulty.required)) {
			// Install backdoors
			await TryRunScript(ns, 'installBackdoor.js', [true]);
		}

		// Sleeve management
		await SleeveManagement(ns, karma);

		// Start gangs if we have the karma for it
		if (karma <= -54000) {
			if (!sitrep.hasGang) {
				await TryRunScript(ns, '/gang/create.js');

				// Situation report script
				await TryRunScript(ns, 'sitrep.js');
				sitrep = JSON.parse(ns.read('sitrep.txt'));
				karma = sitrep.karma;
			}
			if (sitrep.hasGang) {
				await TryRunScript(ns, '/gang/members.js');
				await TryRunScript(ns, '/gang/canClash.js');

				const budget = sitrep.money; //Math.min(sitrep.balance.install.gang /*+ EXTERNAL_FUNDING*/, sitrep.money);
				// ns.print('INFO: Gang balance is ' + sitrep.balance.install.gang);
				// ns.print('INFO: Money is ' + sitrep.money);
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

		if (ns.getPlayer().skills.hacking < 100) {
			v1pid = ns.getRunningScript('v1.js', 'home', 'xp');
			if (v1pid == undefined) {
				ns.tprint('INFO: Started ' + 'v1.js' + ' with params [xp]');
				v1pid = ns.run('v1.js', 1, 'xp');
			}
		}
		else {
			v1pid = ns.getRunningScript('v1.js', 'home', 'xp');
			if (v1pid != undefined) {
				ns.tprint('INFO: XP goal reached, killing ' + 'v1.js' + ' with params [xp]');
				ns.kill(v1pid.pid);
				v1pid = undefined;
			}
			ns.run('controller.js');
		}


		// buy personal servers?
		// upgrade home ram?
		// start/stop basic hacking script
		// start/stop manager
		// start/stop controller
		// start/stop stocks?

		// Leave 1m for travels
		// Auto join Tian
		// Auto join CSEC
		// Auto join NiteRunners
		// Auto join The Black Hand
		// Auto join BitRunners
		// Auto join Daedelus
		// Farm rep
		// if required > 300k
		// Reset at 100k for favor
		// If required > 750k
		// Reset at 365k for favor
		// Farm the rest by donations
		// Run share when ram allows

		goals.CheckGoals();

		ns.print('');
		await ns.sleep(10000);
	}
}

async function SleeveManagement(ns, karma) {
	let stats = ns.sleeve.getSleeveStats(0);

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

	// Default action set to homicide for money
	await TryRunScript(ns, 'sleevecrime.js', ['Homicide', stats.shock > 0 ? 1 : 0, 8]);
	// Always have one sleeve on shock duty unless we're grinding gangs
	if (stats.shock > 0) {
		await TryRunScript(ns, 'shock.js', [0, 1]);
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