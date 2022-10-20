/** @param {NS} ns */
export async function main(ns) {
	let so = ns.getServer('phantasy');
	let opts = {
		moneyAvailable: 0,
		hackDifficulty: so.minDifficulty
	};
	let threads = calculateGrowThreadsLambert(ns, so.hostname, so.moneyMax - so.moneyAvailable, 1, opts);
	ns.tprint('You need ' + threads + ' to grow phantasy to 100% money in one pass');
}

/**
 * @author m0dar <gist.github.com/xmodar>
 * {@link https://discord.com/channels/415207508303544321/415211780999217153/954213342917050398}
 *
 * type GrowOptions = Partial<{
 *   moneyAvailable: number;
 *   hackDifficulty: number;
 *   ServerGrowthRate: number; // ns.getBitNodeMultipliers().ServerGrowthRate
 *   // https://github.com/danielyxie/bitburner/blob/dev/src/BitNode/BitNode.tsx
 * }>;
 */
export function calculateGrowGain(ns, host, threads = 1, cores = 1, opts = {}) {
	const moneyMax = ns.getServerMaxMoney(host);
	const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
	const rate = growPercent(ns, host, threads, cores, opts);
	return Math.min(moneyMax, rate * (moneyAvailable + threads)) - moneyAvailable;
}

/** @param gain money to be added to the server after grow */
export function calculateGrowThreadsLambert(ns, host, gain, cores = 1, opts = {}) {
	const moneyMax = ns.getServerMaxMoney(host);
	const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
	const money = Math.min(Math.max(moneyAvailable + gain, 0), moneyMax);
	const rate = Math.log(growPercent(ns, host, 1, cores, opts));
	const logX = Math.log(money * rate) + moneyAvailable * rate;
	const threads = lambertWLog(logX) / rate - moneyAvailable;
	return Math.max(Math.ceil(threads), 0);
}

function growPercent(ns, host, threads = 1, cores = 1, opts = {}) {
	const { ServerGrowthRate = 1, hackDifficulty = ns.getServerSecurityLevel(host), } = opts;
	const growth = ns.getServerGrowth(host) / 100;
	const multiplier = ns.getPlayer().mults["hacking_grow"];
	const base = Math.min(1 + 0.03 / hackDifficulty, 1.0035);
	const power = growth * ServerGrowthRate * multiplier * ((cores + 15) / 16);
	return base ** (power * threads);
}
/**
 * Lambert W-function for log(x) when k = 0
 * {@link https://gist.github.com/xmodar/baa392fc2bec447d10c2c20bbdcaf687}
 */
function lambertWLog(logX) {
	if (isNaN(logX)) return NaN;
	const logXE = logX + 1;
	const logY = 0.5 * log1Exp(logXE);
	const logZ = Math.log(log1Exp(logY));
	const logN = log1Exp(0.13938040121300527 + logY);
	const logD = log1Exp(-0.7875514895451805 + logZ);
	let w = -1 + 2.036 * (logN - logD);
	w *= (logXE - Math.log(w)) / (1 + w);
	w *= (logXE - Math.log(w)) / (1 + w);
	w *= (logXE - Math.log(w)) / (1 + w);
	return isNaN(w) ? (logXE < 0 ? 0 : Infinity) : w;
}

const log1Exp = (x) => x <= 0 ? Math.log(1 + Math.exp(x)) : x + log1Exp(-x);