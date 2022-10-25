import { GetAllServers, FormatMoney, FormatRam, LogMessage } from "utils.js";
import { pctColor, PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

let MAX_SERVERS = 25;

/*
USAGES:

buyserver (no paramters)	: Shows a price list and RAM amount, up to a power of 30 (everything past the dotted line is home upgrade sizes)
buyserver list				: Shows a list of all purchased servers
buyserver <name> <power>	: Buys a server of the specified name and size (size here is a power of 2, from 1-20), a confirmation will be shown
buyserver * <power>			: Buys servers of the specified size until we either hit the MAX_SERVERS limit, or run out of cash. NO CONFIRMATION.
buyserver loop				: Will buy servers in increasing sizes, only upgrading when said server will increase total network ram by 24% or more.
							  Once we hit the limit, it will replace smaller servers with maximum sized servers until all servers are maxed.
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
			{ header: '   RAM', width: 10 },
			{ header: '  Price', width: 10 },
			{ header: '   $/GB', width: 10 }
		];

		const softcap = GetSoftcap(ns);
		if (softcap != 1) {
			data.push([
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
				{ color: color, text: FormatRam(ns, ram, 0).padStart(9) },
				{ color: color, text: FormatMoney(ns, cost, 1).padStart(9) },
				{ color: color, text: FormatMoney(ns, cost / ram, 0).padStart(9) },
			]);

			if (i == 6 && softcap > 1)
				data.push(null);
		}
		PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

		return;
	}

	if (ns.args[0] == 'upgrade') {
		let income = 0;
		for (const [key, value] of Object.entries(ns.getMoneySources().sinceInstall)) if (value > 0) income += value;
		let spentOnServers = Math.abs(ns.getMoneySources().sinceInstall.servers);
		let budget = income * 0.5 - spentOnServers;
		let adjustedBudget = Math.min(budget, ns.getPlayer().money * 0.75);
		//ns.tprint('INFO: Budget is ' + FormatMoney(ns, budget) + '  Adjusted budget is: ' + FormatMoney(ns, adjustedBudget));
		if (adjustedBudget > 0) {
			SpendBudgetOnServers(ns, adjustedBudget);
		}
		//else
		//ns.tprint('FAIL: We\'re still in the red... budget is ' + FormatMoney(ns, budget));
		return;
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

	// Auto buy servers based on gain ratio
	if (ns.args[0] == 'loop') {
		const once = ns.args[1] ?? false;
		await AutoBuyPersonalServers(ns, once);
		return;
	}

	// User wants to buy a server
	var pow = ns.args[1];
	var gb = Math.pow(2, pow);

	var existing = ns.scan().filter(s => s.startsWith('crusher'));

	if (ns.args[0] == '*') {
		while (true) {
			ns.tprint('Buying multiple servers (player money= ' + ns.nFormat(ns.getPlayer().money, '0.00a') + ' server cost= ' + ns.nFormat(ns.getPurchasedServerCost(gb), '0.00a') + ')');
			var nbServers = existing.length;
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

			if (ns.args[2] != 'loop') break;
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

function GetSoftcap(ns) {
	const price6 = ns.getPurchasedServerCost(2 ** 6);
	const price7 = ns.getPurchasedServerCost(2 ** 7);
	const ratio = price7 / price6 / 2;
	return ratio;
}

function PowerFromRam(ns, ram) {
	return Math.log(ram) / Math.log(2);
}

function SpendBudgetOnServers(ns, budget = ns.getPlayer().money) {
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
			default: {
				ns.tprint('FAIL: ?! Invalid buyserver option ?!');
				break;
			}
		}
		budget -= option.cost;
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
		if (currentSize < 2 ** softcapSize) {
			// favor upgrade or buy to softcap
			if (currentSize == 0) {
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
			else {
				const affordable = _.range(softcapSize, 1, -1).find(s => ns.getPurchasedServerUpgradeCost(server, 2 ** s) <= budget);
				if (affordable > PowerFromRam(ns, currentSize)) {
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
		}
		else {
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

	if (ns.singularity.getUpgradeHomeRamCost() <= budget) {
		options.push({
			index: -1,
			action: 'home',
			size: ns.getServerMaxRam('home') * 2,
			oldSize: ns.getServerMaxRam('home'),
			cost: ns.singularity.getUpgradeHomeRamCost(),
			costPerGb: ns.singularity.getUpgradeHomeRamCost() / ns.getServerMaxRam('home')
		});
	}

	options.sort(function (a, b) {
		if (a.costPerGb != b.costPerGb) return b.costPerGb - a.costPerGb;
		if (a.action == 'home') return 1;
		if (b.action == 'home') return -1;
		return b.index - a.index;
	});
	//ns.tprint(JSON.stringify(options, null, 2));
	return options;
}

function GetBestUpgrade(ns) {
	//const networkRam = GetAllServers(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0).reduce((sum, s) => sum + ns.getServerMaxRam(s), 0);
	const budget = ns.getServerMoneyAvailable('home');
	const existingServers = ns.getPurchasedServers();
	const MAX_POW = Math.log(ns.getPurchasedServerMaxRam()) / Math.log(2);

	let best = undefined;

	for (const server of existingServers) {
		const currentRam = ns.getServerMaxRam(server);
		const currentPow = Math.log(currentRam) / Math.log(2);

		for (let i = MAX_POW; i > currentPow; i--) {
			const newRam = Math.pow(2, i);
			const upgradeCost = ns.getPurchasedServerUpgradeCost(server, newRam);
			if (upgradeCost > budget) continue;
			const amount = newRam - currentRam;

			if (best == null || amount > best.amount) {
				best = { server: server, amount: amount, currentRam: currentRam, newRam: newRam, cost: upgradeCost };
			}
		}
	}

	return best;
}

export async function AutoBuyPersonalServers(ns, once) {
	let MAX_SERVER_POW = 20;
	const MIN_GAIN_PCT = 0.24;

	while (true) {
		let networkRam = GetAllServers(ns).filter(s => ns.hasRootAccess(s) && ns.getServerMaxRam(s) > 0).reduce((sum, s) => sum + ns.getServerMaxRam(s), 0);
		let money = ns.getServerMoneyAvailable('home');

		let existingServers = ns.getPurchasedServers();

		let boughtAnything = false;

		for (let pow = MAX_SERVER_POW; pow > 2; pow--) {
			const serverRam = Math.pow(2, pow);
			const serverCost = ns.getPurchasedServerCost(serverRam);
			if (serverCost == Infinity) continue;
			if (serverCost > money) {
				continue;
			}
			const gainRatio = serverRam / networkRam;
			ns.print('INFO: Best personal server we can buy with our money right now is ' +
				ns.nFormat(serverRam * 1000000000, '0.00b') + ' for ' + ns.nFormat(serverCost, '0.00a') + ' at a gain ratio of ' + Math.round(gainRatio * 100) + '%');

			if (gainRatio >= MIN_GAIN_PCT || pow == MAX_SERVER_POW) {
				// ns.tprint('Buying a new personal server...');
				// ns.print('Buying a new personal server...');

				// Upgrade smallest server if we have cash for a bigger one
				if (existingServers.length >= MAX_SERVERS) {
					const toUpgrade = GetBestUpgrade(ns);
					if (toUpgrade != undefined) {
						ns.tprint('Upgrading ' + toUpgrade.server + ' from ' + FormatRam(ns, toUpgrade.currentRam) + ' to ' + FormatRam(ns, toUpgrade.newRam) + ' for ' + FormatMoney(ns, toUpgrade.cost));
						ns.upgradePurchasedServer(toUpgrade.server, toUpgrade.newRam);
						LogMessage(ns, 'Upgrading ' + toUpgrade.server + ' from ' + FormatRam(ns, toUpgrade.currentRam) + ' to ' + FormatRam(ns, toUpgrade.newRam) + ' for ' + FormatMoney(ns, toUpgrade.cost));
					}
					else {
						if (!once)
							ns.tprint('INFO: Server limit of ' + MAX_SERVERS + ' has been reached and all servers are maxed out! Job\'s done!');
						ns.print('INFO: Server limit of ' + MAX_SERVERS + ' has been reached and all servers are maxed out! Job\'s done!');
						return;
					}
					continue;
					// existingServers = existingServers.sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a));
					// let toDelete = existingServers.pop();
					// let smallestSize = ns.getServerMaxRam(toDelete);

					// if (smallestSize < serverRam) {
					// 	if (!once)
					// 		ns.tprint('WARN: Server limit of ' + MAX_SERVERS + ' has been reached, deleting ' + toDelete + ' (smallest server with ' + ns.nFormat(smallestSize * 1000000000, '0.00b') + ')');
					// 	ns.print('WARN: Server limit of ' + MAX_SERVERS + ' has been reached, deleting ' + toDelete + ' (smallest server with ' + ns.nFormat(smallestSize * 1000000000, '0.00b') + ')');

					// 	ns.killall(toDelete);
					// 	await ns.sleep(10);
					// 	ns.deleteServer(toDelete);
					// 	await ns.sleep(10);
					// 	existingServers = ns.getPurchasedServers();
					// 	await ns.sleep(10);
					// }
					// else {
					// 	if (!once)
					// 		ns.tprint('INFO: Server limit of ' + MAX_SERVERS + ' has been reached and all servers are maxed out! Job\'s done!');
					// 	ns.print('INFO: Server limit of ' + MAX_SERVERS + ' has been reached and all servers are maxed out! Job\'s done!');
					// 	return;
					// }
				}

				// Find a name				
				var serverName = GetNewServerName(ns);
				if (!serverName) break;

				ns.tprint('Buying server ' + serverName + ' (' + ns.nFormat(serverRam * 1000000000, '0.00b') + ' for ' + ns.nFormat(serverCost, '0.00a') + ')');
				ns.print('Buying server ' + serverName + ' (' + ns.nFormat(serverRam * 1000000000, '0.00b') + ' for ' + ns.nFormat(serverCost, '0.00a') + ')');
				LogMessage(ns, 'Buying server ' + serverName + ' (' + ns.nFormat(serverRam * 1000000000, '0.00b') + ' for ' + ns.nFormat(serverCost, '0.00a') + ')');
				ns.purchaseServer(serverName, serverRam);

				boughtAnything = true;
				break;
			}

			break;
		}

		if (!boughtAnything && once)
			return;

		await ns.sleep(50);
	}
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