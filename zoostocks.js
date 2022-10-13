//import { BatcherController } from "/libraryObjects.js";


const reportName = "Stockmarket";
const transactionCost = 100000;
let controllers = [];
let allowedServers = [];
let manipulatorHackPercent = 0.02;
let manipulatorMaxScripts = 200;

function FormatMoney(ns, value, decimals = 3) {
	if (value >= 1e33) return '$' + value.toExponential(0);
	for (const pair of [[1e30, 'n'], [1e27, 'o'], [1e24, 'S'], [1e21, 's'], [1e18, 'Q'], [1e15, 'q'], [1e12, 't'], [1e9, 'b'], [1e6, 'm'], [1e3, 'k']])
		if (value >= pair[0]) return (value / pair[0]).toFixed(decimals) + pair[1];
	return '$' + value.toFixed(decimals);
}

/** @param {NS} ns */
export async function main(ns) {
	function beep() {
		var snd = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
		snd.play();
	}
	let startTime = performance.now();
	ns.tail();
	ns.disableLog("sleep");
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("getServerRequiredHackingLevel");
	ns.disableLog("getServerNumPortsRequired");
	ns.disableLog("exec");
	ns.clearLog();
	controllers = [];
	allowedServers = [];
	manipulatorHackPercent = 0.02;
	manipulatorMaxScripts = 200;
	//let doc = eval("document");
	let stocks = [];
	let hasAccess = ns.getPlayer().has4SDataTixApi;
	for (const stockName of ns.stock.getSymbols()) {
		let pos = ns.stock.getPosition(stockName);
		stocks.push({
			name: stockName,
			maxStocks: ns.stock.getMaxShares(stockName),
			price: ns.stock.getPrice(stockName),
			forecast: 0,
			volatility: 0,
			bought: pos[0] - pos[2],
			allowed: true,
			volatilityCounter: new VolatilityCounter(200),
			forecastEstimator: new ForecastEstimator(),
			buyPrice: 0,
			manipulationStarted: false,
			boughtThisCycle: false
		});
		let s = stocks[stocks.length - 1];
		s.forecast = getForecast(ns, s, hasAccess);
		s.volatility = getVolatility(ns, s, hasAccess);
	}
	//doc["log"].push(reportName + " " + (performance.now() - startTime));
	await ns.sleep(1);
	startTime = performance.now();
	const trustClock = ns.args.length > 0 && ns.args[0];
	let x = -1;
	if (trustClock) {
		let intervals = Math.floor(ns.getTimeSinceLastAug() / 6000);
		intervals %= 75;
		x = intervals;
	}
	let BENCH_TIME = 3600000;
	let initialFunds = ns.getServerMoneyAvailable('home') + totalStockValue(ns, stocks);
	let started = performance.now();
	while (true) {
		if (x === -1 || stocks[0].price !== ns.stock.getPrice(stocks[0].name)) {

			if (performance.now() - started > BENCH_TIME) {
				let balance = ns.getServerMoneyAvailable('home') + totalStockValue(ns, stocks);
				ns.tprint('FAIL: It\'s been an hour and the current balance is ' + FormatMoney(ns, balance) + ' initial funds were ' + FormatMoney(ns, initialFunds) + ' profit: ' + ((balance / initialFunds * 100).toFixed(2)-100) + '%');

				// Reset
				initialFunds = balance;
				started = performance.now();
			}

			x++;
			hasAccess = ns.getPlayer().has4SDataTixApi;
			updateStocksEstimation(ns, stocks, hasAccess, x === 75);
			x %= 75;
			updateStocks(ns, stocks, hasAccess);
			//doc["log"].push(reportName + " " + (performance.now() - startTime));
			await ns.sleep(1);
			startTime = performance.now();
			if (x === 0) {
				ns.clearLog();
				listStocks(ns, stocks);
				console.log("Stockvalue: " + totalStockValue(ns, stocks));
				//doc["log"].push(reportName + " " + (performance.now() - startTime));
				await ns.sleep(100);
				startTime = performance.now();
			}
			sellStocks(ns, stocks);
			//doc["log"].push(reportName + " " + (performance.now() - startTime));
			await ns.sleep(100);
			startTime = performance.now();
			if (x <= 35) {
				buyStocks(ns, stocks, ns.getServerMoneyAvailable("home"));
			}

			// if (ns.args.length > 1 && ns.args[1]) {
			// 	stockManipulation(ns, stocks);
			// }
			// evaluateStockManipulation(ns, x, stocks);
			console.log(x);
		}
		//doc["log"].push(reportName + " " + (performance.now() - startTime));
		await ns.sleep(100);
		startTime = performance.now();
	}
}

function totalStockValue(ns, stocks) {
	return stocks.reduce((prev, cur) => {
		return cur.bought === 0 ? prev :
			prev + ns.stock.getSaleGain(cur.name, Math.abs(cur.bought),
				cur.bought > 0 ? "long" : "short");
	}, 0)
}

// function stockManipulation(ns, stocks) {
// 	let port = ns.getPortHandle(10);
// 	while (!port.empty()) {
// 		let v = port.read();
// 		if (v === "clear") {
// 			allowedServers = [];
// 		}
// 		else {
// 			allowedServers.push(v);
// 		}
// 	}
// 	port = ns.getPortHandle(11);
// 	while (!port.empty()) {
// 		manipulatorHackPercent = port.read();
// 	}
// 	port = ns.getPortHandle(12);
// 	while (!port.empty()) {
// 		manipulatorMaxScripts = port.read();
// 	}
// 	let player = ns.getPlayer();
// 	let doc = eval("document");
// 	if (!doc["batcherController"]) {
// 		doc["batcherController"] = {};
// 	}
// 	for (const stock of stocks) {
// 		let server = stockServers[stock.name];
// 		if (!server || !stockManipulationEnabled(ns, server, stock)) {
// 			continue;
// 		}
// 		if (!(ns.getServerRequiredHackingLevel(server) <= player.hacking
// 			&& ns.hasRootAccess(server))) {
// 			continue;
// 		}

// 		if (!ns.isRunning("testManager.js", "home", server)) {
// 			let controller = new BatcherController(server, manipulatorHackPercent,
// 				1.01, manipulatorMaxScripts,
// 				stock.forecast > 0.5 ? "Grow" : "Hack");
// 			controllers.push(controller);
// 			doc["batcherController"][server] = controller;
// 			ns.exec("testManager.js", "home", 1, server);
// 		}
// 		if (!stock.manipulationStarted && stock.allowed) {
// 			for (const controller of controllers) {
// 				if (controller.target === server) {
// 					controller.stockMode = stock.forecast > 0.5 ? "Grow" : "Hack";
// 					if (stock.stockMode !== "None") {
// 						stock.manipulationStarted = true;
// 					}

// 				}
// 			}
// 		}
// 	}
// }

// function stockManipulationEnabled(ns, server, stock) {
// 	if (stock.forecast > 0.9 || stock.forecast < 0.1) {
// 		return false;
// 	}
// 	let portsNeeded = ns.getServerNumPortsRequired(server);
// 	let max = -1;
// 	allowedServers.forEach(s => {
// 		if (Number(s)) {
// 			max = Math.max(Number(s), max);
// 		}
// 	})
// 	return portsNeeded <= max || allowedServers.includes(server);
// }

// function evaluateStockManipulation(ns, period, stocks) {
// 	for (const controller of controllers) {
// 		let maxIndex = 73 - (controller.hackTime *
// 			(controller.stockMode === "Grow" ? 3.2 : 1) / 6000);
// 		if (period >= maxIndex) {
// 			controller.stockMode = "None";
// 		}
// 		let stock;
// 		for (const s of stocks) {
// 			if (stockServers[s.name] === controller.target) {
// 				stock = s;
// 				break;
// 			}
// 		}
// 		if (!stockManipulationEnabled(ns, controller.target, stock)) {
// 			controller.kill = true;
// 		}
// 	}
// 	controllers = controllers.filter(c => !c.kill);
// }

function getForecast(ns, stock, hasAccess) {
	if (hasAccess) {
		return ns.stock.getForecast(stock.name);
	}
	else {
		return stock.forecastEstimator.getEstimatedForecast();
	}
}

function getVolatility(ns, stock, hasAccess) {
	if (hasAccess) {
		return ns.stock.getVolatility(stock.name);
	}
	else {
		return stock.volatilityCounter.getAverage();
	}
}

function updateStocksEstimation(ns, stocks, hasAccess, flipped) {
	for (const s of stocks) {
		let prevPrice = s.price;
		let newPrice = ns.stock.getPrice(s.name)
		let vol = prevPrice > newPrice ? prevPrice / newPrice : newPrice / prevPrice;
		s.volatilityCounter.addElement((vol - 1) * 2);
		if (flipped) {
			s.forecastEstimator.possibleFlip();
			s.manipulationStarted = false;
			s.boughtThisCycle = false;
		}
		s.forecastEstimator.addForecast(newPrice > prevPrice);
		s.allowed = hasAccess || (s.volatilityCounter.isCertain() && s.forecastEstimator.isCertain());
		s.price = newPrice;
	}
}

function updateStocks(ns, stocks, hasAccess) {
	for (const s of stocks) {
		s.price = ns.stock.getPrice(s.name);
		s.forecast = getForecast(ns, s, hasAccess);
		s.volatility = getVolatility(ns, s, hasAccess);
		let pos = ns.stock.getPosition(s.name);
		s.bought = pos[0] - pos[2];
	}
}

function listStocks(ns, stocks) {
	for (const s of stocks) {
		if (s.bought === 0) {
			continue;
		}
		console.log("Has " + s.name);
		console.log("Forecast " + s.forecast)
		console.log("Bayes " + s.forecastEstimator.estimatedProbabilityFlipped);
	}
}

function sellStocks(ns, stocks) {
	for (const s of stocks) {
		if (!s.allowed || s.bought === 0) {
			continue;
		}
		if (s.bought > 0) {
			if (s.forecast >= 0.55) {
				continue;
			}
			sellStock(ns, s);
		}
		else {
			if (s.forecast <= 0.45) {
				continue;
			}
			sellStock(ns, s);
		}
	}
}

function sellStock(ns, s) {
	if (s.bought > 0) {
		ns.stock.sellStock(s.name, s.bought);
	}
	else {
		ns.stock.sellShort(s.name, Math.abs(s.bought));
	}
	s.bought = 0;
	s.buyPrice = 0;
	s.boughtThisCycle = false;
	console.log("Sold " + s.name);
	console.log("Bayes " + s.forecastEstimator.estimatedProbabilityFlipped);
}

function buyStocks(ns, stocks, spendableCash) {
	let initMoney = ns.getServerMoneyAvailable("home");
	stocks.sort((a, b) => stockRating(b) - stockRating(a));
	let stockMoney = totalStockValue(ns, stocks);
	let optimalStocks = optimalPortfolio(ns, stocks, spendableCash + stockMoney);
	for (const s of stocks) {
		if (!s.allowed) {
			continue;
		}
		if (!s.boughtThisCycle && s.bought !== 0 && !optimalStocks.includes(s.name)) {
			sellStock(ns, s);
		}
	}
	spendableCash += ns.getServerMoneyAvailable("home") - initMoney;
	let stockIndex = 0;
	let skippedStocks = 0;
	while (spendableCash > 100 * transactionCost && stockIndex < stocks.length) {
		let stock = stocks[stockIndex++];
		let maxBuyable = stock.maxStocks - Math.abs(stock.bought);
		if (!stock.allowed || skippedStocks >= 3) {
			skippedStocks++;
			continue;
		}
		if (maxBuyable <= 0) {
			continue;
		}
		if (stock.forecast > 0.57) {
			spendableCash -= transactionCost;
			let price = ns.stock.getAskPrice(stock.name);
			let buyAmount = Math.min(maxBuyable, Math.floor(spendableCash / price));
			if (buyAmount > 0) {
				ns.stock.buyStock(stock.name, buyAmount);
				stock.bought += buyAmount;
				spendableCash -= buyAmount * price;
				stock.buyPrice = price;
				stock.boughtThisCycle = true;
			}
			console.log("Bought " + stock.name);
			console.log("Forecast " + stock.forecast)
			console.log("Volatility " + stock.volatility)
			console.log("Bayes " + stock.forecastEstimator.estimatedProbabilityFlipped);
		}
		else if (stock.forecast < 0.43) {
			spendableCash -= transactionCost;
			let price = ns.stock.getBidPrice(stock.name);
			let buyAmount = Math.min(maxBuyable, Math.floor(spendableCash / price));
			if (buyAmount > 0) {
				ns.stock.buyShort(stock.name, buyAmount);
				stock.bought -= buyAmount;
				spendableCash -= buyAmount * price;
				stock.buyPrice = price;
				stock.boughtThisCycle = true;
			}
			console.log("Bought " + stock.name);
			console.log("Forecast " + stock.forecast)
			console.log("Volatility " + stock.volatility)
			console.log("Bayes " + stock.forecastEstimator.estimatedProbabilityFlipped);
		}
	}
}

function optimalPortfolio(ns, stocks, spendableCash) {
	let optimalStocks = [];
	let stockIndex = 0;
	while (spendableCash > 100 * transactionCost && stockIndex < stocks.length) {
		let stock = stocks[stockIndex++];
		let maxBuyable = stock.maxStocks;
		if (!stock.allowed || maxBuyable <= 0) {
			continue;
		}
		if (stock.forecast > 0.57) {
			spendableCash -= transactionCost;
			let price = ns.stock.getAskPrice(stock.name);
			let buyAmount = Math.min(maxBuyable, Math.floor(spendableCash / price));
			if (buyAmount > 0) {
				optimalStocks.push(stock.name);
				spendableCash -= buyAmount * price;
			}
		}
		else if (stock.forecast < 0.43) {
			spendableCash -= transactionCost;
			let price = ns.stock.getBidPrice(stock.name);
			let buyAmount = Math.min(maxBuyable, Math.floor(spendableCash / price));
			if (buyAmount > 0) {
				optimalStocks.push(stock.name);
				spendableCash -= buyAmount * price;
			}
		}
	}
	return optimalStocks;
}

function stockRating(stock) {
	return stock.volatility * Math.pow(Math.abs(stock.forecast - 0.5), 1.4) *
		(stock.forecast > 0.5 ? 1.1 : 1) * (stock.bought >= 0 ? 1 : Math.min(1,
			stock.price / stock.buyPrice));
}

class VolatilityCounter {
	constructor(length) {
		this.length = length;
		this.elements = [];
		this.sum = 0;
	}

	addElement(element) {
		if (this.elements.length >= this.length) {
			this.sum -= this.elements.shift();
		}
		this.elements.push(element);
		this.sum += element;
	}

	isCertain() {
		return this.elements.length >= Math.min(50, this.length);
	}

	getAverage() {
		return this.elements.length > 0 ? this.sum / this.elements.length : 0;
	}

}

class ForecastEstimator {
	constructor() {
		this.forecasts = [];
		this.prevForecasts = [];
		this.prevAvgForecast = -1;
		this.estimatedProbabilityFlipped;
	}

	doBayesStuff(forecast) {
		if (this.prevAvgForecast !== -1) {
			let pRise = (1 - this.estimatedProbabilityFlipped) * this.prevAvgForecast +
				this.estimatedProbabilityFlipped * (1 - this.prevAvgForecast);
			if (forecast) {
				this.estimatedProbabilityFlipped = ((1 - this.prevAvgForecast) *
					this.estimatedProbabilityFlipped) / pRise;
			}
			else {
				this.estimatedProbabilityFlipped = (this.prevAvgForecast *
					this.estimatedProbabilityFlipped) / (1 - pRise);
			}
		}
	}

	addForecast(forecast) {
		this.forecasts.push(forecast);
		this.doBayesStuff(forecast);
	}

	possibleFlip() {
		this.estimatedProbabilityFlipped = 0.45;
		this.prevForecasts = this.forecasts;
		this.prevAvgForecast = this.prevForecasts.filter(Boolean).length
			/ this.prevForecasts.length;
		this.forecasts = [];
	}

	isCertain() {
		if (this.prevAvgForecast === -1) {
			return this.forecasts.length >= 40;
		}
		return this.estimatedProbabilityFlipped >= 0.95 ||
			this.estimatedProbabilityFlipped <= 0.05;
	}

	getEstimatedForecast() {
		return this.prevAvgForecast === -1 ? this.forecasts.filter(Boolean).length
			/ this.forecasts.length
			: this.calcCurrentForecast(this.estimatedProbabilityFlipped >= 0.5);
	}

	calcCurrentForecast(flip) {
		let prev = flip ? 1 - this.prevAvgForecast : this.prevAvgForecast;
		return (prev * this.prevForecasts.length + this.forecasts.filter(Boolean).length)
			/ (this.prevForecasts.length + this.forecasts.length);
	}

}

let stockServers = {
	"ECP": "ecorp",
	"FNS": "foodnstuff",
	"SGC": "sigma-cosmetics",
	"OMGA": "omega-net",
	"CTK": "computek",
	"NTLK": "netlink",
	"SYSC": "syscore",
	"CTYS": "catalyst",
	"LXO": "lexo-corp",
	"APHE": "alpha-ent",
	"RHOC": "rho-construction",
	"AERO": "aerocorp",
	"GPH": "global-pharm",
	"OMN": "omnia",
	"DCOMM": "defcomm",
	"SLRS": "solaris",
	"ICRS": "icarus",
	"UNV": "univ-energy",
	"NVMD": "nova-med",
	"TITN": "titan-labs",
	"MDYN": "microdyne",
	"STM": "stormtech",
	"JGN": "joesguns",
	"HLS": "helios",
	"VITA": "vitalife",
	"FLCM": "fulcrumtech",
	"FSIG": "4sigma",
	"KGI": "kuai-gong",
	"OMTK": "omnitek",
	"BLD": "blade",
	"CLRK": "clarkinc",
	"MGCP": "megacorp"
};