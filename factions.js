import { pctColor, PrintTable, DefaultStyle, ColorPrint } from 'tables.js'
import { GetSitRep } from 'sitrep.js'
import { LogMessage } from 'utils.js'

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

const MilestoneFactions = [
	"CyberSec",
	"NiteSec",
	"The Black Hand",
	"BitRunners",
	"Daedalus",
	"Tian Di Hui"
]


function DaemonMode(ns) {
	const sitrep = GetSitRep(ns);
	return sitrep.hackSkill != undefined && sitrep.daemonSkill != undefined && sitrep.hackSkill >= sitrep.daemonSkill;
}

function PlanedAugsFilter(ns, aug, sitRep) {
	const factions = [...MilestoneFactions];

	if (DaemonMode(ns)) {
		ns.getPlayer().factions.forEach(f => { if (f != FactionNames.ChurchOfTheMachineGod && !factions.includes(f)) factions.push(f) });
	}

	// Add gang to the milestones factions if we got one
	if (sitRep.hasGang)
		factions.push('Slum Snakes');

	// Filter out augs with a rep level too high for our hacking level
	//if (aug.rep > ns.getHackingLevel() * 1000) return false;

	//Filter out stuff not offered by the milestone factions (and tian/gang)
	if (!aug.factions.some(s => factions.includes(s))) {
		//ns.tprint('Rejecting ' + aug.factions + ' != ' + MilestoneFactions)
		return false;
	}

	if (aug.name.startsWith('NeuroFlux')) return false;

	return true;
}

let sitRep = undefined;
let masterlist = undefined;

function GotAllUniques(ns, faction, balance) {
	const uniques = balance.filter(s => s.factions.includes(faction) && s.factions.filter(s => s != 'Aevum' && s != 'Slum Snakes').length == 1);
	return uniques.length == 0;
}

function PrioritizeFactions(ns, fullbalance, suggested) {
	const factions = MilestoneFactions;
	if (DaemonMode(ns)) ns.getPlayer().factions.forEach(f => { if (f != FactionNames.ChurchOfTheMachineGod && !factions.includes(f)) factions.push(f) });

	const balance = fullbalance;//.filter(s=> s.rep < BestRep(ns, s));
	const targetFactions = new Set(); // Best faction order to get what we need
	for (let i = balance.length - 1; i >= 0; i--) {
		const aug = balance[i];
		if (aug.name.startsWith('NeuroFlux')) continue;
		//if (aug.rep >= BestRep(ns, aug)) continue;

		//let choices = factions.filter(s => aug.factions.includes(s) && (!GotAllUniques(ns, s, balance) || DaemonMode(ns))).map(s => {
		let choices = factions.filter(s => aug.factions.includes(s) || DaemonMode(ns)).map(s => {
			return {
				name: s,
				rep: ns.singularity.getFactionRep(s),
				joined: ns.getPlayer().factions.includes(s)
			}
		});

		// if (aug.name == 'Cranial Signal Processors - Gen II') {
		//ns.tprint('choices: ' + JSON.stringify(choices));
		// }
		if (choices.length == 0) {
			choices = factions.filter(s => aug.factions.includes(s) && (!GotAllUniques(ns, s, balance) || DaemonMode(ns)) || aug.factions.some(a => ns.getPlayer().factions.includes(a))).map(s => {
				return {
					name: s,
					rep: ns.singularity.getFactionRep(s),
					joined: ns.getPlayer().factions.includes(s)
				}
			});
		}
		// if (aug.name == 'Cranial Signal Processors - Gen II') {
		//ns.tprint('choices: ' + choices.map(s => s.name));
		// }

		choices.sort(function (a, b) {
			if (a.name == 'Daedalus') return -1;
			if (b.name == 'Daedalus') return 1;
			if (a.joined && !b.joined) return -1;
			if (!a.joined && b.joined) return 1;
			return b.rep - a.rep;
		});

		ns.tprint('WARN: choices: ' + choices.map(s => s.name));

		//ns.tprint(choices);

		if (choices.length == 0) {
			if (aug.factions.includes('Slum Snakes') && sitRep.hasGang) {
				targetFactions.add('Slum Snakes');
			}
			else
				ns.tprint('FAIL: No choice for ' + aug.name);
		}
		else {
			for (let j = 0; j < choices.length; j++) {
				//ns.tprint(ns.getPlayer().factions);
				if (ns.getPlayer().factions.includes(choices[j].name) || ns.singularity.checkFactionInvitations().includes(choices[j].name) || choices[j].name == 'Tian Di Hui') {
					targetFactions.add(choices[j].name);
					//break;
				}
			}
			ns.tprint('FAIL: targets: ' + [...targetFactions]);
			if (targetFactions.length == 0)
				targetFactions.add(choices[0].name);
		}

		// for (let j = MilestoneFactions.length - 1; j >= 0; j--) {
		// 	if (aug.factions.includes(MilestoneFactions[j])) {
		// 		targetFactions.add(MilestoneFactions[j]);
		// 	}
		// }
	}

	ns.tprint('WARN: targets: ' + [...targetFactions]);

	// let nextUnique = undefined;
	// for (let i = balance.length - 1; i >= 0; i--) {
	// 	const aug = balance[i];
	// 	if (aug.name.startsWith('NeuroFlux')) continue;
	// 	if (aug.factions.filter(s => s != 'Slum Snakes').length == 1) {
	// 		if (aug.factions[0] == 'Tian Di Hui') continue;
	// 		nextUnique = aug.factions[0];
	// 		break;
	// 	}
	// }

	// const worstFactions = new Set(); // Worst faction order to get what we need (see use later)

	// if (nextUnique != undefined)
	// 	targetFactions.add(nextUnique);

	// for (let i = balance.length - 1; i >= 0; i--) {
	// 	const aug = balance[i];
	// 	if (aug.name.startsWith('NeuroFlux')) continue;

	// 	// We note which faction is the best to grind for this aug
	// 	for (let j = MilestoneFactions.length - 1; j >= 0; j--) {
	// 		const mile = MilestoneFactions[j];
	// 		if (aug.factions.includes(mile)) {
	// 			targetFactions.add(mile);
	// 			break;
	// 		}
	// 	}

	// 	// We note which faction is the worst to grind for this aug
	// 	for (let j = 0; j < MilestoneFactions.length - 1; j++) {
	// 		const mile = MilestoneFactions[j];
	// 		if (aug.factions.includes(mile)) {
	// 			worstFactions.add(mile);
	// 			break;
	// 		}
	// 	}
	// }

	// // We don't want to grind gang faction rep, our gang does it for us
	// if (targetFactions.has('Slum Snakes')) targetFactions.delete('Slum Snakes');
	// if (worstFactions.has('Slum Snakes')) worstFactions.delete('Slum Snakes');

	// // Add the worse factions at the end of the list. If we don't have the requirements for the
	// // best ones, we can at least join and grind those in the meantime, it's better than doing nothing
	// for (let i = 5; i >= 1; i--) {
	// 	if (targetFactions.has(MilestoneFactions[i]) && worstFactions.has(MilestoneFactions[i - 1]))
	// 		targetFactions.add(MilestoneFactions[i - 1]);
	// }

	// //ns.tprint('targets: ' + [...targetFactions]);
	// // ns.tprint('worst: ' + [...worstFactions]);

	// This will happen at the end once we've got the Red Pill. This bit of code
	// simply adds the milestone factions, ordered by favor, so we can grind them for NFGs.
	const nfgFactions = [];
	let candidates = [...factions];
	if (candidates.length > 0) {
		candidates.sort((a, b) => ns.singularity.getFactionFavor(b) - ns.singularity.getFactionFavor(a));
		nfgFactions.push(...candidates);
	}

	// //ns.tprint(JSON.stringify(suggested, null, 2));

	sitRep = GetSitRep(ns);
	sitRep.targetFactions = [...targetFactions];
	sitRep.suggestedAugs = suggested;
	sitRep.futureAugs = balance;
	sitRep.nfgFactions = nfgFactions;
	ns.write('sitrep.txt', JSON.stringify(sitRep), 'w');

	if (!ns.args.includes('silent')) {
		ns.tprint('WARN: Faction priority is ' + [...targetFactions]);
		ns.tprint('WARN: NFG grind priority is ' + [...nfgFactions]);
	}
}

/** @param {NS} ns **/
export async function main(ns) {
	let blacklist = [];

	do {
		sitRep = GetSitRep(ns);

		masterlist = GetMasterList(ns, ns.args.includes('rep') || ns.args.includes('plan'));
		const ownedAugs = ns.singularity.getOwnedAugmentations(true);

		if (ns.args.includes('plan')) {
			masterlist = masterlist.filter(s => PlanedAugsFilter(ns, s, sitRep));
		}

		const columns = [
			{ header: ' Augmentation', width: 56 },
			{ header: ' Factions', width: 30 },
			{ header: ' Price', width: 8 },
			{ header: ' Req.Rep', width: 19 },
			{ header: ' Pre.Req', width: 40 },
			{ header: ' Type', width: 13 }
		];

		if (ns.args[0] != undefined && ns.args[0].startsWith('mil')) {
			masterlist.sort((a, b) => b.rep - a.rep);

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
		if (ns.args[0] != 'all' && !DaemonMode(ns)) {
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

		let desired = masterlist.filter(s => FilterDesiredAugs(ns, s, sitRep));
		FixOrderForPreReqs(ns, desired);
		let suggested = SuggestedAugs(ns, desired);
		let owned = masterlist.filter(s => ownedAugs.includes(s.name) && !s.name.startsWith('NeuroFlux'));
		let balance = masterlist.filter(s => !desired.includes(s) && !owned.includes(s));

		// Plan mode identifies what augs we're shooting for and more specifically which factions
		// we need to target
		if (ns.args.includes('plan')) {
			PrioritizeFactions(ns, balance, suggested);
			// let nextUnique = undefined;
			// for (let i = balance.length - 1; i >= 0; i--) {
			// 	const aug = balance[i];
			// 	if (aug.name.startsWith('NeuroFlux')) continue;
			// 	if (aug.factions.filter(s => s != 'Slum Snakes').length == 1) {
			// 		if (aug.factions[0] == 'Tian Di Hui') continue;
			// 		nextUnique = aug.factions[0];
			// 		break;
			// 	}
			// }

			// const targetFactions = new Set(); // Best faction order to get what we need
			// const worstFactions = new Set(); // Worst faction order to get what we need (see use later)

			// if (nextUnique != undefined)
			// 	targetFactions.add(nextUnique);

			// for (let i = balance.length - 1; i >= 0; i--) {
			// 	const aug = balance[i];
			// 	if (aug.name.startsWith('NeuroFlux')) continue;

			// 	// We note which faction is the best to grind for this aug
			// 	for (let j = MilestoneFactions.length - 1; j >= 0; j--) {
			// 		const mile = MilestoneFactions[j];
			// 		if (aug.factions.includes(mile)) {
			// 			targetFactions.add(mile);
			// 			break;
			// 		}
			// 	}

			// 	// We note which faction is the worst to grind for this aug
			// 	for (let j = 0; j < MilestoneFactions.length - 1; j++) {
			// 		const mile = MilestoneFactions[j];
			// 		if (aug.factions.includes(mile)) {
			// 			worstFactions.add(mile);
			// 			break;
			// 		}
			// 	}
			// }

			// // We don't want to grind gang faction rep, our gang does it for us
			// if (targetFactions.has('Slum Snakes')) targetFactions.delete('Slum Snakes');
			// if (worstFactions.has('Slum Snakes')) worstFactions.delete('Slum Snakes');

			// // Add the worse factions at the end of the list. If we don't have the requirements for the
			// // best ones, we can at least join and grind those in the meantime, it's better than doing nothing
			// for (let i = 5; i >= 1; i--) {
			// 	if (targetFactions.has(MilestoneFactions[i]) && worstFactions.has(MilestoneFactions[i - 1]))
			// 		targetFactions.add(MilestoneFactions[i - 1]);
			// }

			// //ns.tprint('targets: ' + [...targetFactions]);
			// // ns.tprint('worst: ' + [...worstFactions]);

			// // This will happen at the end once we've got the Red Pill. This bit of code
			// // simply adds the milestone factions, ordered by favor, so we can grind them for NFGs.
			// if ([...targetFactions].length == 0) {
			// 	let candidates = MilestoneFactions.map(s => s).filter(s => s != 'Slum Snakes');
			// 	if (candidates.length > 0) {
			// 		candidates.sort((a, b) => ns.singularity.getFactionFavor(b) - ns.singularity.getFactionFavor(a));
			// 		targetFactions.add(candidates[0]);
			// 	}
			// }

			// //ns.tprint(JSON.stringify(suggested, null, 2));

			// sitRep = GetSitRep(ns);
			// sitRep.targetFactions = [...targetFactions];
			// sitRep.suggestedAugs = suggested;
			// ns.write('sitrep.txt', JSON.stringify(sitRep), 'w');
			if (ns.args.includes('silent')) return;
		}

		let desiredData = ToColumnData(ns, desired, ' No desirable augmentations found!');
		let suggestedData = ToColumnData(ns, suggested, ' No suggested augmentations found!');
		let balanceData = ToColumnData(ns, balance, ' No interesting augmentations found!');
		let ownedData = ToColumnData(ns, owned, ' No augmentations installed yet!');

		if (ns.args[0] != undefined && ns.args[0].startsWith('ins')) {
			let hasNeufo = ns.singularity.getOwnedAugmentations(true).find(s => s.startsWith('NeuroFlux'));
			columns[0].header = ' Installed Augmentations (' + (owned.length + (hasNeufo ? 1 : 0)) + ')';
			PrintTable(ns, ownedData, columns, DefaultStyle(), ColorPrint);
		}
		else if (!ns.args.includes('silent')) {
			columns[0].header = ' Suggested Buy Order';
			PrintTable(ns, suggestedData, columns, DefaultStyle(), ColorPrint);

			columns[0].header = ' Buyable';
			PrintTable(ns, desiredData, columns, DefaultStyle(), ColorPrint);

			columns[0].header = ' Wanted but locked (by faction/prereq/$/rep)';
			PrintTable(ns, balanceData, columns, DefaultStyle(), ColorPrint);
		}

		if (ns.args.includes('buy')) {
			if (suggested.filter(s => !blacklist.includes(s.name)).length < 1) {
				if (!ns.args.includes('silent'))
					ns.tprint('FAIL: Cannot buy any augmentation right now');
				return;
			}

			for (let aug of suggested.filter(s => !blacklist.includes(s.name))) {
				let faction = MeetsRepRequirement(ns, aug);
				if (faction && ns.singularity.purchaseAugmentation(faction, aug.name)) {
					ns.tprint('SUCCES: Bought ' + aug.name + ' from ' + faction);
					LogMessage(ns, 'SUCCES: Bought ' + aug.name + ' from ' + faction);
					break;
				}
				else {
					ns.tprint('FAIL: Cannot buy ' + aug.name + ' from ' + faction + ' ?!' +
						' estimated cost: ' + ns.nFormat(aug.price, '0.00a') +
						' actual cost: ' + ns.nFormat(ns.singularity.getAugmentationPrice(aug.name), '0.00a') +
						' money: ' + ns.nFormat(ns.getPlayer().money, '0.00a'));
					blacklist.push(aug.name);
					continue;
				}
			}

			//ns.tprint('INFO: Sleeping between buys!');
			await ns.sleep(0);
		}
	}
	while (ns.args.includes('buy'))
}

function SuggestedAugs(ns, desired) {
	let neuro = desired.find(s => s.name.startsWith('NeuroFlux'));
	desired = desired.filter(s => !s.name.startsWith('NeuroFlux'));
	let mult = 1.9 * [1, .96, .94, .93][ns.singularity.getOwnedSourceFiles().filter(obj => { return obj.n === 11 })[0].lvl];
	let budget = ns.getPlayer().money;
	let augs = undefined;
	let currentMult = 1;

	desired.sort((a, b) => b.price - a.price);
	FixOrderForPreReqs(ns, desired);

	for (let i = 0; i < desired.length; i++) {
		budget = ns.getPlayer().money;
		augs = desired.slice(i);

		let price = 0;
		currentMult = 1;
		for (let j = 0; j < augs.length; j++) {
			price += augs[j].price * currentMult;
			currentMult *= mult;
		}
		if (price <= budget) {
			budget -= price;
			break;
		}
	}

	let ret = [];
	if (augs == undefined) augs = [];

	// Fill with NeuroFlux
	while (neuro != undefined && budget > neuro.price * currentMult && BestRep(ns, neuro) >= neuro.rep) {
		augs.push(neuro);
		budget -= neuro.price * currentMult;
		currentMult *= mult;
		neuro.price *= 1.14;
		neuro.rep *= 1.14;
	}

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

function FixOrderForPreReqs(ns, list) {
	for (let i = 0; i < list.length;) {
		const aug = list[i];
		if (aug.prereq.length > 0) {
			for (let prereq of aug.prereq) {
				let pos = list.findIndex(s => s.name == prereq);
				if (pos != -1 && pos > i) {
					//ns.tprint(aug.name + ' needs to be moved after ' + prereq);
					list.splice(i, 1);
					list.splice(pos, 0, aug);
					continue;
				}
			}
		}
		i++;
	}
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
		masterlist.sort((a, b) => (b.rep - BestRep(ns, b)) - (a.rep - BestRep(ns, a)));
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
	return 'yellow';
}

function FilterDesiredAugs(ns, s) {
	// Remove factions we are not yet part of
	if (intersect(s.factions, ns.getPlayer().factions).length == 0) { return false; }

	// Remove augs we have in queue or already installed
	if (ns.singularity.getOwnedAugmentations(true).includes(s.name) && !s.name.startsWith('NeuroFlux')) { return false; }

	// Remove BladeBurner
	if (s.factions.length == 1 && s.factions.includes('Bladeburners')) { return false; }

	// Remove Physical, charisma, company, shit
	if (!DaemonMode(ns)) {
		if (s.type == 'Physical') { return false; }
		if (s.type == 'Charisma') { return false; }
		if (s.type == 'Company') { return false; }
		if (s.type == 'Shit') { return false; }
	}

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
	if (aug.type == 'Physical' || aug.type == 'Charisma' || aug.type == 'Shit' || aug.type == 'Company') return 'Grey'
	if (!MeetsPreReq(ns, aug)) return 'darkorange';

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
		if (rep >= ns.singularity.getAugmentationRepReq(aug.name)) return faction;
	}
	return false;
}

function MeetsPreReq(ns, aug) {
	const owned = ns.singularity.getOwnedAugmentations(true);
	for (let req of aug.prereq) {
		if (!owned.includes(req) /*&& !MeetsPreReq(ns, req)*/) {
			let preReqAug = masterlist.find(s => s.name == req);
			if (preReqAug == undefined) {
				return false;
			}
			if (!MeetsPreReq(ns, preReqAug))
				return false;
		}
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
			return 'aqua';
		case 'Shit':
			return 'brown';
		case 'BladeBurner':
			return 'Grey';
		case 'Special':
			return 'aqua';
		case 'Faction':
			return 'yellow'
		case 'Hacknet':
			return 'orange'
		case 'Hacking':
			return 'lime'
		case 'Charisma':
			return 'Grey';
		case 'Physical':
			return 'Grey';
		case 'Company':
			return 'Grey';
		case '???':
			return 'Grey';
		default:
			return 'red';
	}
}