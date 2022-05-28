import { PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

// Global variable indicating if we have full 4S data or not (it is automatically set/determined later in script no point changing the value here)
let g_tixMode = false;
const LOG_SIZE = 12;
const BUY_TRIGGER = 0.1;	// deviation from 0.5 (neutral) from which we start buying
const SELL_TRIGGER = 0.05;	// deviation from 0.5 (neutral) from which we start selling
const TRANSACTION_COST = 100_000;
const MIN_TRANSACTION_SIZE = 5_000_000;

// | <---------------------------- SHORTS | LONGS ------------------------------>|
// 0                    0.4     0.45     0.5     0.55      0.6                   1
//                       ^        ^                ^        ^ 
//                  <<< BUY     SELL >>>     <<< SELL      BUY >>>

let SHORTS = false;

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	const sf = ns.getOwnedSourceFiles();
	SHORTS = sf.some(s => s.n == 8 && s.lvl >= 2) || ns.getPlayer().bitNodeN == 8;

	// Check if we have access to the stock market and the base API
	const player = ns.getPlayer();
	if (!player.hasWseAccount && !hasTixApiAccess) {
		ns.print('ERROR: You need a Wse account and Tix Api access to run this script.');
		ns.tprint('ERROR: You need a Wse account and Tix Api access to run this script.');
		return;
	}

	// Check if we have 4S data or not
	g_tixMode = player.has4SDataTixApi;
	if (g_tixMode) {
		ns.print('INFO: Starting stonks in 4S mode.');
		ns.tprint('INFO: Starting stonks in 4S mode.');
	}
	else {
		ns.print('WARN: Starting stonks in pre-4S mode.');
		ns.tprint('WARN: Starting stonks in pre-4S mode.');
	}

	// We show the tail in normal mode, but not if we're in sales mode
	if (ns.args[0] != 'sell') ns.tail();
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
	while (true) {
		ns.clearLog()
		if (!g_tixMode && ns.getPlayer().has4SDataTixApi)
			g_tixMode = true; // Switch to 4S data if we obtained it while running

		// Update our market log
		TakeSnapshot(ns, stonks);

		// Sort by forecast (for display purposes)
		let longs = stonks.map(s => s).sort((a, b) => b.forecast - a.forecast);

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
		ReportCurrentSnapshot2(ns, longs);

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

		ns.print('WARN: Selling ' + stonk.nbShares + ' LONG shares of ' + stonk.sym);
		if (dump) ns.tprint('WARN: Selling ' + stonk.nbShares + ' LONG shares of ' + stonk.sym);
		ns.stock.sell(stonk.sym, stonk.nbShares);
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

			ns.print('WARN: Selling ' + stonk.nbShorts + ' SHORT shares of ' + stonk.sym);
			if (dump) ns.tprint('WARN: Selling ' + stonk.nbShorts + ' SHORT shares of ' + stonk.sym);
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

		let spent = stonk.forecast < 0.5 ? ns.stock.short(stonk.sym, maxShares) : ns.stock.buy(stonk.sym, maxShares);
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

function ReportCurrentSnapshot2(ns, stonks) {
	const columns = [
		{ header: ' SYM', width: 6 },
		{ header: ' Type', width: 8 },
		{ header: ' Forecast', width: 10 },
		{ header: ' Forecast', width: 10 },
		{ header: ' Shares', width: 12 },
		{ header: ' Money', width: 12 },
		{ header: ' Profit', width: 12 }
	];

	const total = { nbShares: 0, nbShorts: 0, paid: 0, profit: 0 };
	const data = [];

	for (const stonk of stonks) {
		total.nbShares += stonk.nbShares;
		total.nbShorts += stonk.nbShorts;
		total.paid += stonk.GetPricePaid();
		total.profit += stonk.GetProfit();

		let forecast = stonk.forecast == 'N/A' ? stonk.forecast : stonk.forecast.toFixed(4);

		let line = [];

		line.push({ color: 'white', text: ' ' + stonk.sym });
		line.push({ color: 'white', text: ' ' + stonk.forecast >= 0.5 ? 'Long' : 'Short' });
		line.push({ color: 'white', text: ' ' + forecast });
		line.push(ForecastToGraph(stonk.forecast));
		line.push({ color: 'white', text: (stonk.nbShares + stonk.nbShorts).toString() });
		line.push({ color: 'white', text: ns.nFormat(stonk.GetPricePaid(), "0.0a") });
		line.push({ color: 'white', text: ns.nFormat(stonk.GetProfit(), "0.0a") });

		data.push(line);
	}

	PrintTable(ns, data, columns, DefaultStyle(), ns.print);

	let totalWorth = total.paid + total.profit + ns.getServerMoneyAvailable('home');
	// report =
	// 	'Total'.padEnd(7) +
	// 	''.padEnd(10) +
	// 	''.padEnd(12) +
	// 	''.padEnd(11) +
	// 	ns.nFormat(totalWorth, "0.0a").padEnd(12) +
	// 	''.padEnd(12) +
	// 	'  │';
	// ns.print('│  ' + report);

	// ns.print('└' + ''.padEnd(header.length - 2, '─') + '┘');

	UpdateHud(ns, totalWorth);

	const snaps = stonks[0].snapshots.length;
	if (!g_tixMode && stonks.length > 0 && snaps < LOG_SIZE)
		ns.print('WARN: Script running in pre-4S data mode (we need ' + LOG_SIZE + ' prices in the log before doing any trading): ' + snaps + '/' + LOG_SIZE);
}


function ReportCurrentSnapshot(ns, stonks) {
	let header = '│  ' +
		'SYM'.padEnd(7) +
		'Forecast'.padEnd(10) +
		'Normalized'.padEnd(12) +
		'Shares'.padEnd(11) +
		'Money'.padEnd(12) +
		'Profit'.padEnd(12) +
		'  │';

	ns.print('┌' + ''.padEnd(header.length - 2, '─') + '┐');
	ns.print(header);
	ns.print('├' + ''.padEnd(header.length - 2, '─') + '┤');

	const total = { nbShares: 0, nbShorts: 0, paid: 0, profit: 0 };

	for (const stonk of stonks) {
		let suffix = '';
		if (stonk.nbShares > 0) suffix = '(L)';
		else if (stonk.nbShorts > 0) suffix = '(S)';

		total.nbShares += stonk.nbShares;
		total.nbShorts += stonk.nbShorts;
		total.paid += stonk.GetPricePaid();
		total.profit += stonk.GetProfit();

		let forecast = stonk.forecast == 'N/A' ? stonk.forecast : stonk.forecast.toFixed(4);
		let report =
			stonk.sym.padEnd(7) +
			forecast.padEnd(10) +
			stonk.normalizedForecast.toFixed(2).padEnd(12) +
			((stonk.nbShares + stonk.nbShorts).toString() + suffix).padEnd(11) +
			ns.nFormat(stonk.GetPricePaid(), "0.0a").padEnd(12) +
			ns.nFormat(stonk.GetProfit(), "0.0a").padEnd(12) +
			'  │';

		ns.print('│  ' + report);
	}
	ns.print('├' + ''.padEnd(header.length - 2, '─') + '┤');

	let report =
		'Stonks'.padEnd(7) +
		''.padEnd(10) +
		''.padEnd(12) +
		''.padEnd(11) +
		ns.nFormat(total.paid, "0.0a").padEnd(12) +
		''.padEnd(12) +
		'  │';
	ns.print('│  ' + report);

	report =
		'Profit'.padEnd(7) +
		''.padEnd(10) +
		''.padEnd(12) +
		''.padEnd(11) +
		ns.nFormat(total.profit, "0.0a").padEnd(12) +
		ns.nFormat(total.profit, "0.0a").padEnd(12) +
		'  │';
	ns.print('│  ' + report);

	report =
		'Player'.padEnd(7) +
		''.padEnd(10) +
		''.padEnd(12) +
		''.padEnd(11) +
		ns.nFormat(ns.getServerMoneyAvailable('home'), "0.0a").padEnd(12) +
		''.padEnd(12) +
		'  │';
	ns.print('│  ' + report);

	ns.print('├' + ''.padEnd(header.length - 2, '─') + '┤');

	let totalWorth = total.paid + total.profit + ns.getServerMoneyAvailable('home');
	report =
		'Total'.padEnd(7) +
		''.padEnd(10) +
		''.padEnd(12) +
		''.padEnd(11) +
		ns.nFormat(totalWorth, "0.0a").padEnd(12) +
		''.padEnd(12) +
		'  │';
	ns.print('│  ' + report);

	ns.print('└' + ''.padEnd(header.length - 2, '─') + '┘');

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
		values.push(ns.nFormat(totalWorth, "$0.000a"));

		hook0.innerText = headers.join(" \n");
		hook1.innerText = values.join("\n");
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

		// We keep 12 snapshots maximim total
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

			// We simulate a forecast based on the last 12- operations
			if (this.snapshots.length == LOG_SIZE)
				this.forecast = nbUp / LOG_SIZE;
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
}
