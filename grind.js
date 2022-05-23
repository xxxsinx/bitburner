import { WaitPids } from 'prep.js';

const factions = [
	'CyberSec',
	'Tian Di Hui',
	'Netburners',
	'Sector-12',
	'Aevum',
	'Volhaven',
	'Ishima',
	'Chongqing',
	'New Tokyo',
	'NiteSec',
	'The Black Hand',
	'BitRunners',
	'ECorp',
	'MegaCorp',
	'KuaiGong International',
	'Four Sigma',
	'NWO',
	'Blade Industries',
	'OmniTek Incorporated',
	'Bachman & Associates',
	'Clarke Incorporated',
	'Fulcrum Secret Technologies',
	'Slum Snakes',
	'Tetrads',
	'Silhouette',
	'Speakers for the Dead',
	'The Dark Army',
	'The Syndicate',
	'The Covenant',
	'Daedalus',
	'Illuminati'
];

let eastBlock = ['Sector-12', 'Aevum', 'Volhaven']

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('sleep');

	await ns.sleep(2500);

	let mustHave = [
		'CyberSec',
		'Tian Di Hui',
		'Netburners',
		'Ishima',
		'Chongqing',
		'New Tokyo',
		'NiteSec',
		'The Black Hand',
		'BitRunners',
		'Slum Snakes',
		'Tetrads',
		//'The Syndicate',
		'The Covenant',
		'Daedalus',
		'Illuminati'
	];

	ns.singularity.purchaseTor();
	ns.purchaseProgram("BruteSSH.exe");
	ns.purchaseProgram("FTPCrack.exe");
	ns.purchaseProgram("relaySMTP.exe");
	ns.purchaseProgram("SQLInject.exe");
	ns.purchaseProgram("HTTPWorm.exe");
	ns.purchaseProgram("ServerProfiler.exe");
	ns.purchaseProgram("DeepscanV2.exe");

	await WaitPids(ns, ns.run('breach.js', 1));
	await WaitPids(ns, ns.run('sleeves.js', 1, 'study'));
	ns.singularity.travelToCity('Volhaven');
	ns.singularity.universityCourse('ZB Institute of Technology', 'Algorithms', false);
	await ns.sleep(1000);

	await WaitPids(ns, ns.run('installBackdoor.js', 1));

	ns.hacknet.purchaseNode();
	ns.hacknet.upgradeLevel(0, ns.formulas.hacknetServers.constants().MaxLevel);
	ns.hacknet.upgradeRam(0, ns.formulas.hacknetServers.constants().MaxRam);
	ns.hacknet.upgradeCore(0, ns.formulas.hacknetServers.constants().MaxCores);
	ns.hacknet.upgradeCache(0, ns.formulas.hacknetServers.constants().MaxCache);

	while (!ns.singularity.travelToCity('Chongqing')) {
		ns.tprint('FAIL: Failed to travel to Chongqing');
		await ns.sleep(1000);
	}
	await WaitAndAcceptFactionInvite(ns, 'Chongqing');
	await WaitAndAcceptFactionInvite(ns, 'Tian Di Hui');
	ns.singularity.travelToCity('New Tokyo');
	await WaitAndAcceptFactionInvite(ns, 'New Tokyo');
	ns.singularity.travelToCity('Ishima');
	await WaitAndAcceptFactionInvite(ns, 'Ishima');


	await WaitAndAcceptFactionInvite(ns, 'CyberSec');
	await WaitAndAcceptFactionInvite(ns, 'NiteSec');
	await WaitAndAcceptFactionInvite(ns, 'The Black Hand');
	await WaitAndAcceptFactionInvite(ns, 'BitRunners');
	await WaitAndAcceptFactionInvite(ns, 'Daedalus');

	let joined = ns.getPlayer().factions;
	let missing = mustHave.filter(s => !joined.includes(s));

	if (missing.length > 0)
		ns.tprint('FAIL: Failed to join the following factions:\n' + missing.join('\n'));

	ns.tprint('INFO: Joined all targeted factions!');

	ns.singularity.softReset('grind.js');
}

async function WaitAndAcceptFactionInvite(ns, faction) {
	while (true) {
		let invites = ns.singularity.checkFactionInvitations();
		for (let invite of invites) {
			if (eastBlock.includes(invite)) {
				ns.tprint('WARN: Refusing faction invite from ' + invite);
				continue;
			}
			ns.tprint('INFO: Joining faction ' + invite);
			ns.singularity.joinFaction(invite);
		}
		if (ns.getPlayer().factions.includes(faction)) return;
		ns.tprint('WARN: Waiting for faction invite from ' + faction);
		await ns.sleep(1000);
	}
}