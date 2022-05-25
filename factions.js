import { PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

const FactionNames = {
	CyberSec: "CyberSec",
	NiteSec: "NiteSec",
	TheBlackHand: "The Black Hand",
	BitRunners: "BitRunners",
	Daedalus: "Daedalus",
	TianDiHui: "Tian Di Hui",
	Netburners: "Netburners",
	SlumSnakes: "Slum Snakes",
	Tetrads: "Tetrads",
	Sector12: "Sector-12",
	Aevum: "Aevum",
	Volhaven: "Volhaven",
	Chongqing: "Chongqing",
	Ishima: "Ishima",
	NewTokyo: "New Tokyo",
	Illuminati: "Illuminati",
	TheCovenant: "The Covenant",
	ECorp: "ECorp",
	MegaCorp: "MegaCorp",
	BachmanAssociates: "Bachman & Associates",
	BladeIndustries: "Blade Industries",
	NWO: "NWO",
	ClarkeIncorporated: "Clarke Incorporated",
	OmniTekIncorporated: "OmniTek Incorporated",
	FourSigma: "Four Sigma",
	KuaiGongInternational: "KuaiGong International",
	FulcrumSecretTechnologies: "Fulcrum Secret Technologies",
	SpeakersForTheDead: "Speakers for the Dead",
	TheDarkArmy: "The Dark Army",
	TheSyndicate: "The Syndicate",
	Silhouette: "Silhouette",
	Bladeburners: "Bladeburners",
	ChurchOfTheMachineGod: "Church of the Machine God"//,
	//ShadowsOfAnarchy: "Shadows of Anarchy"
};

/** @param {NS} ns **/
export async function main(ns) {
	let masterlist = GetMasterList(ns, ns.args.includes('rep'));
	const ownedAugs = ns.singularity.getOwnedAugmentations(true);

	const columns = [
		{ header: ' Augmentation', width: 56 },
		{ header: ' Factions', width: 30 },
		{ header: ' Price', width: 8 },
		{ header: ' Req.Rep', width: 9 },
		{ header: ' Pre.Req', width: 40 },
		{ header: ' Type', width: 13 }
	];

	if (ns.args[0] != undefined && ns.args[0].startsWith('mil')) {
		for (let i = 0; i < 5; i++) {
			let faction = Object.values(FactionNames)[i];
			let list = masterlist.filter(s => s.factions.includes(faction));
			let data = ToColumnData(ns, list, ' No ' + faction + ' augmentations found!');

			columns[0].header = ' ' + faction;

			PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
		}

		return;
	}
	if (ns.args[0] != 'all') {
		// Remove some stuff we don't want to see unless special run
		masterlist = masterlist.filter(s => s.type != 'Physical');
		masterlist = masterlist.filter(s => s.type != 'Charisma');
		masterlist = masterlist.filter(s => s.type != 'Company');
		masterlist = masterlist.filter(s => s.type != 'Shit');
		masterlist = masterlist.filter(s => s.type != 'Hacknet');
		masterlist = masterlist.filter(s => !s.factions[0].startsWith('Netburn'));
		if (!ns.getPlayer().factions.includes('Church of the Machine God'))
			masterlist = masterlist.filter(s => !s.factions[0].startsWith('Church'));
		masterlist = masterlist.filter(s => !s.factions[0].startsWith('Bladeburner'));
	}

	let desired = masterlist.filter(s => FilterDesiredAugs(ns, s));
	let owned = masterlist.filter(s => ownedAugs.includes(s.name) && !s.name.startsWith('NeuroFlux'));
	let balance = masterlist.filter(s => !desired.includes(s) && !owned.includes(s));

	let desiredData = ToColumnData(ns, desired, ' No desirable augmentations found!');
	let balanceData = ToColumnData(ns, balance, ' No interesting augmentations found!');
	let ownedData = ToColumnData(ns, owned, ' No augmentations installed yet!');

	PrintTable(ns, [...desiredData, null, ...balanceData, null, ...ownedData], columns, DefaultStyle(), ColorPrint);

	if (ns.args[0] == 'buy') {
		if (desired.length < 1) {
			ns.tprint('FAIL: Cannot buy any augmentation right now');
			return;
		}
		let aug = desired[0].name;
		let faction = MeetsRepRequirement(ns, desired[0]);
		if (ns.singularity.purchaseAugmentation(faction, aug))
			ns.tprint('SUCCES: Bought ' + aug + ' from ' + faction);
		else
			ns.tprint('FAIL: Cannot buy ' + aug + ' from ' + faction);
	}
}

function GetMasterList(ns, sortByRep) {
	const masterlist = [];
	for (const faction of Object.values(FactionNames)) {
		let augs = ns.getAugmentationsFromFaction(faction);
		for (const aug of augs) {
			let match = masterlist.find(s => s.name == aug);
			if (!match) {
				let entry = {
					name: aug,
					factions: [faction],
					price: ns.singularity.getAugmentationPrice(aug),
					rep: ns.singularity.getAugmentationRepReq(aug),
					prereq: ns.singularity.getAugmentationPrereq(aug),
					type: AugType(ns, aug)
				};
				masterlist.push(entry);
			}
			else {
				match.factions.push(faction);
			}
		}
	}
	if (sortByRep)
		masterlist.sort((a, b) => b.rep - a.rep);
	else
		masterlist.sort((a, b) => b.price - a.price);
	return masterlist;
}

function ToColumnData(ns, list, emptyDesc) {
	const playerMoney = ns.getServerMoneyAvailable('home');

	let ret = list.map(s => [
		{ color: AugColor(ns, s), text: ' ' + s.name },
		{ color: s.factions.length == 1 ? 'red' : 'white', text: s.factions.join(', ').slice(0, 30) },
		{ color: s.price > playerMoney ? 'red' : 'white', text: ' ' + ns.nFormat(s.price, '0.0a').padStart(6) },
		{ color: MeetsRepRequirement(ns, s) ? 'white' : 'red', text: ' ' + ns.nFormat(s.rep, '0.00a').toString().padStart(7) },
		{ color: MeetsPreReq(ns, s) ? 'white' : 'red', text: ' ' + s.prereq.toString().slice(0, 38) },
		{ color: TypeColor(s.type), text: ' ' + s.type }
	]);

	if (ret.length == 0) {
		ret.push([
			{ color: 'yellow', text: ' ' + emptyDesc },
			{ color: 'white', text: '' },
			{ color: 'white', text: '' },
			{ color: 'white', text: '' },
			{ color: 'white', text: '' },
			{ color: 'white', text: '' }
		]);
	}

	return ret;
}

function FilterDesiredAugs(ns, s) {
	// Remove factions we are not yet part of
	if (intersect(s.factions, ns.getPlayer().factions).length == 0) { return false; }

	// Remove augs we have in queue or already installed
	if (ns.singularity.getOwnedAugmentations(true).includes(s.name) && !s.name.startsWith('NeuroFlux')) { return false; }

	// Remove BladeBurner
	if (s.factions.length == 1 && s.factions.includes('Bladeburners')) { return false; }

	// Remove Physical, charisma, company, shit
	if (s.type == 'Physical') { return false; }
	if (s.type == 'Charisma') { return false; }
	if (s.type == 'Company') { return false; }
	if (s.type == 'Shit') { return false; }

	// Remove stuff we can't afford
	if (s.price > ns.getServerMoneyAvailable('home')) { return false; }

	// Remove stuff we don't have the rep for
	if (MeetsRepRequirement(ns, s) == false) { return false; }

	// Remove stuff we don't have the prereq for
	if (MeetsPreReq(ns, s) == false) { return false; }

	//if (s.name == 'QLink' && ns.args[1] != 'qlink') { return false; }

	return true;
}

function AugColor(ns, aug) {
	if (ns.singularity.getOwnedAugmentations(false).includes(aug.name)) return 'lime';
	if (ns.singularity.getOwnedAugmentations(true).includes(aug.name)) return 'green';
	if (intersect(ns.getPlayer().factions, aug.factions).length == 0) return '#990000'
	if (!MeetsRepRequirement(ns, aug)) return '#0080ff';
	if (aug.price > ns.getServerMoneyAvailable('home')) return 'red'
	if (aug.type == 'Physical' || aug.type == 'Charisma' || aug.type == 'Shit' || aug.type == 'Company') return '#555555'
	if (!MeetsPreReq(ns, aug)) return 'orange';

	return 'white';
}

function intersect(a, b) {
	var setB = new Set(b);
	return [...new Set(a)].filter(x => setB.has(x));
}

function MeetsRepRequirement(ns, aug) {
	for (let faction of aug.factions) {
		let rep = ns.singularity.getFactionRep(faction);
		if (rep >= aug.rep) return faction;
	}
	return false;
}

function MeetsPreReq(ns, aug) {
	const owned = ns.singularity.getOwnedAugmentations(true);
	for (let req of aug.prereq) {
		if (!owned.includes(req)) return false;
	}
	return true;
}

function AugType(ns, aug) {
	const stats = ns.singularity.getAugmentationStats(aug);
	let keys = Object.keys(stats);
	if (aug.startsWith('NeuroFlux')) return 'NeuroFlux';
	if (keys.find(s => s.startsWith('bladeburner'))) return 'BladeBurner';
	if (aug == 'CashRoot Starter Kit') return 'Shit'
	if (keys.length == 0) return 'Special';
	if (keys.find(s => s.startsWith('faction_rep'))) return 'Faction';
	if (keys.find(s => s.startsWith('hacknet'))) return 'Hacknet';
	if (keys.find(s => s.startsWith('hack'))) return 'Hacking';
	if (keys.find(s => s.startsWith('charisma'))) return 'Charisma';
	if (keys.find(s => s.startsWith('str'))) return 'Physical';
	if (keys.find(s => s.startsWith('def'))) return 'Physical';
	if (keys.find(s => s.startsWith('dex'))) return 'Physical';
	if (keys.find(s => s.startsWith('agi'))) return 'Physical';
	if (keys.find(s => s.startsWith('company'))) return 'Company';
	return '???';
}

function TypeColor(type) {
	switch (type) {
		case 'NeuroFlux':
			return 'cyan';
		case 'Shit':
			return 'brown';
		case 'BladeBurner':
			return '#555555';
		case 'Special':
			return 'cyan';
		case 'Faction':
			return 'yellow'
		case 'Hacknet':
			return 'orange'
		case 'Hacking':
			return 'lime'
		case 'Charisma':
			return '#555555';
		case 'Physical':
			return '#555555';
		case 'Company':
			return '#555555';
		case '???':
			return '#555555';
		default:
			return 'red';
	}
}