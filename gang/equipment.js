/** @param {NS} ns */
export async function main(ns) {
	try {
		UpdateGangEquipmment(ns);
	}
	catch {
		ns.write('/gang/equipment.txt', JSON.stringify([]), 'w');
	}
}

export function GetEquipment(ns) {
	return JSON.parse(ns.read('/gang/equipment.txt'));
}

export function UpdateGangEquipmment(ns) {
	const output = [];
	let allGear = ns.gang.getEquipmentNames();
	allGear = allGear.sort((a, b) => ns.gang.getEquipmentCost(a) - ns.gang.getEquipmentCost(b));
	for (let gear of allGear) {
		let type = ns.gang.getEquipmentType(gear);
		let cost = ns.gang.getEquipmentCost(gear);
		output.push({
			name: gear,
			type: type,
			cost: cost
		});
	}
	ns.write('/gang/equipment.txt', JSON.stringify(output), 'w');
}