import { COLORS, pctColor, PrintTable, DefaultStyle, ColorPrint } from 'tables.js'
import { FormatMoney, WaitPids } from 'utils.js'
import { RamBudget, GangBudget } from 'budget.js'
//import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
    const money = ns.getMoneySources();


    let columns = [
        { header: ' Source', width: 22 },
        { header: ' $ install', width: 11 },
        { header: ' $ overall', width: 11 },
        { header: ' $ budget', width: 11 },
    ];

    let data = [];
    let spent= [0, 0];
    let gained= [0, 0];
    for (const key of Object.keys(money.sinceInstall)) {
        const install = money.sinceInstall[key];
        const start = money.sinceStart[key];
        if (install == 0 && start == 0) continue;
        if (key == 'total') continue;

        if (install > 0) gained[0] += install;
        if (install < 0) spent[0] += install;
        if (start > 0) gained[1] += start;
        if (start < 0) spent[1] += start;

        let budget = '';
        if (key == 'servers') {
            budget = FormatMoney(ns, RamBudget(ns));
        }
        if (key == 'gang') {
            budget = FormatMoney(ns, GangBudget(ns));
        }

        data.push([' ' + key, FormatMoney(ns, install, 1).padStart(10), FormatMoney(ns, start, 1).padStart(10), budget.padStart(10)]);
    }

    data.push(null);
    data.push([' Gained', FormatMoney(ns, gained[0], 1).padStart(10), FormatMoney(ns, gained[1], 1).padStart(10), '']);
    data.push([' Spent', FormatMoney(ns, spent[0], 1).padStart(10), FormatMoney(ns, spent[1], 1).padStart(10), '']);
    data.push(null);
    data.push([' Total', FormatMoney(ns, money.sinceInstall['total'], 1).padStart(10), FormatMoney(ns, money.sinceStart['total'], 1).padStart(10), '']);

    PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

    // const status = {
    // 	augs: ns.singularity.getOwnedAugmentations(false).length,
    // 	augsNeeded: ns.getBitNodeMultipliers().DaedalusAugsRequirement,
    // 	money: ns.getServerMoneyAvailable('home'),
    // 	level: ns.getHackingLevel()
    // }

    await WaitPids(ns, ns.run('flightStatus.js'));
    const sitrep = JSON.parse(ns.read('sitrep.txt'));

    columns = [
        { header: ' Information', width: 20 },
        { header: ' Value', width: 37 }
    ];

    data = [];
    data.push([' Time since install', ' ' + ns.tFormat(ns.getTimeSinceLastAug())]);
    data.push([' Time since start', ' ' + ns.tFormat(ns.getPlayer().playtimeSinceLastBitnode)]);
    data.push([' Karma', ' ' + ns.heart.break().toFixed(0) + ' / ' + '-54000']);
    data.push([' Augmentations', ' ' + sitrep.flightStatus.augs.toString() + ' / ' + sitrep.flightStatus.augsNeeded.toString()]);
    data.push([' Money', ' ' + FormatMoney(ns, sitrep.flightStatus.money) + ' / ' + FormatMoney(ns, 100_000_000_000)]);
    data.push([' Hacking skill', ' ' + ns.getHackingLevel().toString() + ' / ' + '2500']);
    data.push([' World daemon', ' ' + ns.getHackingLevel().toString() + ' / ' + (ns.getBitNodeMultipliers().WorldDaemonDifficulty * 3000).toString()]);

    PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}

// export function GetBank(ns) {
//     return JSON.parse(ns.read('bank.txt'));
// }

export function UpdateBankCache(ns) {
    //ns.write('bank.txt', JSON.stringify(output), 'w');
    // return output;
}

// export function GetTotalWorth(ns) {
// 	let money = ns.getServerMoneyAvailable('home');
// 	let stocks = GetStocksValue(ns);
// 	let total = money + stocks.total;

// 	ns.tprint('Player money  : ' + ns.nFormat(money, '0.000a').padStart(9));
// 	ns.tprint('Stocks paid   : ' + ns.nFormat(stocks.paid, '0.000a').padStart(9));
// 	ns.tprint('Stocks profit : ' + ns.nFormat(stocks.profit, '0.000a').padStart(9));
// 	ns.tprint('Stocks total  : ' + ns.nFormat(stocks.total, '0.000a').padStart(9));
// 	ns.tprint('Total money   : ' + ns.nFormat(total, '0.000a').padStart(9));

// 	return total;
// }

// export function GetStocksValue(ns) {
// 	let total = 0;
// 	let paid = 0;
// 	let profit = 0;

// 	for (const sym of ns.stock.getSymbols()) {
// 		// Obtain prices and other stock metrics
// 		let askPrice = ns.stock.getAskPrice(sym);
// 		let bidPrice = ns.stock.getBidPrice(sym);

// 		// Get current position on longs and shorts
// 		const [shares, avgPx, sharesShort, avgPxShort] = ns.stock.getPosition(sym);

// 		// Short stocks sell for Ask price.
// 		// Long stocks sell for Bid price.
// 		let longValue = shares * bidPrice;
// 		let shortValue = sharesShort * askPrice;

// 		let longPaid = shares * avgPx;
// 		let shortPaid = sharesShort * avgPxShort;

// 		let longProfit = longValue - longPaid;
// 		let shortProfit = shortPaid - shortValue;

// 		total += longValue + shortValue;
// 		paid += longPaid + shortPaid;
// 		profit += longProfit + shortProfit;
// 	}

// 	return { total: total, paid: paid, profit: profit };
// }