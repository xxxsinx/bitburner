import { PrintTable, DefaultStyle } from 'tables.js'
import { FormatMoney } from 'utils.js'

let getTail = false
const width = 1000
const height = 740
let g_tixMode = false; 					// Global variable indicating if we have full 4S data or not (it is automatically 
// set/determined later in script no point changing the value here)
let SHORTS = false;						// Global to determine whether or not we have access to shorts (this is updated at the start of the script)

const LOG_SIZE = 15;					// How many prices we keep in the log for blind/pre-4S trading for each symbol
const BUY_TRIGGER = 0.1;				// deviation from 0.5 (neutral) from which we start buying
const SELL_TRIGGER = 0;				// deviation from 0.5 (neutral) from which we start selling
const TRANSACTION_COST = 100_000;		// Cost of a stock transaction
const MIN_TRANSACTION_SIZE = 5_000_000;	// Minimum amount of stocks to buy, we need this to keep the transaction cost in check
const TIME_TRACKING = true;				// True if we're benchmarking our performance
const BENCH_TIME = 1000 * 60 * 60;		// How long we wait before reporting profitability

// Little representation of what this script does
// | <---------------------------- SHORTS | LONGS ------------------------------>|
// 0                    0.4     0.45     0.5     0.55      0.6                   1
//                       ^        ^                ^        ^ 
//                  <<< BUY     SELL >>>     <<< SELL      BUY >>>

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let initialFunds = ns.getServerMoneyAvailable('home');

	// This code determines if we have access to shorts or not
	// Note: Shorts are an endgame mechanic, it will be obvious to you how to get them
	// once you get there. Any more info would be spoilers :)
	// I'm using this instead of ns.singularity.getOwnedSourceFiles() because that bad boy is expensive AF in 2.0+
	try {
		ns.stock.buyShort('JGN', 0);
		SHORTS = true;
		ns.print('INFO: Shorts activated!');
		ns.tprint('INFO: Shorts activated!');
	}
	catch {
		ns.print('WARN: Shorts are not available to you yet, disabling them.');
		ns.tprint('WARN: Shorts are not available to you yet, disabling them.');
	}

	// Check if we have access to the stock market and the base API
	if (!ns.stock.hasWSEAccount() || !ns.stock.hasTIXAPIAccess()) {
		ns.print('ERROR: You need a Wse account and Tix Api access to run this script.');
		ns.tprint('ERROR: You need a Wse account and Tix Api access to run this script.');
		return;
	}

	// Check if we have 4S data or not
	g_tixMode = ns.stock.has4SDataTIXAPI();
	if (g_tixMode) {
		ns.print('INFO: Starting stonks in 4S mode.');
		ns.tprint('INFO: Starting stonks in 4S mode.');
	}
	else {
		ns.print('WARN: Starting stonks in pre-4S mode.');
		ns.tprint('WARN: Starting stonks in pre-4S mode.');
	}

	// We show the tail in normal mode, but not if we're in sales mode
	if (ns.args[0] != 'sell') null //ns.tail();
	else {
		// Passing sell to the script sells all the stocks and kills any other running scripts, then exists
		let procs = ns.ps();
		for (let proc of procs) {
			if (proc.filename == 'stonks.js' && proc.args.length == 0) {
				ns.tprint('WARN: Killing stonks.js!');
				ns.kill(proc.pid);
				break;
			}
		}
	}

	// Array that will contain all symbols, we build it once and update it every tick
	let stonks = [];

	let started = performance.now();

	while (true) {
		ns.resizeTail(width, height);
		if (getTail) {
			ns.tail();
			getTail = false
		}
		ns.clearLog()
		if (!g_tixMode && ns.stock.has4SDataTixApi)
			g_tixMode = true; // Switch to 4S data if we obtained it while running

		// Update our market log
		TakeSnapshot(ns, stonks);

		// Sort by forecast (for display purposes)
		let longs = stonks.map(s => s).sort((a, b) => b.forecast - a.forecast);

		// If it's been an hour, report progress
		if (TIME_TRACKING && performance.now() - started > BENCH_TIME) {
			// Dump every stock
			SellStonks(ns, longs, true);
			let balance = ns.getServerMoneyAvailable('home');
			//let balance = GetStonksBalance(ns);
			ns.tprint('FAIL: It\'s been an hour and the current balance is ' + FormatMoney(ns, balance) + ' initial funds were ' + FormatMoney(ns, initialFunds) + ' profit: ' + ((1 - balance / initialFunds * 100)).toFixed(2) + '%');

			// Reset
			initialFunds = balance;
			started = performance.now();
		}

		// Sell the stonks we have in our wallet that aren't worth keeping anymore
		SellStonks(ns, longs, ns.args[0] == 'sell');

		// If the user passed 'sell' as a parameter, we're dumping and killing the script
		if (ns.args[0] == 'sell') {
			UpdateHud(ns, undefined);
			return;
		}

		// Buy stocks that meet our criterion
		BuyStonks(ns, longs);

		// Display our last snapshot of the stocks data to the user
		ReportCurrentSnapshot(ns, longs);

		// 6 second ticks, we don't have any special treatment for bonus time
		await ns.sleep(6000);
	}
}

function SellStonks(ns, log, dump) {
	// *********************************
	// ***         LONGS
	// *********************************
	for (const stonk of log) {
		// If we don't have any shares, skip
		if (stonk.nbShares < 1) continue;

		// If our forecast is still positive, skip, unless we're dumping
		if (stonk.forecast >= 0.5 + SELL_TRIGGER && !dump) continue;

		// If we don't have enough data, abort sales unless we're dumping
		if (!g_tixMode && stonk.snapshots.length < LOG_SIZE && !dump) {
			ns.print('INFO: Would sell ' + stonk.nbShares + ' LONG shares of ' + stonk.sym + ' but we only have ' + stonk.snapshots.length + ' snapshots...');
			continue;
		}

		ns.print('WARN: Selling ' + stonk.nbShares + ' LONG shares of ' + stonk.sym + ' for ' + ns.nFormat(stonk.GetValue(), "$0.000a") + ' (' + ns.nFormat(stonk.GetProfit(), "$0.000a") + ' profit)');
		if (dump) ns.tprint('WARN: Selling ' + stonk.nbShares + ' LONG shares of ' + stonk.sym + ' for ' + ns.nFormat(stonk.GetValue(), "$0.000a") + ' (' + ns.nFormat(stonk.GetProfit(), "$0.000a") + ' profit)');
		ns.stock.sellStock(stonk.sym, stonk.nbShares);
	}

	if (SHORTS) {
		// *********************************
		// ***         SHORTS
		// *********************************
		for (const stonk of log) {
			// If we don't have any shares, skip
			if (stonk.nbShorts < 1) continue;

			// If our forecast is still negative, skip, unless we're dumping
			if (stonk.forecast <= 0.5 - SELL_TRIGGER && !dump) continue;

			// If we don't have enough data, abort sales unless we're dumping
			if (!g_tixMode && stonk.snapshots.length < LOG_SIZE && !dump) {
				ns.print('INFO: Would sell ' + stonk.nbShorts + ' SHORT shares of ' + stonk.sym + ' but we only have ' + stonk.snapshots.length + ' snapshots...');
				continue;
			}

			ns.print('WARN: Selling ' + stonk.nbShorts + ' SHORT shares of ' + stonk.sym + ' for ' + ns.nFormat(stonk.GetValue(), "$0.000a") + ' (' + ns.nFormat(stonk.GetProfit(), "$0.000a") + ' profit)');
			if (dump) ns.tprint('WARN: Selling ' + stonk.nbShorts + ' SHORT shares of ' + stonk.sym + ' for ' + ns.nFormat(stonk.GetValue(), "$0.000a") + ' (' + ns.nFormat(stonk.GetProfit(), "$0.000a") + ' profit)');
			ns.stock.sellShort(stonk.sym, stonk.nbShorts);
		}
	}
}

function BuyStonks(ns, log) {
	// If you're buying Long, you want Ask price. Long stocks sell for Bid price.
	// If you're buying Short, you want Bid price. Short stocks sell for Ask price.

	let budget = ns.getServerMoneyAvailable('home') * 0.75;
	if (budget < 10_000_000) return;

	let stonks = log.map(s => s).filter(p => p.normalizedForecast >= 0.5 + BUY_TRIGGER).sort((a, b) => b.normalizedForecast - a.normalizedForecast);

	for (const stonk of stonks) {
		// Check if we have enough pre-S4 data to make a decision
		if (!g_tixMode && stonk.snapshots.length < LOG_SIZE)
			continue;

		// If we don't have short and the position is short, skip this symbol
		if (!SHORTS && stonk.forecast < 0.5) continue;

		// We're only buying at/over 0.6 forecast (anything over 0.5 is trending up)
		if (stonk.normalizedForecast < 0.5 + BUY_TRIGGER) continue;

		// Count how many shares we can buy
		let maxShares = ns.stock.getMaxShares(stonk.sym) - stonk.nbShares - stonk.nbShorts;
		// Clamp to the amount of cash we have available total

		let sharePrice = stonk.forecast < 0.5 ? stonk.bidPrice : stonk.askPrice;
		maxShares = Math.min(maxShares, Math.floor((budget - TRANSACTION_COST) / sharePrice));

		// We broke!
		if (maxShares <= 0) continue;

		let totalPrice = maxShares * sharePrice + TRANSACTION_COST;
		if (totalPrice < MIN_TRANSACTION_SIZE) continue;
		if (totalPrice > budget) {
			ns.print('Budget is : ' + ns.nFormat(budget, "$0.000a") + ' and price is ' + ns.nFormat(totalPrice, "$0.000a"));
			continue;
		}

		// Buy some stocks!
		ns.print('INFO: Buying ' + maxShares + ' ' + (stonk.forecast < 0.5 ? 'SHORT' : 'LONG') + ' shares of ' + stonk.sym + ' at price ' + ns.nFormat(maxShares * sharePrice, "$0.000a"));

		if (stonk.forecast < 0.5 && !SHORTS) continue;

		let spent = stonk.forecast < 0.5 ? ns.stock.buyShort(stonk.sym, maxShares) : ns.stock.buyStock(stonk.sym, maxShares);
		budget -= maxShares * spent + TRANSACTION_COST;
	}
}

function TakeSnapshot(ns, stonks) {
	const symbols = ns.stock.getSymbols();
	for (const sym of symbols) {
		let entry = stonks.find(p => p.sym == sym);
		if (entry == undefined) {
			entry = new Stonk(ns, sym);
			stonks.push(entry);
		}
		entry.Update();
	}
}

function ForecastToGraph(forecast) {
	if (forecast >= 1) return { color: '#00FF00', text: '+++++' };
	if (forecast >= 0.9) return { color: '#00EE00', text: '++++' };
	if (forecast >= 0.8) return { color: '#00DD00', text: '+++' };
	if (forecast >= 0.7) return { color: '#00CC00', text: '+++' };
	if (forecast >= 0.65) return { color: '#00BB00', text: '++' };
	if (forecast >= 0.6) return { color: '#00AA00', text: '+' };
	if (forecast >= 0.55) return { color: '#800000', text: '' };

	if (forecast >= 0.50) return { color: 'yellow', text: '' };

	if (forecast >= 0.45) return { color: '#800000', text: '' };
	if (forecast >= 0.40) return { color: '#00AA00', text: '-' };
	if (forecast >= 0.35) return { color: '#00BB00', text: '--' };
	if (forecast >= 0.3) return { color: '#00CC00', text: '---' };
	if (forecast >= 0.2) return { color: '#00DD00', text: '----' };
	if (forecast >= 0.1) return { color: '#00EE00', text: '-----' };
	//if (forecast >= 0.0) 
	return { color: '#00FF00', text: '------' };
}

function ReportCurrentSnapshot(ns, stonks) {
	const columns = [
		{ header: ' SYM', width: 7 },
		{ header: ' Type', width: 7 },
		{ header: ' Forecast', width: 10 },
		{ header: ' Forecast', width: 10 },
		{ header: '  Shares', width: 10 },
		{ header: '   Paid', width: 10 },
		{ header: '  Value', width: 10 },
		{ header: '  Profit', width: 10 },
		{ header: '   %', width: 8 }
	];

	const total = { nbShares: 0, nbShorts: 0, paid: 0, profit: 0 };
	const data = [];

	const sum = [0, 0, 0, 0];

	for (const stonk of stonks) {
		total.nbShares += stonk.nbShares;
		total.nbShorts += stonk.nbShorts;
		total.paid += stonk.GetPricePaid();
		total.profit += stonk.GetProfit();

		let forecast = stonk.forecast == 'N/A' ? stonk.forecast : stonk.forecast.toFixed(4);

		let line = [];

		line.push({ color: 'white', text: ' ' + stonk.sym });
		line.push({ color: 'white', text: stonk.forecast >= 0.5 ? ' Long' : ' Short' });
		line.push({ color: 'white', text: ' ' + forecast });
		line.push(ForecastToGraph(stonk.forecast));
		line.push({ color: 'white', text: ns.nFormat(stonk.nbShares + stonk.nbShorts, "0.0a").padStart(9) });
		line.push({ color: 'white', text: ns.nFormat(stonk.GetPricePaid(), "0.0a").padStart(9) });
		line.push({ color: 'white', text: ns.nFormat(stonk.GetValue(), "0.0a").padStart(9) });
		line.push({ color: 'white', text: ns.nFormat(stonk.GetProfit(), "0.0a").padStart(9) });

		let pct = stonk.GetProfit() / stonk.GetPricePaid() * 100;
		if (isNaN(pct)) pct = 0;
		if (pct == 0) pct = '';
		else pct = ns.nFormat(pct, "0.0a").padStart(7);

		line.push({ color: 'white', text: pct });

		sum[0] += stonk.nbShares + stonk.nbShorts;
		sum[1] += stonk.GetValue();
		sum[2] += stonk.GetPricePaid();
		sum[3] += stonk.GetProfit();

		data.push(line);
	}

	data.push(null);

	let pct = sum[3] / sum[2] * 100;
	if (isNaN(pct)) pct = 0;
	if (pct == 0) pct = '';
	else pct = ns.nFormat(pct, "0.0a").padStart(7);

	data.push([
		{ color: 'white', text: ' Total' },
		{ color: 'white', text: '' },
		{ color: 'white', text: '' },
		{ color: 'white', text: '' },
		{ color: 'white', text: ns.nFormat(sum[0], "0.0a").padStart(9) },
		{ color: 'white', text: ns.nFormat(sum[1], "0.0a").padStart(9) },
		{ color: 'white', text: ns.nFormat(sum[2], "0.0a").padStart(9) },
		{ color: 'white', text: ns.nFormat(sum[3], "0.0a").padStart(9) },
		{ color: 'white', text: pct }
	]);

	PrintTable(ns, data, columns, DefaultStyle(), ns.print);

	let totalWorth = total.paid + total.profit + ns.getServerMoneyAvailable('home');
	UpdateHud(ns, totalWorth);

	const snaps = stonks[0].snapshots.length;
	if (!g_tixMode && stonks.length > 0 && snaps < LOG_SIZE)
		ns.print('WARN: Script running in pre-4S data mode (we need ' + LOG_SIZE + ' prices in the log before doing any trading): ' + snaps + '/' + LOG_SIZE);
}

function UpdateHud(ns, totalWorth) {
	const doc = eval('document');
	const hook0 = doc.getElementById('overview-extra-hook-0');
	const hook1 = doc.getElementById('overview-extra-hook-1');

	try {
		const headers = []
		const values = [];

		if (totalWorth == undefined) {
			hook0.innerText = '';
			hook1.innerText = '';
			return;
		}

		headers.push('Total worth: ');
		values.push(FormatMoney(ns, totalWorth));

		hook0.innerText = headers.join(" \n");
		hook1.innerText = values.join("\n");
		hook0.onclick = function () { getTail = true }

	} catch (err) {
		ns.print("ERROR: Update Skipped: " + String(err));
	}
}

export class Stonk {
	constructor(ns, name) {
		this.ns = ns;

		this.sym = name;
		this.snapshots = [];
	}

	Update() {
		// Obtain prices and other stock metrics
		this.askPrice = this.ns.stock.getAskPrice(this.sym);
		this.bidPrice = this.ns.stock.getBidPrice(this.sym);
		this.price = this.ns.stock.getPrice(this.sym);
		this.maxShares = this.ns.stock.getMaxShares(this.sym);

		// Get current position on longs and shorts
		const [shares, avgPx, sharesShort, avgPxShort] = this.ns.stock.getPosition(this.sym);
		this.nbShares = shares;
		this.avgPrice = avgPx;
		this.nbShorts = sharesShort;
		this.avgShortPrice = avgPxShort;

		// Add the snapshot to the list
		this.snapshots.push(this.price);

		// We keep LOG_SIZE snapshots maximim total
		if (this.snapshots.length > LOG_SIZE) {
			this.snapshots.shift();
		}

		// Get volatility and forecast if available
		if (g_tixMode) {
			this.forecast = this.ns.stock.getForecast(this.sym);
		}
		else {
			// Recound the ups and downs for pre-4S forecast estimation
			let nbUp = 0;
			for (let i = 1; i < this.snapshots.length; i++) {
				let prev = this.snapshots[i - 1];
				let cur = this.snapshots[i];

				if (prev < cur) nbUp++;
			}

			// We simulate a forecast based on the last LOG_SIZE operations
			if (this.snapshots.length == LOG_SIZE)
				this.forecast = nbUp / (LOG_SIZE - 1); // -1 here because with 15 values, we only have 14 changes
			else
				this.forecast = 'N/A';
		}

		if (this.forecast != 'N/A') {
			this.normalizedForecast = this.forecast;
			if (this.forecast < 0.5) this.normalizedForecast = 1 - this.forecast;
		}
		else
			this.normalizedForecast = 0;
	}

	GetPricePaid() {
		let longCost = this.nbShares * this.avgPrice;
		let shortCost = this.nbShorts * this.avgShortPrice;
		return longCost + shortCost;
	}

	GetProfit() {
		// Short stocks sell for Ask price.
		// Long stocks sell for Bid price.
		let longProfit = this.nbShares * this.bidPrice - this.nbShares * this.avgPrice;
		let shortProfit = this.nbShorts * this.avgShortPrice - this.nbShorts * this.askPrice;
		return longProfit + shortProfit;
	}

	GetValue() {
		let longCost = this.nbShares * this.bidPrice;
		let shortCost = this.nbShorts * this.askPrice;
		return longCost + shortCost;
	}
}

/** @param {NS} ns **/
function GetStonksBalance(ns) {
	let boxes = Array.from(eval("document").querySelectorAll("[class*=MuiBox-root]"));
	let box = boxes.find(s => getProps(s)?.player);
	if (!box) return 0;
	let props = getProps(box);
	if (!props) return 0;
	return props.player.moneySourceA.stock;
}

function getProps(obj) {
	return Object.entries(obj).find(entry => entry[0].startsWith("__reactProps"))[1]?.children?.props;
}