import { PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	let mults = ns.getBitNodeMultipliers();

	const data = [];
	for (let [key, value] of Object.entries(mults).sort((a, b) => a[1] - b[1])) {//.filter(s => s[1] != 1)) {
		let color = value == 0 ? 'red' : (value != 1  ? 'orange' : 'lime');
		data.push([
			{ color: 'yellow', text: ' ' + key },
			{ color: color, text: value.toFixed(2).padStart(8) }
		]);
	}

	const columns = [
		{ header: ' Key', width: 30 },
		{ header: ' Multiplier', width: 12 }
	];

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}