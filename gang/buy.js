import { GetEquipment } from '/gang/equipment.js';
import { GetMembers } from '/gang/members.js';

/** @param {NS} ns */
export async function main(ns) {
	const [budget, allowAugs] = ns.args;
	if (budget == undefined || allowAugs == undefined) {
		ns.tprint('FAIL: Usage => run buy.js <budget:number> <allowAugs:boolean>');
		return;
	}
	UpgradeEquipement(ns, budget, allowAugs);
}

function UpgradeEquipement(ns, budget, allowAugs) {
	const allGear = GetEquipment(ns);
	//ns.tprint('budget: ' + ns.nFormat(budget, '0.000a'));
	if (budget < 0) return;

	const members = GetMembers(ns);
	//ns.tprint('members: ' + members.length);

	for (const gear of allGear) {
		if (gear.type == 'Augmentation' && !allowAugs)
			continue;

		// const allowedHackingAugs= [
		// 	'BitWire', 'DataJack', 'Neuralstimulator'
		// ];		
		// if (type == 'Augmentation' && !allowedHackingAugs.includes(gear))
		// 	continue;

		// if ((type == 'Weapon' || type == 'Armor' || type == 'Vehicle' || type == 'Rootkit') && budget < 5_000_000_000)
		// 	continue;

		// if (type == 'Rootkit' && budget < 5_000_000_000)
		// 	continue;

		// Find which member(s) do not have that upgrade installed
		const missing = [];
		for (let member of members) {
			if (!member.upgrades.includes(gear.name) && !member.augmentations.includes(gear.name)) {
				missing.push(member.name);
			}
		}

		for (let member of missing) {
			if (gear.cost < budget) {
				//ns.print('Buying ' + gear.name + ' for ' + member);
				//ns.enableLog('gang.purchaseEquipment');
				ns.gang.purchaseEquipment(member, gear.name);
				budget -= gear.cost;
			}
		}
	}
}