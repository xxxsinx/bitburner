import { ColorPrint } from 'hack-once.js';

const ALLOWED_SKILL_UPGRATES = [
	"Hyperdrive", 			// Each level of this skill increases the experience earned from Contracts, Operations, and BlackOps by 10%
	"Short-Circuit", 			// Each level of this skill increases your success chance in Contracts, Operations, and BlackOps that involve retirement by 5.5%
	"Cloak",					// Each level of this skill increases your success chance in stealth-related Contracts, Operations, and BlackOps by 5.5%
	"Digital Observer", 		// Each level of this skill increases your success chance in all Operations and BlackOps by 4%
	"Blade's Intuition",		// Each level of this skill increases your success chance for all Contracts, Operations, and BlackOps by 3%
	"Overclock", 				// Each level of this skill decreases the time it takes to attempt a Contract, Operation, and BlackOp by 1% (Max Level: 90)
	//"Tracer", 				// Each level of this skill increases your success chance in all Contracts by 4%
	"Reaper", 				// Each level of this skill increases your effective combat stats for Bladeburner actions by 2%
	"Evasive System", 		// Each level of this skill increases your effective dexterity and agility for Bladeburner actions by 4%
	//"Datamancer", 			// Each level of this skill increases your effectiveness in synthoid population analysis and investigation by 5%. This affects all actions that can potentially increase the accuracy of your synthoid population/community estimates.
	//"Cyber's Edge", 			// Each level of this skill increases your max stamina by 2%
	//"Hands of Midas", 		// Each level of this skill increases the amount of money you receive from Contracts by 10%
];

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	if (ns.args[0] == 'debug') {
		let bo = ns.bladeburner.getBlackOpNames();
		ns.tprint(bo.length);
		return;
	}

	for (; ;) {
		let player = ns.getPlayer();

		// Spend skill points
		for (const skill of ALLOWED_SKILL_UPGRATES) {
			const points = ns.bladeburner.getSkillPoints();
			const cost = ns.bladeburner.getSkillUpgradeCost(skill);
			if (cost > points) continue;

			if (skill == 'Overclock' && ns.bladeburner.getSkillLevel(skill) >= 90) continue;

			ns.tprint('INFO: Upgrading skill : ' + skill);
			ns.bladeburner.upgradeSkill(skill);
		}

		// // Check health
		// if (player.hp < player.max_hp * 0.3) {
		// 	ColorPrint('yellow', 'player', 'white', ' is at ', 'red', player.hp + ' / ' + player.max_hp, 'white', ' HP, going to', 'yellow', ' hospital');
		// 	ns.goToLocation('Hospital');
		// 	ns.hospitalize();
		// 	continue;
		// }

		// Check stamina
		let [currentStam, maxStam] = ns.bladeburner.getStamina();
		if (currentStam < maxStam * 0.55) {
			ColorPrint('yellow', 'Training to restore stamina: ', 'red', currentStam.toFixed(0), 'white', '/', 'red', maxStam.toFixed(0));
			let target = maxStam;

			for (; currentStam < target; [currentStam, maxStam] = ns.bladeburner.getStamina()) {
				const cur = ns.bladeburner.getCurrentAction();
				if (cur.name != 'Training') {
					//ColorPrint('Stamina is not maxed, Training');
					ns.stopAction();
					ns.bladeburner.startAction('General', 'Training');
				}

				await ns.sleep(31000);
			}
		}

		// Check Chaos
		let chaos = ns.bladeburner.getCityChaos(ns.bladeburner.getCity());
		if (chaos > 50) {
			while (chaos > 15) {
				const cur = ns.bladeburner.getCurrentAction();
				if (cur.name != 'Diplomacy') {
					ColorPrint('white', 'Setting action to ', 'yellow', 'diplomacy', 'white', ' to lower chaos');
					ns.bladeburner.startAction('General', 'Diplomacy');
				}
				await ns.sleep(1000);
				chaos = ns.bladeburner.getCityChaos(ns.bladeburner.getCity());
			}
			ColorPrint('white', 'Done lowering', 'white', 'chaos');
		}

		// Recruit team members?
		// Nope they suck, fuck it.

		let tasks = [];

		// const blackOps = GetPossibleTasks(ns, 'BlackOps', ns.bladeburner.getBlackOpNames);
		// if (blackOps.length > 0)
		// 	tasks = tasks.concat(blackOps);

		const operations = GetPossibleTasks(ns, 'Operations', ns.bladeburner.getOperationNames);
		tasks = tasks.concat(operations.sort((a, b) => b.rpm - a.rpm));

		const contracts = GetPossibleTasks(ns, 'Contracts', ns.bladeburner.getContractNames);
		tasks = tasks.concat(contracts.sort((a, b) => b.rpm - a.rpm));

		tasks = tasks.sort((a, b) => b.rpm - a.rpm).filter(t => t.lowChance >= 0.4);

		// ns.tprint('INFO: Found BlackOps   = ' + blackOps.length + ' ' + blackOps.map(s => s.name));
		// ns.tprint('INFO: Found Operations = ' + operations.length + ' ' + operations.map(s => s.name));
		// ns.tprint('INFO: Found Contracts  = ' + contracts.length + ' ' + contracts.map(s => s.name));
		// ns.tprint('INFO: Found Tasks  = ' + tasks.length + ' ' + tasks.map(s => s.name));

		ns.clearLog();
		ns.print(
			'Type'.padEnd(10) + ' ' +
			'Name'.padEnd(30) + ' ' +
			'Low'.padEnd(4) + ' ' +
			'High'.padEnd(4) + ' ' +
			'Rank'.padEnd(10) + ' ' +
			'Time'.padEnd(20) + ' ' +
			'Score'.padEnd(5)
		);
		ns.print('----------------------------------------------------------------------------------------');
		for (let task of tasks) {
			let rps = (task.highChance + task.lowChance / 2) * task.repGain / (task.time / 1000 / 60);

			ns.print(
				task.type.padEnd(10) + ' ' +
				task.name.padEnd(30) + ' ' +
				((task.lowChance * 100).toFixed(0) + '%').toString().padEnd(4) + ' ' +
				((task.highChance * 100).toFixed(0) + '%').toString().padEnd(4) + ' ' +
				task.repGain.toFixed(2).toString().padEnd(10) + ' ' +
				ns.tFormat(task.time).padEnd(20) + ' ' +
				rps.toFixed(2).padEnd(10)
			);
		}

		// Check if our field analysis quality is good enough or not
		let theChosenOne = undefined;

		const spreaded = tasks.filter(t => t.highChance - t.lowChance > 0.05);
		if (spreaded.length > 0) {
			//ns.tprint('FAIL: We need to do some field analysis');
			theChosenOne = {
				type: 'General',
				name: 'Field Analysis',
				lowChance: 1,
				highChance: 1
			}
		}
		else {
			theChosenOne = tasks[0];
			for (const task of tasks) {
				// If we have at least 25% chance on a BlackOps lets take it
				if (task.type == 'BlackOps' && task.lowChance > 0.5) {
					theChosenOne = task;
					break;
				}

				// Take the highest priority task for which we have at least 50% chance
				if (task.lowChance > 0.6) {
					theChosenOne = task;
					break;
				}
			}
		}

		if (theChosenOne != undefined) {
			const cur = ns.bladeburner.getCurrentAction();
			if (cur.name != theChosenOne.name) {
				ColorPrint('white', 'Setting action to ', 'yellow', theChosenOne.name);
				ns.bladeburner.startAction(theChosenOne.type, theChosenOne.name);
			}
		}

		//ColorPrint('orange', '*** LOOP END ***\n');
		await ns.sleep(1000);
	}
}

function GetPossibleTasks(ns, type, getter) {
	let ret = [];

	// Get the tasks using the getter function
	let tasks = getter();
	//ColorPrint('white', 'Found ' + tasks.length + ' total ' + type);

	const allowed = ['Assassination', 'Undercover Operation'];

	for (const task of tasks) {
		const remaining = ns.bladeburner.getActionCountRemaining(type, task);
		if (remaining < 1) {
			//if (type == 'BlackOps')
			//ColorPrint('orange', 'Cannot perform ' + task + ' because it\'s already been completed');
			//else
			//ColorPrint('orange', 'Cannot perform ' + task + ' because we are out of ' + type);
			continue;
		}

		if (!allowed.includes(task))
			continue;

		if (type == 'BlackOps') {
			if (ns.bladeburner.getRank() < ns.bladeburner.getBlackOpRank(task)) {
				//ColorPrint('orange', 'Cannot perform ' + op + ' because rank is too low ' + reqRank + ' / ' + rank);
				continue;
			}
		}

		let [chance1, chance2] = ns.bladeburner.getActionEstimatedSuccessChance(type, task);

		let repGain = ns.bladeburner.getActionRepGain(type, task, ns.bladeburner.getActionCurrentLevel(type, task));
		let time = ns.bladeburner.getActionTime(type, task);
		//let level= ns.bladeburner.getActionCurrentLevel(type, task);
		let rpm = (chance1 + chance2) / 2 * repGain / (time / 1000 / 60);// / level;

		// if (task == 'Assassination') 
		// 	rpm = rpm * 3;

		ret.push({
			type: type,
			name: task,
			lowChance: chance1,
			highChance: chance2,
			repGain: repGain,
			time: time,
			rpm: rpm
		});
	}

	// We only want the easiest/first BlackOps we have access to, so slash the rest
	if (type == 'BlackOps')
		ret = ret.slice(0, 1);
	else
		// For operations/contracts we prioritize the harder/more rewarding operations
		ret.reverse();

	return ret;
}