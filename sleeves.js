import { GetBestCrime } from 'stats.js'
import { ColorPrint } from 'hack-once.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let [task, start = 0, count = 8, silent = false] = ns.args;

	let getBest = task == undefined;

	for (let i = start; i < count; i++) {
		let cash = ns.getServerMoneyAvailable('home');
		let city = ns.sleeve.getInformation(i).city;

		//if (task == 'augs' && i > 3) continue;

		if (getBest) {
			let fakePlayer = ns.getPlayer();
			fakePlayer.skills = ns.sleeve.getSleeveStats(i);
			task = GetBestCrime(ns, fakePlayer);
		}

		if (task == 'shock') {
			if (!silent)
				ns.tprint('Setting sleeve ' + i + ' to Shock Recovery');
			ns.sleeve.setToShockRecovery(i);
			continue;
		}

		// if (task == 'Homicide') {
		// 	ns.sleeve.setToCommitCrime(i, task);
		// 	continue;
		// }

		if (task == 'augs') {
			if (ns.sleeve.getSleeveStats(i).shock > 0) continue;
			//if (i > 1) continue;

			const owned = ns.sleeve.getSleeveAugmentations(i);
			const available = ns.sleeve.getSleevePurchasableAugs(i).sort((a, b) => a.cost - b.cost).filter(s => !owned.includes(s.name));
			let totalCost = 0;
			for (const aug of available) {
				let color = 'white';

				ns.tprint(aug.name + ' => ' + ns.nFormat(aug.cost, "$0.000a"));

				let stats = ns.getAugmentationStats(aug.name);
				if (Object.keys(stats).length == 0) {
					ColorPrint('red', '   No stats found for this augment');
				}
				else {
					for (let key of Object.keys(stats)) {
						// if (key.search('str') >= 0 ||
						// 	key.search('def') >= 0 ||
						// 	key.search('agi') >= 0 ||
						// 	key.search('dex') >= 0 ||
						// 	key.search('combat') >= 0 ||
						// 	key.search('skills') >= 0)
						// 	color = 'yellow';
						// if (key.search('faction') >= 0)
						// color = 'yellow';
						// if (key.search('hack') >= 0 && key.search('hacknet') == -1)
						// 	color = 'orange';
						// if (key.search('hacknet') >= 0)
						// 	color = 'purple';

						if (aug.cost > 15_000_000_000)
							continue;
						//color = 'red';

						//if (color == 'yellow') {
						totalCost += aug.cost;
						ns.sleeve.purchaseSleeveAug(i, aug.name);
						await ns.sleep(5);
						//}
						ColorPrint(color, '    ' + key.padEnd(30) + '    ' + stats[key]);
					}
				}
			}

			ColorPrint('yellow', 'Total of matching augs: ' + ns.nFormat(totalCost * 8, "$0.000a"))

			await ns.sleep(100);
			continue;
			//break;
		}

		if (task == 'study') {
			// Travel if possible/needed
			if (ns.sleeve.getInformation(i).city != 'Volhaven' && cash > 1_000_000_000) {
				ns.sleeve.travel(i, 'Volhaven');
				city = ns.sleeve.getInformation(i).city;
			}

			// Chose either the most expensive or free course depending on cash
			const course = cash > 1_000_000_000 ? 'Algorithms' : 'Study Computer Science';
			let uni = '';

			switch (city) {
				case 'Volhaven':
					uni = 'ZB Institute of Technology';
					break;
				case 'Sector-12':
					uni = 'Rothman University';
					break;
				default:
					ns.tprint('Sleeve ' + i + ' is not in Sector-12 or Volhaven and cash is tight, aborting.');
					continue;
			}

			if (!silent)
				ns.tprint('Sleeve ' + i + ' is starting to study ' + course + ' at ' + uni);
			ns.sleeve.setToUniversityCourse(i, uni, course);
			continue;
		}

		if (task == 'train') {
			// Travel if possible/needed
			if (ns.sleeve.getInformation(i).city != 'Sector-12') {
				if (cash > 1_000_000) {
					ns.sleeve.travel(i, 'Sector-12');
					city = ns.sleeve.getInformation(i).city;
				}
				else {
					ns.tprint('Sleeve ' + i + ' is not in Sector-12 and cash is tight, aborting training.');
					continue;
				}
			}

			const stats = ['Train Strength', 'Train Defense', 'Train Dexterity', 'Train Agility'];
			const statIndex = i % 4;

			if (!silent)
				ns.tprint('Sleeve ' + i + ' is starting to to ' + stats[statIndex] + ' at ' + 'Powerhouse Gym');
			ns.sleeve.setToGymWorkout(i, 'Powerhouse Gym', stats[statIndex]);
			continue;
		}

		// Default
		if (!silent)
			ns.tprint('Setting sleeve ' + i + ' to ' + task);
		ns.sleeve.setToCommitCrime(i, task);
		continue;
	}
}