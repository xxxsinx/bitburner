const factions = [
	'CyberSec',
	'Tian Di Hui',
	'Netburners',
	'Sector-12',
	'Aevum',
	'Volhaven',
	'Ishima',
	'Chongqing',
	'New Tokyo',
	'NiteSec',
	'The Black Hand',
	'BitRunners',
	'ECorp',
	'MegaCorp',
	'KuaiGong International',
	'Four Sigma',
	'NWO',
	'Blade Industries',
	'OmniTek Incorporated',
	'Bachman & Associates',
	'Clarke Incorporated',
	'Fulcrum Secret Technologies',
	'Slum Snakes',
	'Tetrads',
	'Silhouette',
	'Speakers for the Dead',
	'The Dark Army',
	'The Syndicate',
	'The Covenant',
	'Daedalus',
	'Illuminati'
];


const crimes = [
	'shoplift',
	'rob store',
	'mug',
	'larceny',
	'deal drugs',
	'bond forgery',
	'traffick arms',
	'homicide',
	'grand theft auto',
	'kidnap',
	'assassinate',
	'heist'
];

// ascensionMultiplier(points)				Calculate ascension mult.
// ascensionPointsGain(exp)					Calculate ascension point gain.
// moneyGain(gang, member, task)			Calculate money gain per tick.
// respectGain(gang, member, task)			Calculate respect gain per tick.
// wantedLevelGain(gang, member, task)		Calculate wanted gain per tick.
// wantedPenalty(gang)						Calculate the wanted penalty.

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let player = ns.getPlayer();

	if (ns.args[0] == 'best') {
		ns.tprint('Best crime right now is: ' + GetBestCrime(ns, ns.getPlayer()));
		return;
	}

	if (ns.args[0] == 'factions') {
		let joined= ns.getPlayer().factions;
		let missing= factions.filter(s=> !joined.includes(s));
		ns.tprint('missing: ' + missing.join('\n'));


		// for (const faction of factions) {
		// 	try {
		// 		const augs = ns.singularity.getAugmentationsFromFaction(faction);
		// 	}
		// 	catch {
		// 		ns.tprint('faction ' + faction + ' is invalid maybe?');
		// 	}
		// }
		return;
	}


	if (ns.args[0] == 'travel') {
		for (; ;) {
			for (let i = 0; i < 10000; i++) {
				ns.singularity.travelToCity('Sector-12');
				ns.singularity.travelToCity('Chongqing');
			}
			await ns.sleep(0);
		}
		return;
	}

	const startMoney = player.money;

	while (true) {
		player = ns.getPlayer();

		// If we lost money, lets do some crimes to replenish the wallet
		// if (player.money < startMoney) {
		// 	await TheSecretIngredientIsCrime(ns);
		// }
		// else {//if (!ns.isBusy()) {
		ns.print('Training stats at the gym!');
		await TrainCombatStats(ns, player);
		// }

		SituationReport(ns, player, startMoney);
		await ns.sleep(10000);
	}
}

async function TrainCombatStats(ns, player) {
	let stats = new Array(
		{ 'stat': 'defense', 'value': player.defense },
		{ 'stat': 'strength', 'value': player.strength },
		{ 'stat': 'dexterity', 'value': player.dexterity },
		{ 'stat': 'agility', 'value': player.agility });

	// Find our lowest stat
	stats = stats.sort((a, b) => a.value - b.value);

	ns.print('Our lowest combat stat is ' + stats[0].stat);

	if (player.className != 'training your ' + stats[0].stat + ' at a gym') {
		ns.singularity.gymWorkout('Powerhouse Gym', stats[0].stat, false);
		for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
			ns.sleeve.setToGymWorkout(i, 'Powerhouse Gym', 'Train ' + stats[0].stat.charAt(0).toUpperCase() + stats[0].stat.slice(1));
		}
	}
}

function SituationReport(ns, player, startMoney) {
	ns.print('');
	ns.print('Karma                   : ' + ns.heart.break());
	ns.print('Money on script launch  : ' + ns.nFormat(startMoney, "$0.000a"));
	ns.print('Money                   : ' + ns.nFormat(player.money, "$0.000a"));
	ns.print('City                    : ' + player.city);
	ns.print('isWorking               : ' + player.isWorking);
	ns.print('workType                : ' + player.workType);
	ns.print('className               : ' + player.className);
	ns.print('');
}


async function TheSecretIngredientIsCrime(ns) {
	const bestCrime = GetBestCrime(ns, ns.getPlayer())
	if (bestCrime != undefined) {
		const start = Date.now();
		const time = ns.commitCrime(bestCrime);
		ns.print('Committing ' + bestCrime + ' (will take approx ' + ns.tFormat(time) + ')');
		while (ns.isBusy()) {
			let elapsed = Date.now() - start;
			if (elapsed < time * 0.8) break; // user cancelled
			await ns.sleep(100);
		}
		ns.print(bestCrime + ' complete!');
	}
}

export function GetBestCrime(ns, player) {
	let bestCrime = undefined;
	let bestCps = 0;
	let bestKps = 0;
	let bestIps = 0;
	for (const crime of crimes) {
		let crimeStats = ns.singularity.getCrimeStats(crime);
		let chance = calculateCrimeSuccessChance(crimeStats, player)   // ns.getCrimeChance(crime);
		let cps = crimeStats.money / crimeStats.time * chance;
		let kps = crimeStats.karma / crimeStats.time * chance;
		let ips = crimeStats.intelligence_exp / crimeStats.time * chance;
		//if (bestCps == 0 || (cps > bestCps && chance > 0.25)) {
		//if (bestKps == 0 || (kps > bestKps/* && chance > 0.25*/)) {
		if (bestIps == 0 || (ips > bestIps/* && chance > 0.25*/)) {
			bestCrime = crime;
			bestCps = cps;
			bestKps = kps;
			bestIps = ips;
		}
		ns.tprint(crime + ' ips: ' + ips);
	}
	//ns.tprint('Best crime is: ' + bestCrime);
	return bestCrime;
}

function calculateCrimeSuccessChance(crimeStats, person) {
	let chance =
		crimeStats.hacking_success_weight * person.skills.hacking +
		crimeStats.strength_success_weight * person.skills.strength +
		crimeStats.defense_success_weight * person.skills.defense +
		crimeStats.dexterity_success_weight * person.skills.dexterity +
		crimeStats.agility_success_weight * person.skills.agility +
		crimeStats.charisma_success_weight * person.skills.charisma
	chance /= 975;
	chance /= crimeStats.difficulty;
	return Math.min(chance, 1)
}