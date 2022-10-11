import { GetAllServers, GetServerPath } from 'utils.js'
import { UpdateBankCache } from 'bank.js'

// sitrep.js: This script caches information on the current situation for use by other scripts
// The main goal is to isolate the gathering of information ram cost.

// X Find coding contracts
// X Find how many program(s) we need to buy
// X Find servers that need ports cracked/nuking
// X Determine how many sleeves we have to work with
// X Determine current karma
// X Determine if we have a gang going or not
// X Save the server tree/paths
// X Determine if any server needs backdooring
// ?Determine if we have 4S access?
// ?Determine if we have stock investments?

/** @param {NS} ns */
export async function main(ns) {
	const bank = UpdateBankCache(ns);

	const report = {
		servers: [],
		portCrackers: 0,
		karma: ns.heart.break(),
		money: ns.getServerMoneyAvailable('home'),
		balance: {
			install: bank.install,
			node: bank.node
		}
		//sleeveCount: ns.sleeve.getNumSleeves(),
		//has4S: ns.stock.has4SDataTIXAPI(),
	};

	try { report.hasGang = ns.gang.inGang(); } catch { }

	const PROGRAMS = [
		'BruteSSH',
		'FTPCrack',
		'relaySMTP',
		'HTTPWorm',
		'SQLInject'
	];

	const MAX_PORTS = PROGRAMS.filter(s => ns.fileExists(s + '.exe')).length;
	report.portCrackers = MAX_PORTS;
	//ns.tprint('INFO: We have access to ' + MAX_PORTS + ' port crackers.');

	const servers = GetAllServers(ns);
	for (const server of servers) {
		const so = ns.getServer(server);

		// Basic information, server name and path
		const entry = {
			name: server,
			path: GetServerPath(ns, server)
		};

		// Check for coding contracts
		const contracts = ns.ls(server, '.cct');
		entry.contracts = contracts;

		// Check the ports/nuke/backdoor situation
		entry.ports = {
			open: so.openPortCount,
			needed: so.numOpenPortsRequired,
			nuked: so.hasAdminRights,
			backdoored: so.backdoorInstalled
		};

		// Difficulty situation
		entry.difficulty = {
			required: so.requiredHackingSkill,
			current: ns.getHackingLevel()
		};

		// Add the server to the report
		report.servers.push(entry);
	}

	ns.write('sitrep.txt', JSON.stringify(report, null, 2), 'w');
	//ns.tprint(JSON.stringify(report));
}

export function GetSitRep(ns) {
	return JSON.parse(ns.read('sitrep.txt'));
}