import { PrintTable, DefaultStyle, ColorPrint } from 'tables.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog('ALL');

	const nodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
	const keys = Object.keys(ns.getBitNodeMultipliers()).sort((a, b) => a.localeCompare(b));
	const mults = nodes.map(s => ns.getBitNodeMultipliers(s, ns.args[0] ?? 1));

	const data = [];
	for (const key of keys) {
		const line = [{ color: 'yellow', text: ' ' + key }];
		line.push(...mults.map(s => { return { color: getColor(s[key]), text: s[key].toFixed(3).padStart(6) } }));
		data.push(line);
	}

	const columns = [
		{ header: ' Key', width: 30 }
	];
	nodes.map(s => columns.push({ header: s.toString().padStart(6), width: 7 }))

	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}

function getColor(value) {
	return value == 0 ? 'red' : (value != 1 ? 'yellow' : 'lime');
}