/** @param {NS} ns */
export async function main(ns) {
	//await ApplyWorkReputation(ns);
}

async function ApplyWorkReputation(ns) {
	let current = ns.singularity.getCurrentWork();

	//{ "type": "FACTION", "cyclesWorked": 1621, "factionWorkType": "HACKING", "factionName": "CyberSec" }

	if (current?.type != 'FACTION') {
		ns.tprint('FAIL: current?.type = ' + current?.type);
		return;
	}
	if (current?.factionWorkType != 'HACKING') {
		ns.tprint('FAIL: current?.factionWorkType = ' + current?.factionWorkType);
		return;
	}

	//ns.singularity.stoo();
	await ns.sleep(100);
	//ns.singularity.workForFaction(current.factionName, 'Hacking Contracts', false);
	ns.tprint(JSON.stringify(current));
	ns.singularity.workForFaction(current.factionName, 'HACKING', false);
	await ns.sleep(100);
}