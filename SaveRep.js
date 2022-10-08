/** @param {NS} ns */
export async function main(ns) {
	HackingContracts.ApplyWorkReputation(ns);
}

export class HackingContracts {
	static ApplyWorkReputation(ns) {
		let player = ns.getPlayer();
		if (player.workType != 'Working for Faction') return;
		if (player.currentWorkFactionDescription != 'carrying out hacking contracts') return;
		ns.singularity.workForFaction(player.currentWorkFactionName, 'Hacking Contracts', false);
	}
}