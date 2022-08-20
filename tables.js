const HEADER = 0;	// Index of the header styles
const DIVIDER = 1	// Index of the horizontal divider style
const FOOTER = 2;	// Index of the footer style

const OPENER = 0;	// Index of the opener line character
const SEPARATOR = 1; // Index of the separator line character (where columns meet)
const CLOSER = 2;	// Index of the closer line character
const FILLER = 3;	// Index of the filler line character
const BAR = 4;		// Index of the straight vertical bar line character

export let win = globalThis, doc = win["document"]
let fmt = Intl.NumberFormat('en', { notation: 'compact' });

const ANSI_COLORS = {
	"r": "\x1b[31m",
	"g": "\x1b[32m",
	"b": "\x1b[34m",
	"c": "\x1b[36m",
	"m": "\x1b[35m",
	"y": "\x1b[33m",
	"bk": "\x1b[30m",
	"w": "\x1b[37m",
	"d": "\x1b[0m"
}
// ns.tprint(col.bk + "black " + col.r + "red " + col.g + "green " + col.y + "yellow "
// 	+ col.b + "blue " + col.m + "magenta " + col.c + "cyan " + col.w + "white " + col.d + "default")

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');

	// Some sample data, basic information on root servers
	// Note that if you want color, you need to use ColorPrint as the printing function
	// Colored cells need to be an object with color and text, instead of "any".. Red cell example here
	let data = ns.scan('home').map(s => [{ color: 'red', text: s }, ns.getServerMaxRam(s), ns.getServerMaxMoney(s)]);

	// For bold we need to correct the spacing... Sketch AF, not sure how else.
	// let boldText = 'bold text example blah';
	// let spacing = -0.00666666666666666666666666666667 * boldText.length;
	data.push([
		{ style: { color: 'red' }, text: 'nope' },
		//{ style: { color: 'red', fontWeight: 'bold', letterSpacing: spacing }, text: boldText },
		{ style: { color: 'white', fontStyle: 'italic' }, text: 'italic text' },
		{ style: { color: 'white', textDecorationLine: 'line-through', textDecorationStyle: 'solid' }, text: 'strikethrough text' }
	]);

	// Free style, no columns, the table adjusts to contents
	PrintTable(ns, data, undefined, DefaultStyle(), ColorPrint);

	// Example of adding a break line in the middle of the table:
	// data.push(null);
	// data.push(...ns.scan('sigma-cosmetics').slice(1).map(s => [s, ns.getServerMaxRam(s), ns.getServerMaxMoney(s)]));

	// We use pre-defined columns
	// header: The text to display
	// width : Width of the column content
	// pad   : 0 for center, < 0 for left, > 0 for right
	const columns = [
		{ header: 'Servers', width: 40 },
		{ header: 'Ram', width: 13 },
		{ header: 'Money', width: 20 }
	];
	PrintTable(ns, data, columns, DefaultStyle(), ColorPrint);
}

export function PrintTable(ns, data, columns, style = DefaultStyle(), printfunc = ns.print) {
	// Create default columns if no definition were provided
	let columnsProvided = true;
	if (columns == undefined) {
		columnsProvided = false;
		columns = [];
		for (let i = 0; i < data[0].length; i++) {
			let longest = 0;
			for (let ii = 0; ii < data.length; ii++) {
				if (data[ii] == null) continue;
				let len = data[ii][i].text != undefined ? data[ii][i].text.length : data[ii][i].toString().length;
				if (len > longest) longest = len;
			}
			columns.push({ header: '', width: longest, padHeader: 0, padContent: 0 });
		}
	}

	PrintBorder(ns, columns, style[HEADER], printfunc);
	if (columnsProvided) {
		PrintHeader(ns, columns, style[HEADER], printfunc)
		PrintBorder(ns, columns, style[DIVIDER], printfunc);
	}
	let i = 0;
	for (const line of data) {
		PrintLine(ns, columns, line, style, printfunc, i++ % 2 == 0);
	}
	PrintBorder(ns, columns, style[FOOTER], printfunc);
}

export function DefaultStyle() {
	return [
		['┌', '┬', '┐', '─', '│'],
		['├', '┼', '┤', '─', '│'],
		['└', '┴', '┘', '─', '│']
	];
}

function PrintBorder(ns, columns, style, printfunc = ns.print) {
	let printStack = [];
	printStack.push('white', style[OPENER]);
	for (let c = 0; c < columns.length; c++) {
		printStack.push('white', ''.padEnd(columns[c].width, style[FILLER]));
		if (c == columns.length - 1)
			printStack.push('white', style[CLOSER]);
		else
			printStack.push('white', style[SEPARATOR]);

	}
	PrintStack(ns, printStack, printfunc);
}

function PrintHeader(ns, columns, style, printfunc = ns.print) {
	let printStack = [];
	printStack.push('white', style[BAR]);
	for (let c = 0; c < columns.length; c++) {
		printStack.push('white', columns[c].header.padEnd(columns[c].width));
		printStack.push('white', style[BAR]);
	}
	PrintStack(ns, printStack, printfunc);
}

function PrintLine(ns, columns, data, style, printfunc = ns.print, highlight) {
	if (data == null) {
		PrintBorder(ns, columns, style[DIVIDER], printfunc);
		return;
	}

	let printStack = [];
	printStack.push('white', style[0][BAR]);
	for (let c = 0; c < columns.length; c++) {
		if (data[c].style != undefined)
			printStack.push({ style: data[c].style }, data[c].text.padEnd(columns[c].width));
		else if (data[c].color != undefined)
			printStack.push(CreateStyle(data[c].color, highlight), data[c].text.padEnd(columns[c].width));
		else
			printStack.push(CreateStyle('white', highlight), data[c].toString().padEnd(columns[c].width));
		printStack.push('white', style[0][BAR]);
	}

	PrintStack(ns, printStack, printfunc);
}

export function CreateStyle(color, highlight) {
	//return color;
	let backColor = highlight ? '#000000' : '#1A1A1A';
	return { style: { color: color, backgroundColor: backColor } };
}

function PrintStack(ns, printStack, printfunc) {
	if (printfunc == ns.tprint || printfunc == ns.print) {
		let str = '';
		for (let i = 1; i < printStack.length; i += 2) {
			str += printStack[i];
		}
		printfunc(str);
	}
	else {
		printfunc(...printStack);
	}
}

export function ColorPrint() {
	let findProp = propName => {
		for (let div of eval("document").querySelectorAll("div")) {
			let propKey = Object.keys(div)[1];
			if (!propKey) continue;
			let props = div[propKey];
			if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
			if (props.children instanceof Array) for (let child of props.children) if (child?.props && child.props[propName]) return child.props[propName];
		}
	};
	let term = findProp("terminal");

	let out = [];
	for (let i = 0; i < arguments.length; i += 2) {
		let style = arguments[i];
		if (style.style == undefined) {
			style = { style: { color: arguments[i], backgroundColor: '#000000' } };
		}
		out.push(React.createElement("span", style, arguments[i + 1]))
	}
	try {
		term.printRaw(out);
	}
	catch { }
}


/**
 * @param {ns} 
 * @param {Array} JSON DATA in form of [{id:1,name:"Lexicon"},{id:2,name:"Paradox"}]
 * @param {Array} pass an array of columns 
 * @returns {HTMLTableElement} Returns a HTMLTableElement that you can use DOM.appendChild(table);
 */
export function createHTMLTableFromJSON(ns, data, columns) {

	var formattedData = JSON.parse(JSON.stringify(data, columns));
	var col = [];
	for (var i = 0; i < formattedData.length; i++) {
		for (var key in formattedData[i]) {
			if (col.indexOf(key) === -1) {
				col.push(key);
			}
		}
	}

	var table = doc.createElement("table");
	table.style.width = '100%'

	var tr = table.insertRow(-1);                   // TABLE ROW.

	for (var i = 0; i < col.length; i++) {
		var th = doc.createElement("th");      // TABLE HEADER.
		th.innerHTML = col[i];
		tr.appendChild(th);
	}

	for (var i = 0; i < formattedData.length; i++) {

		tr = table.insertRow(-1);

		for (var j = 0; j < col.length; j++) {
			var tabCell = tr.insertCell(-1);
			if (typeof (formattedData[i][col[j]]) == 'number') {
				var number = formattedData[i][col[j]]
				if (number > 0)
					tabCell.innerHTML = addHtmlWithColor("a", fmt.format(number), "green");
				else if (number == 0)
					tabCell.innerHTML = addHtmlWithColor("a", fmt.format(number), "white");
				else if (number < 0)
					tabCell.innerHTML = addHtmlWithColor("a", fmt.format(number), "red");


			} else {
				tabCell.innerHTML = formattedData[i][col[j]];

			}

		}
	}
	return table;
}
let addHtmlWithColor = (tag, data, color) => {
	return "<" + tag + " style='color:" + color + "'>" + data + "</" + tag + ">";
}