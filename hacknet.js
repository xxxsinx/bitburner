// getCacheUpgradeCost(index, n)	Calculate the cost of upgrading hacknet node cache.
// getCoreUpgradeCost(index, n)		Calculate the cost of upgrading hacknet node cores.
// getHashUpgradeLevel(upgName)		Get the level of a hash upgrade.
// getHashUpgrades()				Get the list of hash upgrades
// getLevelUpgradeCost(index, n)	Calculate the cost of upgrading hacknet node levels.
// getNodeStats(index)				Get the stats of a hacknet node.
// getPurchaseNodeCost()			Get the price of the next hacknet node.
// getRamUpgradeCost(index, n)		Calculate the cost of upgrading hacknet node RAM.
// getStudyMult()					Get the multiplier to study.
// getTrainingMult()				Get the multiplier to training.
// hashCapacity()					Get the maximum number of hashes you can store.
// hashCost(upgName)				Get the cost of a hash upgrade.
// maxNumNodes()					Get the maximum number of hacknet nodes.
// numHashes()						Get the total number of hashes stored.
// numNodes()						Get the number of hacknet nodes you own.
// purchaseNode()					Purchase a new hacknet node.
// spendHashes(upgName, upgTarget)	Purchase a hash upgrade.
// upgradeCache(index, n)			Upgrade the cache of a hacknet node.
// upgradeCore(index, n)			Upgrade the core of a hacknet node.
// upgradeLevel(index, n)			Upgrade the level of a hacknet node.
// upgradeRam(index, n)				Upgrade the RAM of a hacknet node.

// *** HACKNET NODES ***
// constants()												All constants used by the game.
// coreUpgradeCost(startingCore, extraCores, costMult)		Calculate cost of upgrading hacknet node cores.
// hacknetNodeCost(n, mult)									Calculate the cost of a hacknet node.
// levelUpgradeCost(startingLevel, extraLevels, costMult)	Calculate cost of upgrading hacknet node level.
// moneyGainRate(level, ram, cores, mult)					Calculate money gain rate.
// ramUpgradeCost(startingRam, extraLevels, costMult)		Calculate cost of upgrading hacknet node ram.

// *** HACKNET SERVERS ***
// cacheUpgradeCost(startingCache, extraCache)				Calculate cost of upgrading hacknet server cache.
// constants()												All constants used by the game.
// coreUpgradeCost(startingCore, extraCores, costMult)		Calculate cost of upgrading hacknet server cores.
// hacknetServerCost(n, mult)								Calculate the cost of a hacknet server.
// hashGainRate(level, ramUsed, maxRam, cores, mult)		Calculate hash gain rate.
// hashUpgradeCost(upgName, level)							Calculate hash cost of an upgrade.
// levelUpgradeCost(startingLevel, extraLevels, costMult)	Calculate cost of upgrading hacknet server level.
// ramUpgradeCost(startingRam, extraLevels, costMult)		Calculate cost of upgrading hacknet server ram.


// HashesPerLevel       : 0.001

// BaseCost             : 50000

// RamBaseCost          : 200000
// CoreBaseCost         : 1000000
// CacheBaseCost        : 10000000

// PurchaseMult         : 3.2
// UpgradeLevelMult     : 1.1
// UpgradeRamMult       : 1.4
// UpgradeCoreMult      : 1.55
// UpgradeCacheMult     : 1.85

// MaxServers           : 20
// MaxLevel             : 300
// MaxRam               : 8192
// MaxCores             : 128
// MaxCache             : 15


/** @param {NS} ns */
export async function main(ns) {
	let money = ns.args[0] || ns.getServerMoneyAvailable('home');
	for (; ;) {
		let cost = await UpgradeRound(ns, money);
		money -= cost;
		if (cost == 0 || money <= 0) break;
		await ns.sleep(20);
	}

	// for (let key of Object.keys(con))
	// 	ns.tprint(key.padEnd(20) + ' : ' + con[key]);
}


async function UpgradeRound(ns, money) {
	const con = ns.formulas.hacknetServers.constants();
	let budget = money;

	let actions = [
		ns.hacknet.purchaseNode,
		ns.hacknet.upgradeLevel,
		ns.hacknet.upgradeRam,
		ns.hacknet.upgradeCore,
		ns.hacknet.upgradeCache
	];

	let possibleUpgrades = [];
	let count = ns.hacknet.numNodes();
	for (let i = 0; i < ns.hacknet.maxNumNodes(); i++) {
		// Consider purchase
		if (i >= count) {
			let cost = ns.hacknet.getPurchaseNodeCost();
			let hashGain = ns.formulas.hacknetServers.hashGainRate(1, 0, 1, 1, ns.getBitNodeMultipliers().HacknetNodeMoney);
			if (cost <= money) {
				possibleUpgrades.push({
					index: i,
					description: 'NewNode',
					action: 0,
					cost: cost,
					hashGain: hashGain,
					netGain: hashGain / cost
				});
			}
			continue;
		}

		let stats = ns.hacknet.getNodeStats(i);

		// Consider upgrading 1 level
		let level = stats.level + 1;
		if (level <= con.MaxLevel) {
			let cost = ns.hacknet.getLevelUpgradeCost(i, 1);
			let hashGain = ns.formulas.hacknetServers.hashGainRate(level, 0, stats.ram, stats.cores, ns.getBitNodeMultipliers().HacknetNodeMoney);
			if (cost <= money) {
				possibleUpgrades.push({
					index: i,
					description: 'LevelUp',
					action: 1,
					cost: cost,
					hashGain: hashGain,
					netGain: hashGain / cost
				});
			}
		}

		// Consider upgrading 1 ram
		let ram = stats.ram;
		if (ram * 2 <= con.MaxRam) {
			let cost = ns.hacknet.getRamUpgradeCost(i, 1);
			let hashGain = ns.formulas.hacknetServers.hashGainRate(stats.level, 0, ram * 2, stats.cores, ns.getBitNodeMultipliers().HacknetNodeMoney);
			if (cost <= money) {
				possibleUpgrades.push({
					index: i,
					description: 'RamUp',
					action: 2,
					cost: cost,
					hashGain: hashGain,
					netGain: hashGain / cost,
					amount: 1
				});
			}
		}

		// Consider upgrading 1 core
		let cores = stats.cores + 1;
		if (cores <= con.MaxCores) {
			let cost = ns.hacknet.getCoreUpgradeCost(i, 1);
			let hashGain = ns.formulas.hacknetServers.hashGainRate(stats.level, 0, stats.ram, cores, ns.getBitNodeMultipliers().HacknetNodeMoney);
			if (cost <= money) {
				possibleUpgrades.push({
					index: i,
					description: 'CoresUp',
					action: 3,
					cost: cost,
					hashGain: hashGain,
					netGain: hashGain / cost
				});
			}
		}

		// // Consider upgrading 1 cache
		// let cache = stats.cache;
		// if (cache <= con.MaxCache) {
		// 	let cost = ns.hacknet.getCacheUpgradeCost(i, 1);
		// 	if (cost <= money) {
		// 		possibleUpgrades.push({
		// 			index: i,
		// 			description: 'CacheUp',
		// 			action: 4,
		// 			cost: cost,
		// 			hashGain: 0,
		// 			netGain: 0
		// 		});
		// 	}
		// }
	}

	possibleUpgrades.sort((a, b) => b.netGain - a.netGain);

	let lastNetGain = 0;
	let skip = false;

	for (let upg of possibleUpgrades) {
		if ((lastNetGain == 0 || lastNetGain == upg.netGain) && !skip) {
			if (money < upg.cost) {
				ns.tprint('WARN: Budget limit hit! Aborting');
				break;
			}
			ns.tprint('INFO: Upgrading node ' + upg.index + ' upgradeType: ' + upg.action);
			actions[upg.action](upg.index, upg.amount || 1);
			money -= upg.cost;
		}
		else {
			ns.tprint('WARN: Skipping ' + upg);
			skip = true;
			break;
		}
		lastNetGain = upg.netGain;
	}

	return budget - money;
}