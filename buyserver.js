import { GetAllServers, FormatMoney, FormatRam, LogMessage } from "utils.js";
import { pctColor, PrintTable, DefaultStyle, ColorPrint } from 'tables.js'
import { GetSitRep } from 'sitrep.js'

let MAX_SERVERS = 25;

// *************************************************************************
// **** IMPORTANT NOTES ON THIS SCRIPT'S RAM USAGE AND POSSIBLE CRASH ******
// *************************************************************************
//
// This script uses Singularity, which is a subset of the API you only get
// access to in endgame (after finishing the game for the first time).
// Before getting acces to this, the RAM cost of those functions is severely
// inflated and will make running this script as-is almost impossible for
// most users unless they have some significant home ram upgrades, AND will
// also crash even if they manage to do so.
// Please search for the term "Singulariy" within this script and comment
// out all the identified blocks if you are experiencing a singularity
// related crash, or if the ram usage of this script is over 17.85GB.
//
// *************************************************************************
// *************************************************************************
// *************************************************************************

/*
USAGES:

buyserver (no paramters)	: Shows a price list and RAM amount, up to a power of 30 (everything past the dotted line is home upgrade sizes)
buyserver list				: Shows a list of all purchased servers
buyserver <name> <power>	: Buys a server of the specified name and size (size here is a power of 2, from 1-20), a confirmation will be shown
buyserver * <power>			: Buys servers of the specified size until we either hit the MAX_SERVERS limit, or run out of cash. NO CONFIRMATION.
buyserver loop				: Will buy and/or upgrade servers in increasing sizes, using the most cost effective path as possible.
buyserver upgrade			: Same as loop, but only does one loop. Will spend up to budget and die.
buyserver delete <name>		: Delete the specified server, a confirmation will be shown.
*/

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	MAX_SERVERS = ns.getPurchasedServerLimit();

	// No parameter, we list the menu
	if (ns.args[0] == null && ns.args[1] == null) {
		const data = [];
		const columns = [
			{ header: '  Power', width: 10 },
			{ header: '   RAM', width: 20 },
			{ header: '  Price', width: 10 },
			{ header: '   $/GB', width: 10 }
		];

		const softcap = GetSoftcap(ns);
		if (softcap != 1) {
			data.push([
				{ color: '', text: 'N/A'.padStart(9) },
				{ color: 'yellow', text: ' Softcap' },
				{ color: 'yellow', text: softcap.toString().padStart(9) },
				{ color: '', text: 'N/A'.padStart(9) }
			]);
			data.push(null);
		}

		for (let i = 1; i <= 20; i++) {
			const ram = Math.pow(2, i);
			const cost = ns.getPurchasedServerCost(ram);
			if (cost == Infinity) continue;

			const color = softcap > 1 && i > 6 ? 'yellow' : 'white'
			data.push([
				{ color: color, text: i.toString().padStart(9) },
				{ color: color, text: FormatRam(ns, ram, 0).padStart(19) },
				{ color: color, text: FormatMoney(ns, cost, 1).padStart(9) },
				{ color: color, text: FormatMoney(ns, cost / ram, 0).padStart(9) },
			]);

			if (i == 6 && softcap > 1)
				data.push(null);
		}

		// *************************************************************************
		// ****** COMMENT THE FOLLOWING BLOCK IF YOU DO NOT HAVE SINGULARITY *******
		// *************************************************************************
		if (ns.getServerMaxRam('home') < Math.pow(2, 30)) {
			const ram = ns.getServerMaxRam('home');
			const cost = ns.singularity.getUpgradeHomeRamCost();

			data.push(null);

			data.push([
				{ color: 'white', text: 'Home'.padStart(9) },
				{ color: 'white', text: `${FormatRam(ns, ram, 0)} => ${FormatRam(ns, ram * 2, 0)}`.padStart(19) },
				{ color: 'white', text: FormatMoney(ns, cost, 1).padStart(9) },
				{ color: 'white', text: FormatMoney(ns, cost / ram, 0).padStart(9) },
			]);
		}
		// *************************************************************************
		// *************************************************************************
		// *************************************************************************

		PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

		return;
	}

	if (ns.args[0] == 'upgrade' || ns.args[0] == 'loop') {
		while (true) {
			let budget = GetBudget(ns);
			//ns.tprint('budget: ' + FormatMoney(ns, budget));
			if (budget > 0) {
				await SpendBudgetOnServers(ns, budget);
			}
			if (ns.args[0] != 'loop') return;
			await ns.sleep(10000);
		}
	}

	if (ns.args[0] == 'delete' && ns.args[1] == 'all') {
		var resp = await ns.prompt('?! Confirm DELETE of ALL servers ?!');
		if (resp == false) {
			ns.tprint("Transaction aborted.");
			ns.exit();
		}

		ns.getPurchasedServers().forEach((s) => {
			ns.killall(s);
			ns.deleteServer(s);
			ns.tprint("Server deleted.");
		})

		return;
	}

	// User wants to delete a server
	if (ns.args[0] == 'delete') {
		var resp = await ns.prompt('Confirm DELETE of server named ' + ns.args[1]);
		if (resp == false) {
			ns.tprint("Transaction aborted.");
			ns.exit();
		}

		ns.killall(ns.args[1]);
		ns.deleteServer(ns.args[1]);
		ns.tprint("Server deleted.");

		return;
	}

	// User wants the list of owned servers
	if (ns.args[0] == 'list') {
		var servers = ns.getPurchasedServers();

		const data = [];
		const columns = [
			{ header: ' Name', width: 25 },
			{ header: ' RAM', width: 10 }
		];

		for (var server of servers) {
			data.push([
				{ color: 'white', text: ' ' + server },
				{ color: 'white', text: FormatRam(ns, ns.getServerMaxRam(server)).padStart(9) }
			]);
		}

		PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

		return;
	}

	// User wants to buy a server
	var pow = ns.args[1];
	var gb = Math.pow(2, pow);

	var existing = ns.scan().filter(s => s.startsWith('crusher'));

	if (ns.args[0] == '*') {
		while (true) {
			ns.tprint('Buying multiple servers (player money= ' + ns.nFormat(ns.getPlayer().money, '0.00a') + ' server cost= ' + ns.nFormat(ns.getPurchasedServerCost(gb), '0.00a') + ')');
			while (ns.getPurchasedServerCost(gb) < ns.getPlayer().money && nbServers < 25) {
				var found = false;
				var serverName = undefined;
				for (var i = 1; i <= 25; i++) {
					if (!existing.find(p => p == 'crusher-' + i)) {
						serverName = 'crusher-' + i;
						found = true;
						break;
					}
				}

				if (!found) {
					ns.tprint('Could not find suitable name, aborting.');
					ns.exit();
				}

				ns.tprint('Buying server ' + serverName);
				ns.purchaseServer(serverName, gb);
				nbServers++;
				existing.push(serverName);
			}

			await ns.sleep(1000);
		}
	}
	else {
		var resp = await ns.prompt('Confirm purchase of server named ' + ns.args[0] + ' with ' + FormatRam(ns, gb) + ' RAM for ' + FormatMoney(ns, ns.getPurchasedServerCost(2 ** pow)));
		if (resp == false) {
			ns.tprint("Transaction aborted.");
			return;
		}

		ns.tprint('Confirming transaction');
		ns.purchaseServer(ns.args[0], gb);
	}
}

function GetBudget(ns) {
	let sitrep = GetSitRep(ns);
	return sitrep.ramBudget ?? getPlayer().money;
}

function GetSoftcap(ns) {
	const price6 = ns.getPurchasedServerCost(2 ** 6);
	const price7 = ns.getPurchasedServerCost(2 ** 7);
	const ratio = price7 / price6 / 2;
	return ratio;
}

const PowerFromRam = (ram) => Math.log2(ram);

async function SpendBudgetOnServers(ns, budget = ns.getPlayer().money) {
	let beforeRam = ns.getPurchasedServers().reduce((sum, s) => sum + ns.getServerMaxRam(s), 0);
	let totalUpgradeCost = 0;

	while (true) {
		const options = GetAvailableOptions(ns, budget);
		if (options.length == 0) {
			//ns.tprint('INFO: No valid buy/upgrade options currently available!');
			break;
		}
		//ns.tprint(JSON.stringify(options, null, 2));
		const option = options.pop();
		switch (option.action) {
			case 'buy': {
				const serverName = GetNewServerName(ns);
				if (serverName == undefined) continue;
				ns.purchaseServer(serverName, option.size);
				ns.tprint('Buying server ' + serverName + ' (' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
				ns.print('Buying server ' + serverName + ' (' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
				LogMessage(ns, 'Buying server ' + serverName + ' (' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
				break;
			}
			case 'upgrade': {
				const serverName = option.server;
				ns.upgradePurchasedServer(serverName, option.size);
				// ns.tprint('Upgrading server ' + serverName + ' (from ' + FormatRam(ns, option.oldSize) + ' to ' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
				// ns.print('Upgrading server ' + serverName + ' (from ' + FormatRam(ns, option.oldSize) + ' to ' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
				LogMessage(ns, 'Upgrading server ' + serverName + ' (from ' + FormatRam(ns, option.oldSize) + ' to ' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
				totalUpgradeCost += option.cost;
				break;
			}
			// *************************************************************************
			// ****** COMMENT THE FOLLOWING BLOCK IF YOU DO NOT HAVE SINGULARITY *******
			// *************************************************************************
			case 'home': {
				if (ns.singularity.upgradeHomeRam()) {
					ns.tprint('Upgrading home RAM (from ' + FormatRam(ns, option.oldSize) + ' to ' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
					ns.print('Upgrading home RAM (from ' + FormatRam(ns, option.oldSize) + ' to ' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
					LogMessage(ns, 'Upgrading home RAM (from ' + FormatRam(ns, option.oldSize) + ' to ' + FormatRam(ns, option.size) + ' for ' + FormatMoney(ns, option.cost) + ')');
				}
				else {
					ns.tprint('FAIL: ?! Could not upgrade home ram ?!');
				}
				break;
			}
			// *************************************************************************
			// *************************************************************************
			// *************************************************************************
			default: {
				ns.tprint('FAIL: ?! Invalid buyserver option ?!');
				break;
			}
		}
		budget -= option.cost;
		//ns.tprint('WARN: Waiting 1s');
		//await ns.sleep(0);
	}

	let afterRam = ns.getPurchasedServers().reduce((sum, s) => sum + ns.getServerMaxRam(s), 0);

	if (afterRam > beforeRam) {
		ns.tprint('Upgraded server(s) (from ' + FormatRam(ns, beforeRam) + ' to ' + FormatRam(ns, afterRam) + ' for ' + FormatMoney(ns, totalUpgradeCost) + ')');
		ns.print('Upgraded server(s) (from ' + FormatRam(ns, beforeRam) + ' to ' + FormatRam(ns, afterRam) + ' for ' + FormatMoney(ns, totalUpgradeCost) + ')');
	}
}

// Priotities: Upgrade to softcap, buy to softcap, upgrade lowest
function GetAvailableOptions(ns, budget = ns.getPlayer().money) {
	let networkRam = GetAllServers(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0).reduce((sum, s) => sum + ns.getServerMaxRam(s), 0);
	const servers = ns.getPurchasedServers();
	const softcap = GetSoftcap(ns);
	const options = [];
	for (let i = 0; i < ns.getPurchasedServerLimit(); i++) {
		const server = servers[i];
		const currentSize = !server ? 0 : ns.getServerMaxRam(servers[i]);
		if (currentSize == ns.getPurchasedServerMaxRam()) continue;
		const softcapSize = softcap > 1 ? 6 : PowerFromRam(ns.getPurchasedServerMaxRam());
		if (currentSize == 0) {
			//ns.tprint('WARN: New server? softcapSize='+softcapSize);
			const affordable = _.range(softcapSize, 1, -1).find(s => ns.getPurchasedServerCost(2 ** s) <= budget);
			if (affordable > 0) {
				options.push({
					index: i,
					server: 'N/A',
					action: 'buy',
					size: 2 ** affordable,
					oldSize: 0,
					cost: ns.getPurchasedServerCost(2 ** affordable),
					costPerGb: ns.getPurchasedServerCost(2 ** affordable) / (2 ** affordable)
				});
			}
		}
		else if (currentSize < 2 ** softcapSize) {
			//ns.tprint('WARN: Upgrade small one?')
			// favor upgrade or buy to softcap
			const affordable = _.range(softcapSize, 1, -1).find(s => ns.getPurchasedServerUpgradeCost(server, 2 ** s) <= budget);
			if (affordable > PowerFromRam(currentSize)) {
				options.push({
					index: i,
					server: server,
					action: 'upgrade',
					size: 2 ** affordable,
					oldSize: currentSize,
					cost: ns.getPurchasedServerUpgradeCost(server, 2 ** affordable),
					costPerGb: ns.getPurchasedServerUpgradeCost(server, 2 ** affordable) / (2 ** affordable - currentSize)
				});
			}
		}
		else {
			//ns.tprint('WARN: Upgrade big one?')
			if (ns.getPurchasedServerUpgradeCost(server, currentSize * 2) <= budget) {
				options.push({
					index: i,
					server: server,
					action: 'upgrade',
					size: currentSize * 2,
					oldSize: currentSize,
					cost: ns.getPurchasedServerUpgradeCost(server, currentSize * 2),
					costPerGb: ns.getPurchasedServerUpgradeCost(server, currentSize * 2) / currentSize
				});
			}
		}
	}

	// *************************************************************************
	// ****** COMMENT THE FOLLOWING BLOCK IF YOU DO NOT HAVE SINGULARITY *******
	// *************************************************************************
	if (ns.singularity.getUpgradeHomeRamCost() <= budget && ns.getServerMaxRam('home') < Math.pow(2, 30)) {
		//ns.tprint('home upg cost is ' + FormatMoney(ns, ns.singularity.getUpgradeHomeRamCost()))
		options.push({
			index: -1,
			action: 'home',
			size: ns.getServerMaxRam('home') * 2,
			oldSize: ns.getServerMaxRam('home'),
			cost: ns.singularity.getUpgradeHomeRamCost(),
			costPerGb: ns.singularity.getUpgradeHomeRamCost() / ns.getServerMaxRam('home')
		});
	}
	// *************************************************************************
	// *************************************************************************
	// *************************************************************************

	options.sort(function (a, b) {
		if (a.costPerGb != b.costPerGb) return b.costPerGb - a.costPerGb;
		if (a.action == 'home') return 1;
		if (b.action == 'home') return -1;
		return b.index - a.index;
	});
	//ns.tprint(JSON.stringify(options, null, 2));
	return options;
}

function GetNewServerName(ns) {
	// Find a name				
	for (var i = 1; i <= MAX_SERVERS; i++) {
		if (!ns.getPurchasedServers().find(p => p == 'crusher-' + i))
			return 'crusher-' + i;
	}
	ns.tprint('ERROR: Could not find suitable name, aborting.');
	ns.print('ERROR: Could not find suitable name, aborting.');
	return undefined;
}