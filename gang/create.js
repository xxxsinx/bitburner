import { LogMessage } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	if (ns.gang.inGang()) {
		ns.tprint('FAIL: Already in a gang!');
		return;
	}

	let karma = ns.heart.break();
	if (karma > -54000 && ns.getPlayer().bitNodeN != 2) {
		ns.tprint('FAIL: We don\'t have the karma to create a gang yet! Current karma: ' + karma.toFixed(0));
		return;
	}

	if (ns.singularity.checkFactionInvitations().includes('Slum Snakes'))
		ns.singularity.joinFaction('Slum Snakes');

	if (ns.getPlayer().factions.includes('Slum Snakes'))
		ns.gang.createGang('Slum Snakes');

	if (!ns.gang.inGang()) {
		ns.tprint('ERROR: Not in a gang, could not create gang, exiting');
		ns.print('ERROR: Not in a gang, could not create gang, exiting');
		LogMessage(ns, 'ERROR: Not in a gang, could not create gang, exiting');
		return;
	}
	else {
		ns.tprint('SUCCESS: Created a gang with Slum Snakes!');
		ns.print('SUCCESS: Created a gang with Slum Snakes!');
		LogMessage(ns, 'SUCCESS: Created a gang with Slum Snakes!');
	}
}