import { FormatMoney } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	let sitrep = JSON.parse(ns.read('sitrep.txt'));
	sitrep.ramBudget = RamBudget(ns);
	if (!ns.args.includes('silent'))
		ns.tprint('---------------------------------');
	sitrep.gangBudget = GangBudget(ns);
	ns.write('sitrep.txt', JSON.stringify(sitrep, null, 2), 'w');
}

function GetBalance(ns, spentProp) {
	let balance = 0;
	for (const [key, value] of Object.entries(ns.getMoneySources().sinceInstall)) {
		if (key == spentProp) continue;
		if (value == 0) continue
		if (key == 'total') continue;
		// if (!ns.args.includes('silent'))
		// 	ns.tprint(key + ' ' + value);
		balance = balance + value;
	}
	return balance;
}

export const RamBudget = (ns) => GenericBudget(ns, 'RAM', 'servers', ns.getPlayer().hasCorporation ? 0.4 : 0.4, ns.getPlayer().hasCorporation ? 0.5 : 0.5);
export const GangBudget = (ns) => GenericBudget(ns, 'Gang', 'gang', 0.4 * (100 ** ns.getBitNodeMultipliers().GangSoftcap), 0.5);
//export const CorpBudget = (ns) => GenericBudget(ns, 'Corporation', 'corporation', ns.getPlayer().hasCorporation ? 1 : 0.25, ns.getPlayer().hasCorporation ? 1 : 0.2);

function GenericBudget(ns, desc, spentProp, balancePct, moneyPct) {
	let balance = GetBalance(ns, spentProp);
	// if (!ns.args.includes('silent'))
	// 	ns.tprint('INFO: balance is ' + FormatMoney(ns, balance));
	let spent = ns.getMoneySources().sinceInstall[spentProp];
	// if (!ns.args.includes('silent'))
	// 	ns.tprint('INFO: Spent on ' + desc + ' is ' + FormatMoney(ns, spent));
	let budget = balance * balancePct + spent;
	// if (!ns.args.includes('silent'))
	// 	ns.tprint('INFO: Overall budget for ' + desc + ' is ' + FormatMoney(ns, budget));
	let adjustedBudget = Math.min(budget, ns.getPlayer().money * moneyPct);
	// if (!ns.args.includes('silent'))
	// 	ns.tprint('INFO: Adjusted ' + desc + ' budget is ' + FormatMoney(ns, adjustedBudget));

	return adjustedBudget;
}