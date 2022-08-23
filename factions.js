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
	ChurchOfTheMachineGod: "Church of the Machine God",
	ShadowsOfAnarchy: "Shadows of Anarchy"
};

/** @param {NS} ns **/
export async function main(ns) {
	let masterlist = GetMasterList(ns, ns.args.includes('rep'));
	const ownedAugs = ns.singularity.getOwnedAugmentations(true);

	const columns = [
		{ header: ' Augmentation', width: 56 },
		{ header: ' Factions', width: 30 },
		{ header: ' Price', width: 8 },
		{ header: ' Req.Rep', width: 19 },
		{ header: ' Pre.Req', width: 40 },
		{ header: ' Type', width: 13 }
	];

	if (ns.args[0] != undefined && ns.args[0].startsWith('mil')) {
		for (let i = 0; i < 5; i++) {
			let faction = Object.values(FactionNames)[i];
			let list = masterlist.filter(s => s.factions.includes(faction));
			let data = ToColumnData(ns, list, ' No ' + faction + ' augmentations found!');

			let extra = '';
			if (faction == FactionNames.CyberSec)
				extra = ns.getServerRequiredHackingLevel('CSEC').toString();
			else if (faction == FactionNames.NiteSec)
				extra = ns.getServerRequiredHackingLevel('avmnite-02h').toString();
			else if (faction == FactionNames.TheBlackHand)
				extra = ns.getServerRequiredHackingLevel('I.I.I.I').toString();
			else if (faction == FactionNames.BitRunners)
				extra = ns.getServerRequiredHackingLevel('run4theh111z').toString();

			columns[0].header = ' ' + faction + ' ' + extra;

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
		masterlist = masterlist.filter(s => !s.factions[0].startsWith('Shadows'));
		masterlist = masterlist.filter(s => !s.factions[0].startsWith('Netburn'));
		if (!ns.getPlayer().factions.includes('Church of the Machine God'))
			masterlist = masterlist.filter(s => !s.factions[0].startsWith('Church'));
		masterlist = masterlist.filter(s => !s.factions[0].startsWith('Bladeburner'));
	}

	let desired = masterlist.filter(s => FilterDesiredAugs(ns, s));
	let suggested = SuggestedAugs(ns, desired);
	let owned = masterlist.filter(s => ownedAugs.includes(s.name) && !s.name.startsWith('NeuroFlux'));
	let balance = masterlist.filter(s => !desired.includes(s) && !owned.includes(s));

	let desiredData = ToColumnData(ns, desired, ' No desirable augmentations found!');
	let suggestedData = ToColumnData(ns, suggested, ' No suggested augmentations found!');
	let balanceData = ToColumnData(ns, balance, ' No interesting augmentations found!');
	let ownedData = ToColumnData(ns, owned, ' No augmentations installed yet!');

	if (ns.args[0] != undefined && ns.args[0].startsWith('ins')) {
		let hasNeufo = ns.getOwnedAugmentations(true).find(s => s.startsWith('NeuroFlux'));
		columns[0].header = ' Installed Augmentations (' + (owned.length + (hasNeufo ? 1 : 0)) + ')';
		PrintTable(ns, ownedData, columns, DefaultStyle(), ColorPrint);
	}
	else {
		columns[0].header = ' Suggested Buy Order';
		PrintTable(ns, suggestedData, columns, DefaultStyle(), ColorPrint);

		columns[0].header = ' Buyable';
		PrintTable(ns, desiredData, columns, DefaultStyle(), ColorPrint);

		columns[0].header = ' Wanted but locked (by faction/prereq/$/rep)';
		PrintTable(ns, balanceData, columns, DefaultStyle(), ColorPrint);
	}

	if (ns.args[0] == 'buy') {
		if (suggested.length < 1) {
			ns.tprint('FAIL: Cannot buy any augmentation right now');
			return;
		}

		for (let aug of suggested) {
			let faction = MeetsRepRequirement(ns, aug);
			if (ns.singularity.purchaseAugmentation(faction, aug.name))
				ns.tprint('SUCCES: Bought ' + aug.name + ' from ' + faction);
			else
				ns.tprint('FAIL: Cannot buy ' + aug.name + ' from ' + faction + ' ?!' +
					' estimated cost: ' + ns.nFormat(aug.price, '0.00a') +
					' actual cost: ' + ns.nFormat(ns.singularity.getAugmentationPrice(aug.name), '0.00a') +
					' money: ' + ns.nFormat(ns.getPlayer().money, '0.00a'));
			break;
		}
	}
}

function SuggestedAugs(ns, desired) {
	let neuro = desired.find(s => s.name.startsWith('NeuroFlux'));
	desired = desired.filter(s => !s.name.startsWith('NeuroFlux'));
	let mult = 1.9 * [1, .96, .94, .93][ns.singularity.getOwnedSourceFiles().filter(obj => { return obj.n === 11 })[0].lvl];

	for (let i = 0; i < desired.length; i++) {
		let budget = ns.getPlayer().money;
		let augs = desired.slice(i);

		let price = 0;
		let currentMult = 1;
		for (let j = 0; j < augs.length; j++) {
			price += augs[j].price * currentMult;
			currentMult *= mult;
		}
		if (price <= budget) {
			budget -= price;

			// Fill with NeuroFlux
			while (neuro != undefined && budget > neuro.price * currentMult) {
				augs.push(neuro);
				budget -= neuro.price * currentMult;
				currentMult *= mult;
			}

			const ret = [];
			currentMult = 1;
			for (let j = 0; j < augs.length; j++) {
				let price = augs[j].price * currentMult;
				currentMult *= mult;
				let entry = {
					name: augs[j].name,
					factions: augs[j].factions,
					price: price,
					rep: augs[j].rep,
					prereq: augs[j].prereq,
					type: augs[j].type
				};
				ret.push(entry);
			}
			return ret;
		}
	}

	return [];
}

function GetMasterList(ns, sortByRep) {
	const masterlist = [];
	for (const faction of Object.values(FactionNames)) {
		let augs = ns.singularity.getAugmentationsFromFaction(faction);
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
		{ color: s.factions.length == 1 ? 'Fuchsia' : 'white', text: (' ' + (s.factions.length == 1 ? 'Unique: ' : '') + s.factions.join(', ')).slice(0, 29) },
		{ color: s.price > playerMoney ? 'red' : 'white', text: ' ' + ns.nFormat(s.price, '0.0a').padStart(6) },
		{ color: ReqRepColor(ns, s), text: ' ' + ns.nFormat(BestRep(ns, s), '0.00a').padStart(7) + ' / ' + ns.nFormat(s.rep, '0.00a').toString().padStart(7) },
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

function ReqRepColor(ns, s) {
	if (MeetsRepRequirement(ns, s)) return 'lime';
	if (BestRep(ns, s) == 0) return 'red'
	return 'orange';
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

function BestRep(ns, aug) {
	let best = 0;
	for (let faction of aug.factions) {
		let rep = ns.singularity.getFactionRep(faction);
		if (rep > best) best = rep;
	}
	return best;
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
	//ns.tprint(keys, Object.values(stats));
	if (aug.startsWith('NeuroFlux')) return 'NeuroFlux';
	if (keys.find(s => s.startsWith('bladeburner') && stats[s] != 1.0)) return 'BladeBurner';
	if (aug == 'CashRoot Starter Kit') return 'Shit'
	if (keys.length == 0) return 'Special';
	if (keys.find(s => s.startsWith('faction_rep') && stats[s] != 1.0)) return 'Faction';
	if (keys.find(s => s.startsWith('hacknet') && stats[s] != 1.0)) return 'Hacknet';
	if (keys.find(s => s.startsWith('hack') && stats[s] != 1.0)) return 'Hacking';
	if (keys.find(s => s.startsWith('charisma') && stats[s] != 1.0)) return 'Charisma';
	if (keys.find(s => s.startsWith('str') && stats[s] != 1.0)) return 'Physical';
	if (keys.find(s => s.startsWith('def') && stats[s] != 1.0)) return 'Physical';
	if (keys.find(s => s.startsWith('dex') && stats[s] != 1.0)) return 'Physical';
	if (keys.find(s => s.startsWith('agi') && stats[s] != 1.0)) return 'Physical';
	if (keys.find(s => s.startsWith('company') && stats[s] != 1.0)) return 'Company';
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