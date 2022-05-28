const GANGSTER_NAMES = [
	'Jeromy Gride',
	'Scott Dourque',
	'Shown Furcotte',
	'Dean Wesrey',
	'Mike Truk',
	'Dwigt Rortugal',
	'Tim Sandaele',
	'Karl Dandleton',
	'Mike Sernandez',
	'Sleve McDichael',
	'Onson Sweemey',
	'Darryl Archideld',
	'Anatoli Smorin',
	'Rey McSriff',
	'Glenallen Mixon',
	'Mario McRlwain',
	'Raul Chamgerlain',
	'Kevin Nogilny',
	'Tony Smehrik',
	'Bobson Dugnutt',
	'Willie Dustice',
	'Todd Bonzalez'
];

let isHacking = false;
const focusMoney = true;
const allowUpgrades = true;
const allowAscension = true;
const allowAugs = true;
const MIN_ACCOUNT_BALANCE = 100_000_000_000;

/** @param {NS} ns **/
export async function main(ns) {
	//ns.disableLog('ALL');

	if (!ns.gang.inGang()) {
		let karma = ns.heart.break();
		const loop = ns.args[0] == 'loop';

		while (karma > -54000) {
			if (!loop) ns.tprint('ERROR: Not enough karma to create a gang yet' + karma);
			ns.print('ERROR: Not enough karma to create a gang yet ' + karma);
			if (loop) {
				ns.tail();
				await ns.sleep(5000);
				karma = ns.heart.break();
				continue;
			}
			return;
		}

		if (ns.singularity.checkFactionInvitations().includes('Tetrads'))
			ns.singularity.joinFaction('Tetrads');
		else if (ns.singularity.checkFactionInvitations().includes('Slum Snakes'))
			ns.singularity.joinFaction('Slum Snakes');

		if (ns.getPlayer().factions.includes('Tetrads'))
			ns.gang.createGang('Tetrads');
		else if (ns.getPlayer().factions.includes('Slum Snakes'))
			ns.gang.createGang('Slum Snakes');

		if (!ns.gang.inGang()) {
			ns.tprint('ERROR: Not in a gang, could not create gang, exiting');
			ns.print('ERROR: Not in a gang, could not create gang, exiting');
			return;
		}
	}

	ns.tail();

	let otherGangsInfoPrevCycle = undefined;
	let nextTick = undefined;
	let gangInfo = ns.gang.getGangInformation();
	isHacking = gangInfo.isHacking;

	let members = ns.gang.getMemberNames();

	AssignTasks(ns, members, gangInfo);

	while (true) {
		// *** Recruitment ***
		await RecruitMembers(ns);

		// *** Get current gang member names and gangInfo ***
		members = ns.gang.getMemberNames();
		gangInfo = ns.gang.getGangInformation();
		GangReport(ns, gangInfo);

		// *** Automatic ascension ***
		if (allowAscension) {
			for (let member of members) {
				AscendGangMember(ns, member);
			}
		}

		// *** Equipement stuff ***
		if (allowUpgrades) {
			UpgradeEquipement(ns);
			ns.print('');
		}

		// *** Territory warfaire ***
		// Detect new tick
		let otherGangsInfo = ns.gang.getOtherGangInformation();
		let newTick = false;
		let allowClash = true;
		for (let i = 0; i < Object.keys(otherGangsInfo).length; i++) {
			const gangName = Object.keys(otherGangsInfo)[i];
			if (gangName == gangInfo.faction) continue;

			if (ns.gang.getChanceToWinClash(gangName) < 0.55)
				allowClash = false;

			let gi = Object.values(otherGangsInfo)[i];
			let ogi = otherGangsInfoPrevCycle ? Object.values(otherGangsInfoPrevCycle)[i] : gi;

			let powerChanged = gi.power != ogi.power;
			let territoryChanged = gi.territory != ogi.territory;
			let changed = powerChanged || territoryChanged;

			if (changed) {
				newTick = true;
			}
		}

		// If we're in a new tick, take note of when next one is going to happen
		if (newTick) {
			ns.print('WARN: -- NEW TICK DETECTED --');
			if (nextTick != undefined) {
				AssignTasks(ns, members, gangInfo);
			}
			nextTick = Date.now() + 19000;
		}

		// Update our cache of otherGangsInfo
		otherGangsInfoPrevCycle = otherGangsInfo;

		if (gangInfo.territory < 1) {
			// Assign members to territory warfare
			if (nextTick != undefined && Date.now() + 500 > nextTick) {
				ns.print('WARN: Assigning all members to territory warfare');
				for (let member of members)
					ns.gang.setMemberTask(member, 'Territory Warfare');
			}
		}
		else
			ns.print('INFO: Skipping territory warfare, we are at 100% territory!');

		ns.gang.setTerritoryWarfare(allowClash && gangInfo.territory < 1);

		ns.print('');
		ns.print('LOOP END');
		ns.print('');
		await ns.sleep(1000);
	}
}

function AssignTasks(ns, members, gangInfo) {
	ns.print('WARN: Assigning best tasks');
	// let rendu = 0;
	// let half = Math.ceil(members.length / 2);
	for (let member of members) {
		let newTask = FindBestTask(ns, gangInfo, member, focusMoney);

		if (gangInfo.wantedPenalty < 0.90 && gangInfo.wantedLevel > 20 && gangInfo.respect > 1000)
			newTask = isHacking ? 'Ethical Hacking' : 'Vigilante Justice';

		ns.gang.setMemberTask(member, newTask);
		ns.print('WARN: Assigning task ' + newTask + ' to ' + member + ' forMoney: ' + focusMoney);
	}
}


async function RecruitMembers(ns) {
	let members = ns.gang.getMemberNames();

	while (ns.gang.canRecruitMember()) {
		ns.print('INFO: We can currently recruit a new member!');

		let newMember = undefined;
		for (let i = 0; i < GANGSTER_NAMES.length; i++) {
			const candidate = GANGSTER_NAMES[i];
			if (candidate == undefined) continue;

			let alreadyExists = false;
			for (const member of members) {
				if (candidate == member) {
					alreadyExists = true;
					break;
				}
			}
			if (alreadyExists) {
				await ns.sleep(0);
				continue;
			}
			newMember = candidate;
			break;
		}

		if (newMember == undefined) {
			ns.print('ERROR: Could not find a new member name?! Should NOT happen.');
		}
		else {
			ns.gang.recruitMember(newMember);
			ns.print('SUCCESS: Recruited a new gang member called ' + newMember);
			members.push(newMember);
		}

		await ns.sleep(10);
	}
}

function AscendGangMember(ns, member) {
	const ascensionResult = ns.gang.getAscensionResult(member);
	if (ascensionResult == undefined) return;
	let threshold = CalculateAscendTreshold(ns, member);
	if (isHacking && ascensionResult.hack >= threshold ||
		(!isHacking && (ascensionResult.agi >= threshold || ascensionResult.str >= threshold || ascensionResult.def >= threshold || ascensionResult.dex >= threshold))) {
		ns.gang.ascendMember(member);
		ns.print(`Ascending ${member}!`);
	}
}

// Credit: Mysteyes. https://discord.com/channels/415207508303544321/415207923506216971/940379724214075442
function CalculateAscendTreshold(ns, member) {
	let metric = isHacking ? 'hack_asc_mult' : 'str_asc_mult';
	let mult = ns.gang.getMemberInformation(member)[metric];
	if (mult < 1.632) return 1.6326;
	if (mult < 2.336) return 1.4315;
	if (mult < 2.999) return 1.284;
	if (mult < 3.363) return 1.2125;
	if (mult < 4.253) return 1.1698;
	if (mult < 4.860) return 1.1428;
	if (mult < 5.455) return 1.1225;
	if (mult < 5.977) return 1.0957;
	if (mult < 6.496) return 1.0869;
	if (mult < 7.008) return 1.0789;
	if (mult < 7.519) return 1.073;
	if (mult < 8.025) return 1.0673;
	if (mult < 8.513) return 1.0631;

	return 1.0591;
}

function UpgradeEquipement(ns) {
	let budget = ns.getPlayer().money - MIN_ACCOUNT_BALANCE;
	if (budget < 0) return;

	let allGear = ns.gang.getEquipmentNames();
	allGear = allGear.sort((a, b) => ns.gang.getEquipmentCost(a) - ns.gang.getEquipmentCost(b));

	const members = ns.gang.getMemberNames();

	for (let gear of allGear) {
		let type = ns.gang.getEquipmentType(gear);

		if (type == 'Augmentation' && !allowAugs)
			continue;

		// if (isHacking && type == 'Rootkit' && budget < 5_000_000_000)
		// 	continue;

		// if (isHacking && (type == 'Weapon' || type == 'Armor' || type == 'Vehicle' || type == 'Rootkit') && budget < 5_000_000_000)
		// 	continue;

		// if (!isHacking && (type == 'Weapon' || type == 'Armor' || type == 'Vehicle' || type == 'Rootkit') && budget < 5_000_000_000)
		// 	continue;

		// if (!isHacking && type == 'Rootkit' && budget < 5_000_000_000)
		// 	continue;

		// Find which member(s) do not have that upgrade installed
		const missing = new Array();
		for (let member of members) {
			const memberInfo = ns.gang.getMemberInformation(member);
			if (!memberInfo.upgrades.includes(gear) && !memberInfo.augmentations.includes(gear)) {
				missing.push(member);
			}
		}

		let cost = ns.gang.getEquipmentCost(gear);
		for (let member of missing) {
			if (cost < budget) {
				ns.print('Buying ' + gear + ' for ' + member);
				ns.enableLog('gang.purchaseEquipment');
				ns.gang.purchaseEquipment(member, gear);
				budget -= cost;
			}
		}
	}
}


function GangReport(ns, gangInfo) {
	ns.print('');
	ns.print('Faction                :  ' + gangInfo.faction);
	ns.print('Gang type              :  ' + (gangInfo.isHacking ? 'Hacking' : 'Combat'));
	ns.print('Money gain rate        :  ' + gangInfo.moneyGainRate);
	ns.print('Power                  :  ' + gangInfo.power);
	ns.print('Respect                :  ' + gangInfo.respect);
	ns.print('Respect gain rate      :  ' + gangInfo.respectGainRate);
	ns.print('Territory              :  ' + gangInfo.territory);
	ns.print('Territory clash chance :  ' + gangInfo.territoryClashChance);
	ns.print('Territory war engaged  :  ' + gangInfo.territoryWarfareEngaged);
	ns.print('Wanted level           :  ' + gangInfo.wantedLevel);
	ns.print('Wanted level gain rate :  ' + gangInfo.wantedLevelGainRate);
	ns.print('Wanted penalty         :  ' + gangInfo.wantedPenalty);
	ns.print('');
}

function FindBestTask(ns, gangInfo, member, prioritizeMoney) {
	let mi = ns.gang.getMemberInformation(member);

	let ALLOWED_TASKS = [
		'Mug People',
		'Strongarm Civilians',
		'Traffick Illegal Arms',
		'Human Trafficking',
		'Terrorism'
	];
	if (isHacking) {
		ALLOWED_TASKS = [
			'Ransomware',
			'Phishing',
			'Identity Theft',
			'DDoS Attacks',
			'Plant Virus',
			'Fraud & Counterfeiting',
			'Money Laundering',
			'Cyberterrorism'
		];
	}

	let canGainRespect = false;
	let canGainMoney = false;

	let tasks = [];
	for (let task of ALLOWED_TASKS) {
		let stats = ns.gang.getTaskStats(task);
		let money = ns.formulas.gang.moneyGain(gangInfo, mi, stats);
		let respect = ns.formulas.gang.respectGain(gangInfo, mi, stats);

		tasks.push({
			task: task,
			money: money,
			//wanted: ns.formulas.gang.wantedLevelGain(gangInfo, mi, stats),
			respect: respect,
			stats: stats
		});

		if (respect > 0) canGainRespect = true;
		if (money > 0) canGainMoney = true;
	}

	if (prioritizeMoney)
		tasks.sort((a, b) => b.money - a.money);
	else
		tasks.sort((a, b) => b.respect - a.respect);

	if (isHacking && mi.hack < 600) {
		return 'Train Hacking';
	}

	// We train combat even for hacking gangs, otherwise they get destroyed in Territory Warfare
	if (mi.def < 600) {
		return 'Train Combat';
	}

	// Prioritize money
	if (canGainMoney && prioritizeMoney) {
		return tasks[0].task;
	}

	// Prioritize respect
	if (canGainRespect && !prioritizeMoney) {
		return tasks[0].task;
	}

	// Default task if we can't find any money/respect yielding tasks suited for this member
	return isHacking ? 'Train Hacking' : 'Train Combat';
}