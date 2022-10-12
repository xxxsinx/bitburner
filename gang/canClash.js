import { GetSitRep } from 'sitrep.js';

const GANG_FACTIONS = [
	'Slum Snakes',
	'Tetrads',
	'The Syndicate',
	'The Dark Army',
	'Speakers for the Dead',
	'NiteSec',
	'The Black Hand'
];

const MIN_CLASH_CHANCE = 0.55;

/** @param {NS} ns */
export async function main(ns) {
	const [myGang = 'Slum Snakes', threshold = MIN_CLASH_CHANCE] = ns.args;
	let can= CanClash(ns, myGang, threshold);
	//ns.tprint('Can clash: ' + can);
}

export function CanClash(ns, myGang = 'Slum Snakes', threshold = MIN_CLASH_CHANCE) {
	const sitrep = GetSitRep(ns);
	let canClash = false;
	try { canClash = !GANG_FACTIONS.some(s => s != myGang && ns.gang.getChanceToWinClash(s) < threshold); } catch { }
	sitrep.canClash = canClash;
	ns.write('sitrep.txt', JSON.stringify(sitrep), 'w');
	return canClash;
}