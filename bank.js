import { COLORS, pctColor, PrintTable, DefaultStyle, ColorPrint } from 'tables.js'
import { FormatMoney, WaitPids } from 'utils.js'
//import { GetSitRep } from 'sitrep.js'

/** @param {NS} ns */
export async function main(ns) {
    const money = ns.getMoneySources();

    await WaitPids(ns, ns.run('flightStatus.js'));
    
    const columns = [
        { header: ' Source', width: 20 },
        { header: ' $ install', width: 11 },
        { header: ' $ overall', width: 11 }
    ];

    const data = [];
    for (const key of Object.keys(money.sinceInstall)) {
        const install = money.sinceInstall[key];
        const start = money.sinceStart[key];
        if (install == 0 && start == 0) continue;
        if (key == 'total') continue;
        data.push([' ' + key, FormatMoney(ns, install, 1).padStart(10), FormatMoney(ns, start, 1).padStart(10)]);
    }

    data.push(null);
    data.push([' Total', FormatMoney(ns, money.sinceInstall['total'], 1).padStart(10), FormatMoney(ns, money.sinceStart['total'], 1).padStart(10)]);

    PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);

	// const status = {
	// 	augs: ns.singularity.getOwnedAugmentations(false).length,
	// 	augsNeeded: ns.getBitNodeMultipliers().DaedalusAugsRequirement,
	// 	money: ns.getServerMoneyAvailable('home'),
	// 	level: ns.getHackingLevel()
	// }

	const sitrep = JSON.parse(ns.read('sitrep.txt'));

    ns.tprintf('\x1b[38;5;' + COLORS.find(s => s.desc == 'White').ansi + 'm' + 'Time since install : ' + ns.tFormat(ns.getTimeSinceLastAug()));
    ns.tprintf('\x1b[38;5;' + COLORS.find(s => s.desc == 'White').ansi + 'm' + 'Time since start   : ' + ns.tFormat(ns.getPlayer().playtimeSinceLastBitnode));
    ns.tprintf('\x1b[38;5;' + COLORS.find(s => s.desc == 'White').ansi + 'm' + 'Karma              : ' + ns.heart.break().toFixed(0));
    ns.tprintf('\x1b[38;5;' + COLORS.find(s => s.desc == 'White').ansi + 'm' + 'Augmentations      : ' + sitrep.flightStatus.augs + ' / ' + sitrep.flightStatus.augsNeeded);
    ns.tprintf('\x1b[38;5;' + COLORS.find(s => s.desc == 'White').ansi + 'm' + 'Money              : ' + FormatMoney(ns,sitrep.flightStatus.money) + ' / ' + FormatMoney(ns, 100_000_000_000));
    ns.tprintf('\x1b[38;5;' + COLORS.find(s => s.desc == 'White').ansi + 'm' + 'Hacking skill      : ' + ns.getHackingLevel() + ' / 2500');

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