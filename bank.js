/** @param {NS} ns */
export async function main(ns) {
    //UpdateBankCache(ns);
}

// export function GetBank(ns) {
//     return JSON.parse(ns.read('bank.txt'));
// }

export function UpdateBankCache(ns) {
    let boxes = Array.from(eval("document").querySelectorAll("[class*=MuiBox-root]"));
    let box = boxes.find(s => getProps(s)?.player);
    if (!box) return;
    let props = getProps(box);
    if (!props) return;

    const output = {
        install: {},
        node: {}
    };

    //ns.tprint('WARN: Income since last install:');
    for (let entry of Object.entries(props.player.moneySourceA)) {
        output.install[entry[0]] = entry[1];
        //ns.tprint(entry[0] + ' : ' + entry[1]);
    }
    //ns.tprint('WARN: Income since start of node:');
    for (let entry of Object.entries(props.player.moneySourceB)) {
        output.node[entry[0]] = entry[1];
        //ns.tprint(entry[0] + ' : ' + entry[1]);
    }

    //ns.write('bank.txt', JSON.stringify(output), 'w');
    return output;
}

function getProps(obj) {
    return Object.entries(obj).find(entry => entry[0].startsWith("__reactProps"))[1].children.props;
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