/** @param {NS} ns */
export async function main(ns) {
    ns.tprint(' Money', ' ' + FormatMoney(ns, ns.getPlayer().money) + ' / ' + FormatMoney(ns, 100_000_000_000));
    ns.tprint(' Hacking skill', ' ' + ns.getHackingLevel().toString() + ' / ' + '2500');
    ns.tprint(' World daemon', ' ' + ns.getHackingLevel().toString() + ' / 3000');
}

export function FormatMoney(ns, value, decimals = 3) {
	if (Math.abs(value) >= 1e33) return '$' + value.toExponential(0);
	for (const pair of [[1e30, 'n'], [1e27, 'o'], [1e24, 'S'], [1e21, 's'], [1e18, 'Q'], [1e15, 'q'], [1e12, 't'], [1e9, 'b'], [1e6, 'm'], [1e3, 'k']])
		if (Math.abs(value) >= pair[0]) return (Math.sign(value) < 0 ? "-" : "") + (Math.abs(value) / pair[0]).toFixed(decimals) + pair[1];
	return '$' + (Math.sign(value) < 0 ? "-" : "") + Math.abs(value).toFixed(decimals);
}