/** @param {NS} ns */
export async function main(ns) {
	const target = ns.args[0] ?? 'joesguns';
	const moneyThresh = getServerMaxMoney(target) * 0.9;
	const securityThresh = getServerMinSecurityLevel(target) + 5;
	while (true) {
		if (getServerSecurityLevel(target) > securityThresh) {
			await ns.weaken(target);
		} else if (getServerMoneyAvailable(target) < moneyThresh) {
			await ns.grow(target);
		} else {
			await ns.hack(target);
		}
	}
}