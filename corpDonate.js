/** @param {NS} ns */
export async function main(ns) {
	try {
		const api = eval('ns.corporation');
		if (!api.getCorporation().public) {
			ns.tprint('WARN: Corporation is not public, cannot donate.');
		}
		if (api.getCorporation().public == 1 && api.getCorporation().funds > 1e30) {
			for (let faction of ns.singularity.checkFactionInvitations())
				ns.singularity.joinFaction(faction);

			for (const faction of ns.getPlayer().factions) {
				if (api.bribe(faction, 1e24))
					ns.tprint('WARN: Donated to ' + faction);
			}
		}
	}
	catch { }
}