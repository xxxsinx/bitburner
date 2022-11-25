import { GetSitRep } from 'sitrep.js'
import { FormatMoney, LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	const sitrep = GetSitRep(ns);
	//if (sitrep.targetFactions == undefined || sitrep.targetFactions.length == 0) return;

	const allowed = ['Daedalus', 'BitRunners'];

	for (const faction of allowed) {
		//ns.tprint(faction);

		if (!allowed.includes(faction)) continue;
		if (!ns.getPlayer().factions.includes(faction)) continue;
		if (ns.singularity.getFactionFavor(faction) < 150) continue;

		//ns.tprint('INFO: Maybe we should donate to ' + faction + '?');

		// if (sitrep.futureAugs == null) {
		// 	ns.tprint('FAIL: sitrep.futureAugs is null?');
		// 	continue;
		// }

		let factionAugs = sitrep.futureAugs?.filter(s => s.factions.includes(faction)) ?? [];
		if (factionAugs.length == 0) {
			let neuro = 'NeuroFlux Governor';
			let mult = 1.9 * [1, .96, .94, .93][ns.singularity.getOwnedSourceFiles().filter(obj => { return obj.n === 11 })[0].lvl];
			for (let i = 0; i < 100; i++) {
				let entry = {
					name: neuro,
					factions: [faction],
					price: ns.singularity.getAugmentationPrice(neuro) * (i * 1.14 * mult),
					rep: ns.singularity.getAugmentationRepReq(neuro) * (i * 1.14),
					prereq: [],
					type: 'NeuroFlux'
				};

				factionAugs.push(entry);
			}
		}

		//ns.tprint(JSON.stringify(factionAugs));
		const factionRep = ns.singularity.getFactionRep(faction);

		let tobuy = 0;
		for (const aug of factionAugs) {
			let missing = aug.rep - factionRep;
			//ns.tprint(missing);
			if (missing <= 0) continue;
			if (missing < tobuy || tobuy == 0)
				tobuy = missing;
		}

		ns.tprint(tobuy);

		if (tobuy > 0) {
			let cost = (tobuy * (10 ** 6)) / ns.getPlayer().mults.faction_rep;
			ns.tprint('INFO: We need ' + ns.nFormat(tobuy, '0.000a') + ' rep for ' + faction + '. Cost would be : ', ns.nFormat(cost, '0.000a'));
			if (cost * 1.25 < ns.getServerMoneyAvailable('home')) {
				ns.tprint('INFO: Donated ' + FormatMoney(ns, cost) + ' to ' + faction);
				LogMessage(ns, 'INFO: Donated ' + FormatMoney(ns, cost) + ' to ' + faction);
				ns.singularity.donateToFaction(faction, cost);
			}
		}

		return;
	}
}