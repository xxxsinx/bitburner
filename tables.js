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
	// if (printfunc != ns.print)
	// 	printfunc = ns.tprint; // Temp fix until I get ansi colors working

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
	if (printfunc == ns.tprint || printfunc == ns.print || printfunc == ns.tprintf) {
		ColorPrint(ns, printStack, false);
	}
	else {
		printfunc(ns, printStack, true);
	}
}

// Selects a color based on a 1-based percentage
export function pctColor(pct) {
	if (pct >= 1) return 'Lime';
	else if (pct >= 0.9) return 'Green';
	else if (pct >= 0.75) return 'DarkGreen';
	else if (pct >= 0.6) return 'GreenYellow';
	else if (pct >= 0.3) return 'Yellow';
	else if (pct != 0) return 'DarkOrange';
	return 'Red';
}

// Usage: ColorPrint(ns, ['red', 'This is some red text', '#FFFFFF', ' This is some white text], true);
export function ColorPrint(ns, stack, toTerminal = true) {
	let out = '';
	for (let i = 0; i < stack.length; i += 2) {
		let style = stack[i];
		if (style.style == undefined) {
			style = { style: { color: stack[i], backgroundColor: '#000000' } };
		}

		let color = style;
		if (style.style) color = style.style.color;

		let match = COLORS.find(s => s.html == color || s.desc.toLowerCase() == color.toLowerCase());
		if (!match && color.startsWith('#')) match = FindHtmlColorEquivalent(ns, color);
		if (!match) match = COLORS.find(s => s.desc.toLowerCase().startsWith(color.toLowerCase()));
		if (match) color = '\x1b[38;5;' + match.ansi + 'm';
		else ns.tprint('FAIL: unsupported color: ' + color);

		let text = stack[i + 1].replace('%', '%%');
		out = out + color + text;
	}

	if (toTerminal)
		ns.tprintf(out);
	else
		ns.printf(out);
}

// ANSI colors supported by the game are 256 colors, HTML color is RGB
// This functions finds the closest match to a full range HTML color code in the 256 color ANSI colors we have to work with
function FindHtmlColorEquivalent(ns, htmlCode) {
	let copy = COLORS.map(s => s);

	copy.sort(function (a, b) {
		let ca = rgbFromHtml(a.html);
		let cb = rgbFromHtml(b.html);
		let col = rgbFromHtml(htmlCode);

		let oa = Math.abs(ca.r - col.r) + Math.abs(ca.g - col.g) + Math.abs(ca.b - col.b);
		let ob = Math.abs(cb.r - col.r) + Math.abs(cb.g - col.g) + Math.abs(cb.b - col.b);
		return oa - ob;
	}
	);

	return copy[0];
}

// Converts a hexadecimal HTML color back to RGB int values
function rgbFromHtml(htmlCode) {
	let r = Number.parseInt('0x' + htmlCode.substr(1, 2));
	let g = Number.parseInt('0x' + htmlCode.substr(3, 2));
	let b = Number.parseInt('0x' + htmlCode.substr(5, 2));
	return { r: r, g: g, b: b };
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

export let COLORS = [
	{
		"ansi": 0,
		"desc": "Grey",
		"html": "#808080",
		"rgb": "rgb(128,128,128)",
		"hsl": "hsl(0,0%,50%)\r"
	},
	{
		"ansi": 1,
		"desc": "Red",
		"html": "#ff0000",
		"rgb": "rgb(255,0,0)",
		"hsl": "hsl(0,100%,50%)\r"
	},
	{
		"ansi": 2,
		"desc": "Lime",
		"html": "#00ff00",
		"rgb": "rgb(0,255,0)",
		"hsl": "hsl(120,100%,50%)\r"
	},
	{
		"ansi": 3,
		"desc": "Yellow",
		"html": "#ffff00",
		"rgb": "rgb(255,255,0)",
		"hsl": "hsl(60,100%,50%)\r"
	},
	{
		"ansi": 4,
		"desc": "Blue",
		"html": "#0000ff",
		"rgb": "rgb(0,0,255)",
		"hsl": "hsl(240,100%,50%)\r"
	},
	{
		"ansi": 5,
		"desc": "Fuchsia",
		"html": "#ff00ff",
		"rgb": "rgb(255,0,255)",
		"hsl": "hsl(300,100%,50%)\r"
	},
	{
		"ansi": 6,
		"desc": "Aqua",
		"html": "#00ffff",
		"rgb": "rgb(0,255,255)",
		"hsl": "hsl(180,100%,50%)\r"
	},
	{
		"ansi": 7,
		"desc": "White",
		"html": "#ffffff",
		"rgb": "rgb(255,255,255)",
		"hsl": "hsl(0,0%,100%)\r"
	},
	{
		"ansi": 8,
		"desc": "Black",
		"html": "#000000",
		"rgb": "rgb(0,0,0)",
		"hsl": "hsl(0,0%,0%)\r"
	},
	{
		"ansi": 9,
		"desc": "Maroon",
		"html": "#800000",
		"rgb": "rgb(128,0,0)",
		"hsl": "hsl(0,100%,25%)\r"
	},
	{
		"ansi": 10,
		"desc": "Green",
		"html": "#008000",
		"rgb": "rgb(0,128,0)",
		"hsl": "hsl(120,100%,25%)\r"
	},
	{
		"ansi": 11,
		"desc": "Olive",
		"html": "#808000",
		"rgb": "rgb(128,128,0)",
		"hsl": "hsl(60,100%,25%)\r"
	},
	{
		"ansi": 12,
		"desc": "Navy",
		"html": "#000080",
		"rgb": "rgb(0,0,128)",
		"hsl": "hsl(240,100%,25%)\r"
	},
	{
		"ansi": 13,
		"desc": "Purple",
		"html": "#800080",
		"rgb": "rgb(128,0,128)",
		"hsl": "hsl(300,100%,25%)\r"
	},
	{
		"ansi": 14,
		"desc": "Teal",
		"html": "#008080",
		"rgb": "rgb(0,128,128)",
		"hsl": "hsl(180,100%,25%)\r"
	},
	{
		"ansi": 15,
		"desc": "Silver",
		"html": "#c0c0c0",
		"rgb": "rgb(192,192,192)",
		"hsl": "hsl(0,0%,75%)\r"
	},
	{
		"ansi": 16,
		"desc": "Grey0",
		"html": "#000000",
		"rgb": "rgb(0,0,0)",
		"hsl": "hsl(0,0%,0%)\r"
	},
	{
		"ansi": 17,
		"desc": "NavyBlue",
		"html": "#00005f",
		"rgb": "rgb(0,0,95)",
		"hsl": "hsl(240,100%,18%)\r"
	},
	{
		"ansi": 18,
		"desc": "DarkBlue",
		"html": "#000087",
		"rgb": "rgb(0,0,135)",
		"hsl": "hsl(240,100%,26%)\r"
	},
	{
		"ansi": 19,
		"desc": "Blue3",
		"html": "#0000af",
		"rgb": "rgb(0,0,175)",
		"hsl": "hsl(240,100%,34%)\r"
	},
	{
		"ansi": 20,
		"desc": "Blue3",
		"html": "#0000d7",
		"rgb": "rgb(0,0,215)",
		"hsl": "hsl(240,100%,42%)\r"
	},
	{
		"ansi": 21,
		"desc": "Blue1",
		"html": "#0000ff",
		"rgb": "rgb(0,0,255)",
		"hsl": "hsl(240,100%,50%)\r"
	},
	{
		"ansi": 22,
		"desc": "DarkGreen",
		"html": "#005f00",
		"rgb": "rgb(0,95,0)",
		"hsl": "hsl(120,100%,18%)\r"
	},
	{
		"ansi": 23,
		"desc": "DeepSkyBlue4",
		"html": "#005f5f",
		"rgb": "rgb(0,95,95)",
		"hsl": "hsl(180,100%,18%)\r"
	},
	{
		"ansi": 24,
		"desc": "DeepSkyBlue4",
		"html": "#005f87",
		"rgb": "rgb(0,95,135)",
		"hsl": "hsl(97,100%,26%)\r"
	},
	{
		"ansi": 25,
		"desc": "DeepSkyBlue4",
		"html": "#005faf",
		"rgb": "rgb(0,95,175)",
		"hsl": "hsl(07,100%,34%)\r"
	},
	{
		"ansi": 26,
		"desc": "DodgerBlue3",
		"html": "#005fd7",
		"rgb": "rgb(0,95,215)",
		"hsl": "hsl(13,100%,42%)\r"
	},
	{
		"ansi": 27,
		"desc": "DodgerBlue2",
		"html": "#005fff",
		"rgb": "rgb(0,95,255)",
		"hsl": "hsl(17,100%,50%)\r"
	},
	{
		"ansi": 28,
		"desc": "Green4",
		"html": "#008700",
		"rgb": "rgb(0,135,0)",
		"hsl": "hsl(120,100%,26%)\r"
	},
	{
		"ansi": 29,
		"desc": "SpringGreen4",
		"html": "#00875f",
		"rgb": "rgb(0,135,95)",
		"hsl": "hsl(62,100%,26%)\r"
	},
	{
		"ansi": 30,
		"desc": "Turquoise4",
		"html": "#008787",
		"rgb": "rgb(0,135,135)",
		"hsl": "hsl(180,100%,26%)\r"
	},
	{
		"ansi": 31,
		"desc": "DeepSkyBlue3",
		"html": "#0087af",
		"rgb": "rgb(0,135,175)",
		"hsl": "hsl(93,100%,34%)\r"
	},
	{
		"ansi": 32,
		"desc": "DeepSkyBlue3",
		"html": "#0087d7",
		"rgb": "rgb(0,135,215)",
		"hsl": "hsl(02,100%,42%)\r"
	},
	{
		"ansi": 33,
		"desc": "DodgerBlue1",
		"html": "#0087ff",
		"rgb": "rgb(0,135,255)",
		"hsl": "hsl(08,100%,50%)\r"
	},
	{
		"ansi": 34,
		"desc": "Green3",
		"html": "#00af00",
		"rgb": "rgb(0,175,0)",
		"hsl": "hsl(120,100%,34%)\r"
	},
	{
		"ansi": 35,
		"desc": "SpringGreen3",
		"html": "#00af5f",
		"rgb": "rgb(0,175,95)",
		"hsl": "hsl(52,100%,34%)\r"
	},
	{
		"ansi": 36,
		"desc": "DarkCyan",
		"html": "#00af87",
		"rgb": "rgb(0,175,135)",
		"hsl": "hsl(66,100%,34%)\r"
	},
	{
		"ansi": 37,
		"desc": "LightSeaGreen",
		"html": "#00afaf",
		"rgb": "rgb(0,175,175)",
		"hsl": "hsl(180,100%,34%)\r"
	},
	{
		"ansi": 38,
		"desc": "DeepSkyBlue2",
		"html": "#00afd7",
		"rgb": "rgb(0,175,215)",
		"hsl": "hsl(91,100%,42%)\r"
	},
	{
		"ansi": 39,
		"desc": "DeepSkyBlue1",
		"html": "#00afff",
		"rgb": "rgb(0,175,255)",
		"hsl": "hsl(98,100%,50%)\r"
	},
	{
		"ansi": 40,
		"desc": "Green3",
		"html": "#00d700",
		"rgb": "rgb(0,215,0)",
		"hsl": "hsl(120,100%,42%)\r"
	},
	{
		"ansi": 41,
		"desc": "SpringGreen3",
		"html": "#00d75f",
		"rgb": "rgb(0,215,95)",
		"hsl": "hsl(46,100%,42%)\r"
	},
	{
		"ansi": 42,
		"desc": "SpringGreen2",
		"html": "#00d787",
		"rgb": "rgb(0,215,135)",
		"hsl": "hsl(57,100%,42%)\r"
	},
	{
		"ansi": 43,
		"desc": "Cyan3",
		"html": "#00d7af",
		"rgb": "rgb(0,215,175)",
		"hsl": "hsl(68,100%,42%)\r"
	},
	{
		"ansi": 44,
		"desc": "DarkTurquoise",
		"html": "#00d7d7",
		"rgb": "rgb(0,215,215)",
		"hsl": "hsl(180,100%,42%)\r"
	},
	{
		"ansi": 45,
		"desc": "Turquoise2",
		"html": "#00d7ff",
		"rgb": "rgb(0,215,255)",
		"hsl": "hsl(89,100%,50%)\r"
	},
	{
		"ansi": 46,
		"desc": "Green1",
		"html": "#00ff00",
		"rgb": "rgb(0,255,0)",
		"hsl": "hsl(120,100%,50%)\r"
	},
	{
		"ansi": 47,
		"desc": "SpringGreen2",
		"html": "#00ff5f",
		"rgb": "rgb(0,255,95)",
		"hsl": "hsl(42,100%,50%)\r"
	},
	{
		"ansi": 48,
		"desc": "SpringGreen1",
		"html": "#00ff87",
		"rgb": "rgb(0,255,135)",
		"hsl": "hsl(51,100%,50%)\r"
	},
	{
		"ansi": 49,
		"desc": "MediumSpringGreen",
		"html": "#00ffaf",
		"rgb": "rgb(0,255,175)",
		"hsl": "hsl(61,100%,50%)\r"
	},
	{
		"ansi": 50,
		"desc": "Cyan2",
		"html": "#00ffd7",
		"rgb": "rgb(0,255,215)",
		"hsl": "hsl(70,100%,50%)\r"
	},
	{
		"ansi": 51,
		"desc": "Cyan1",
		"html": "#00ffff",
		"rgb": "rgb(0,255,255)",
		"hsl": "hsl(180,100%,50%)\r"
	},
	{
		"ansi": 52,
		"desc": "DarkRed",
		"html": "#5f0000",
		"rgb": "rgb(95,0,0)",
		"hsl": "hsl(0,100%,18%)\r"
	},
	{
		"ansi": 53,
		"desc": "DeepPink4",
		"html": "#5f005f",
		"rgb": "rgb(95,0,95)",
		"hsl": "hsl(300,100%,18%)\r"
	},
	{
		"ansi": 54,
		"desc": "Purple4",
		"html": "#5f0087",
		"rgb": "rgb(95,0,135)",
		"hsl": "hsl(82,100%,26%)\r"
	},
	{
		"ansi": 55,
		"desc": "Purple4",
		"html": "#5f00af",
		"rgb": "rgb(95,0,175)",
		"hsl": "hsl(72,100%,34%)\r"
	},
	{
		"ansi": 56,
		"desc": "Purple3",
		"html": "#5f00d7",
		"rgb": "rgb(95,0,215)",
		"hsl": "hsl(66,100%,42%)\r"
	},
	{
		"ansi": 57,
		"desc": "BlueViolet",
		"html": "#5f00ff",
		"rgb": "rgb(95,0,255)",
		"hsl": "hsl(62,100%,50%)\r"
	},
	{
		"ansi": 58,
		"desc": "Orange4",
		"html": "#5f5f00",
		"rgb": "rgb(95,95,0)",
		"hsl": "hsl(60,100%,18%)\r"
	},
	{
		"ansi": 59,
		"desc": "Grey37",
		"html": "#5f5f5f",
		"rgb": "rgb(95,95,95)",
		"hsl": "hsl(0,0%,37%)\r"
	},
	{
		"ansi": 60,
		"desc": "MediumPurple4",
		"html": "#5f5f87",
		"rgb": "rgb(95,95,135)",
		"hsl": "hsl(240,17%,45%)\r"
	},
	{
		"ansi": 61,
		"desc": "SlateBlue3",
		"html": "#5f5faf",
		"rgb": "rgb(95,95,175)",
		"hsl": "hsl(240,33%,52%)\r"
	},
	{
		"ansi": 62,
		"desc": "SlateBlue3",
		"html": "#5f5fd7",
		"rgb": "rgb(95,95,215)",
		"hsl": "hsl(240,60%,60%)\r"
	},
	{
		"ansi": 63,
		"desc": "RoyalBlue1",
		"html": "#5f5fff",
		"rgb": "rgb(95,95,255)",
		"hsl": "hsl(240,100%,68%)\r"
	},
	{
		"ansi": 64,
		"desc": "Chartreuse4",
		"html": "#5f8700",
		"rgb": "rgb(95,135,0)",
		"hsl": "hsl(7,100%,26%)\r"
	},
	{
		"ansi": 65,
		"desc": "DarkSeaGreen4",
		"html": "#5f875f",
		"rgb": "rgb(95,135,95)",
		"hsl": "hsl(120,17%,45%)\r"
	},
	{
		"ansi": 66,
		"desc": "PaleTurquoise4",
		"html": "#5f8787",
		"rgb": "rgb(95,135,135)",
		"hsl": "hsl(180,17%,45%)\r"
	},
	{
		"ansi": 67,
		"desc": "SteelBlue",
		"html": "#5f87af",
		"rgb": "rgb(95,135,175)",
		"hsl": "hsl(210,33%,52%)\r"
	},
	{
		"ansi": 68,
		"desc": "SteelBlue3",
		"html": "#5f87d7",
		"rgb": "rgb(95,135,215)",
		"hsl": "hsl(220,60%,60%)\r"
	},
	{
		"ansi": 69,
		"desc": "CornflowerBlue",
		"html": "#5f87ff",
		"rgb": "rgb(95,135,255)",
		"hsl": "hsl(225,100%,68%)\r"
	},
	{
		"ansi": 70,
		"desc": "Chartreuse3",
		"html": "#5faf00",
		"rgb": "rgb(95,175,0)",
		"hsl": "hsl(7,100%,34%)\r"
	},
	{
		"ansi": 71,
		"desc": "DarkSeaGreen4",
		"html": "#5faf5f",
		"rgb": "rgb(95,175,95)",
		"hsl": "hsl(120,33%,52%)\r"
	},
	{
		"ansi": 72,
		"desc": "CadetBlue",
		"html": "#5faf87",
		"rgb": "rgb(95,175,135)",
		"hsl": "hsl(150,33%,52%)\r"
	},
	{
		"ansi": 73,
		"desc": "CadetBlue",
		"html": "#5fafaf",
		"rgb": "rgb(95,175,175)",
		"hsl": "hsl(180,33%,52%)\r"
	},
	{
		"ansi": 74,
		"desc": "SkyBlue3",
		"html": "#5fafd7",
		"rgb": "rgb(95,175,215)",
		"hsl": "hsl(200,60%,60%)\r"
	},
	{
		"ansi": 75,
		"desc": "SteelBlue1",
		"html": "#5fafff",
		"rgb": "rgb(95,175,255)",
		"hsl": "hsl(210,100%,68%)\r"
	},
	{
		"ansi": 76,
		"desc": "Chartreuse3",
		"html": "#5fd700",
		"rgb": "rgb(95,215,0)",
		"hsl": "hsl(3,100%,42%)\r"
	},
	{
		"ansi": 77,
		"desc": "PaleGreen3",
		"html": "#5fd75f",
		"rgb": "rgb(95,215,95)",
		"hsl": "hsl(120,60%,60%)\r"
	},
	{
		"ansi": 78,
		"desc": "SeaGreen3",
		"html": "#5fd787",
		"rgb": "rgb(95,215,135)",
		"hsl": "hsl(140,60%,60%)\r"
	},
	{
		"ansi": 79,
		"desc": "Aquamarine3",
		"html": "#5fd7af",
		"rgb": "rgb(95,215,175)",
		"hsl": "hsl(160,60%,60%)\r"
	},
	{
		"ansi": 80,
		"desc": "MediumTurquoise",
		"html": "#5fd7d7",
		"rgb": "rgb(95,215,215)",
		"hsl": "hsl(180,60%,60%)\r"
	},
	{
		"ansi": 81,
		"desc": "SteelBlue1",
		"html": "#5fd7ff",
		"rgb": "rgb(95,215,255)",
		"hsl": "hsl(195,100%,68%)\r"
	},
	{
		"ansi": 82,
		"desc": "Chartreuse2",
		"html": "#5fff00",
		"rgb": "rgb(95,255,0)",
		"hsl": "hsl(7,100%,50%)\r"
	},
	{
		"ansi": 83,
		"desc": "SeaGreen2",
		"html": "#5fff5f",
		"rgb": "rgb(95,255,95)",
		"hsl": "hsl(120,100%,68%)\r"
	},
	{
		"ansi": 84,
		"desc": "SeaGreen1",
		"html": "#5fff87",
		"rgb": "rgb(95,255,135)",
		"hsl": "hsl(135,100%,68%)\r"
	},
	{
		"ansi": 85,
		"desc": "SeaGreen1",
		"html": "#5fffaf",
		"rgb": "rgb(95,255,175)",
		"hsl": "hsl(150,100%,68%)\r"
	},
	{
		"ansi": 86,
		"desc": "Aquamarine1",
		"html": "#5fffd7",
		"rgb": "rgb(95,255,215)",
		"hsl": "hsl(165,100%,68%)\r"
	},
	{
		"ansi": 87,
		"desc": "DarkSlateGray2",
		"html": "#5fffff",
		"rgb": "rgb(95,255,255)",
		"hsl": "hsl(180,100%,68%)\r"
	},
	{
		"ansi": 88,
		"desc": "DarkRed",
		"html": "#870000",
		"rgb": "rgb(135,0,0)",
		"hsl": "hsl(0,100%,26%)\r"
	},
	{
		"ansi": 89,
		"desc": "DeepPink4",
		"html": "#87005f",
		"rgb": "rgb(135,0,95)",
		"hsl": "hsl(17,100%,26%)\r"
	},
	{
		"ansi": 90,
		"desc": "DarkMagenta",
		"html": "#870087",
		"rgb": "rgb(135,0,135)",
		"hsl": "hsl(300,100%,26%)\r"
	},
	{
		"ansi": 91,
		"desc": "DarkMagenta",
		"html": "#8700af",
		"rgb": "rgb(135,0,175)",
		"hsl": "hsl(86,100%,34%)\r"
	},
	{
		"ansi": 92,
		"desc": "DarkViolet",
		"html": "#8700d7",
		"rgb": "rgb(135,0,215)",
		"hsl": "hsl(77,100%,42%)\r"
	},
	{
		"ansi": 93,
		"desc": "Purple",
		"html": "#8700ff",
		"rgb": "rgb(135,0,255)",
		"hsl": "hsl(71,100%,50%)\r"
	},
	{
		"ansi": 94,
		"desc": "Orange4",
		"html": "#875f00",
		"rgb": "rgb(135,95,0)",
		"hsl": "hsl(2,100%,26%)\r"
	},
	{
		"ansi": 95,
		"desc": "LightPink4",
		"html": "#875f5f",
		"rgb": "rgb(135,95,95)",
		"hsl": "hsl(0,17%,45%)\r"
	},
	{
		"ansi": 96,
		"desc": "Plum4",
		"html": "#875f87",
		"rgb": "rgb(135,95,135)",
		"hsl": "hsl(300,17%,45%)\r"
	},
	{
		"ansi": 97,
		"desc": "MediumPurple3",
		"html": "#875faf",
		"rgb": "rgb(135,95,175)",
		"hsl": "hsl(270,33%,52%)\r"
	},
	{
		"ansi": 98,
		"desc": "MediumPurple3",
		"html": "#875fd7",
		"rgb": "rgb(135,95,215)",
		"hsl": "hsl(260,60%,60%)\r"
	},
	{
		"ansi": 99,
		"desc": "SlateBlue1",
		"html": "#875fff",
		"rgb": "rgb(135,95,255)",
		"hsl": "hsl(255,100%,68%)\r"
	},
	{
		"ansi": 100,
		"desc": "Yellow4",
		"html": "#878700",
		"rgb": "rgb(135,135,0)",
		"hsl": "hsl(60,100%,26%)\r"
	},
	{
		"ansi": 101,
		"desc": "Wheat4",
		"html": "#87875f",
		"rgb": "rgb(135,135,95)",
		"hsl": "hsl(60,17%,45%)\r"
	},
	{
		"ansi": 102,
		"desc": "Grey53",
		"html": "#878787",
		"rgb": "rgb(135,135,135)",
		"hsl": "hsl(0,0%,52%)\r"
	},
	{
		"ansi": 103,
		"desc": "LightSlateGrey",
		"html": "#8787af",
		"rgb": "rgb(135,135,175)",
		"hsl": "hsl(240,20%,60%)\r"
	},
	{
		"ansi": 104,
		"desc": "MediumPurple",
		"html": "#8787d7",
		"rgb": "rgb(135,135,215)",
		"hsl": "hsl(240,50%,68%)\r"
	},
	{
		"ansi": 105,
		"desc": "LightSlateBlue",
		"html": "#8787ff",
		"rgb": "rgb(135,135,255)",
		"hsl": "hsl(240,100%,76%)\r"
	},
	{
		"ansi": 106,
		"desc": "Yellow4",
		"html": "#87af00",
		"rgb": "rgb(135,175,0)",
		"hsl": "hsl(3,100%,34%)\r"
	},
	{
		"ansi": 107,
		"desc": "DarkOliveGreen3",
		"html": "#87af5f",
		"rgb": "rgb(135,175,95)",
		"hsl": "hsl(90,33%,52%)\r"
	},
	{
		"ansi": 108,
		"desc": "DarkSeaGreen",
		"html": "#87af87",
		"rgb": "rgb(135,175,135)",
		"hsl": "hsl(120,20%,60%)\r"
	},
	{
		"ansi": 109,
		"desc": "LightSkyBlue3",
		"html": "#87afaf",
		"rgb": "rgb(135,175,175)",
		"hsl": "hsl(180,20%,60%)\r"
	},
	{
		"ansi": 110,
		"desc": "LightSkyBlue3",
		"html": "#87afd7",
		"rgb": "rgb(135,175,215)",
		"hsl": "hsl(210,50%,68%)\r"
	},
	{
		"ansi": 111,
		"desc": "SkyBlue2",
		"html": "#87afff",
		"rgb": "rgb(135,175,255)",
		"hsl": "hsl(220,100%,76%)\r"
	},
	{
		"ansi": 112,
		"desc": "Chartreuse2",
		"html": "#87d700",
		"rgb": "rgb(135,215,0)",
		"hsl": "hsl(2,100%,42%)\r"
	},
	{
		"ansi": 113,
		"desc": "DarkOliveGreen3",
		"html": "#87d75f",
		"rgb": "rgb(135,215,95)",
		"hsl": "hsl(100,60%,60%)\r"
	},
	{
		"ansi": 114,
		"desc": "PaleGreen3",
		"html": "#87d787",
		"rgb": "rgb(135,215,135)",
		"hsl": "hsl(120,50%,68%)\r"
	},
	{
		"ansi": 115,
		"desc": "DarkSeaGreen3",
		"html": "#87d7af",
		"rgb": "rgb(135,215,175)",
		"hsl": "hsl(150,50%,68%)\r"
	},
	{
		"ansi": 116,
		"desc": "DarkSlateGray3",
		"html": "#87d7d7",
		"rgb": "rgb(135,215,215)",
		"hsl": "hsl(180,50%,68%)\r"
	},
	{
		"ansi": 117,
		"desc": "SkyBlue1",
		"html": "#87d7ff",
		"rgb": "rgb(135,215,255)",
		"hsl": "hsl(200,100%,76%)\r"
	},
	{
		"ansi": 118,
		"desc": "Chartreuse1",
		"html": "#87ff00",
		"rgb": "rgb(135,255,0)",
		"hsl": "hsl(8,100%,50%)\r"
	},
	{
		"ansi": 119,
		"desc": "LightGreen",
		"html": "#87ff5f",
		"rgb": "rgb(135,255,95)",
		"hsl": "hsl(105,100%,68%)\r"
	},
	{
		"ansi": 120,
		"desc": "LightGreen",
		"html": "#87ff87",
		"rgb": "rgb(135,255,135)",
		"hsl": "hsl(120,100%,76%)\r"
	},
	{
		"ansi": 121,
		"desc": "PaleGreen1",
		"html": "#87ffaf",
		"rgb": "rgb(135,255,175)",
		"hsl": "hsl(140,100%,76%)\r"
	},
	{
		"ansi": 122,
		"desc": "Aquamarine1",
		"html": "#87ffd7",
		"rgb": "rgb(135,255,215)",
		"hsl": "hsl(160,100%,76%)\r"
	},
	{
		"ansi": 123,
		"desc": "DarkSlateGray1",
		"html": "#87ffff",
		"rgb": "rgb(135,255,255)",
		"hsl": "hsl(180,100%,76%)\r"
	},
	{
		"ansi": 124,
		"desc": "Red3",
		"html": "#af0000",
		"rgb": "rgb(175,0,0)",
		"hsl": "hsl(0,100%,34%)\r"
	},
	{
		"ansi": 125,
		"desc": "DeepPink4",
		"html": "#af005f",
		"rgb": "rgb(175,0,95)",
		"hsl": "hsl(27,100%,34%)\r"
	},
	{
		"ansi": 126,
		"desc": "MediumVioletRed",
		"html": "#af0087",
		"rgb": "rgb(175,0,135)",
		"hsl": "hsl(13,100%,34%)\r"
	},
	{
		"ansi": 127,
		"desc": "Magenta3",
		"html": "#af00af",
		"rgb": "rgb(175,0,175)",
		"hsl": "hsl(300,100%,34%)\r"
	},
	{
		"ansi": 128,
		"desc": "DarkViolet",
		"html": "#af00d7",
		"rgb": "rgb(175,0,215)",
		"hsl": "hsl(88,100%,42%)\r"
	},
	{
		"ansi": 129,
		"desc": "Purple",
		"html": "#af00ff",
		"rgb": "rgb(175,0,255)",
		"hsl": "hsl(81,100%,50%)\r"
	},
	{
		"ansi": 130,
		"desc": "DarkOrange3",
		"html": "#af5f00",
		"rgb": "rgb(175,95,0)",
		"hsl": "hsl(2,100%,34%)\r"
	},
	{
		"ansi": 131,
		"desc": "IndianRed",
		"html": "#af5f5f",
		"rgb": "rgb(175,95,95)",
		"hsl": "hsl(0,33%,52%)\r"
	},
	{
		"ansi": 132,
		"desc": "HotPink3",
		"html": "#af5f87",
		"rgb": "rgb(175,95,135)",
		"hsl": "hsl(330,33%,52%)\r"
	},
	{
		"ansi": 133,
		"desc": "MediumOrchid3",
		"html": "#af5faf",
		"rgb": "rgb(175,95,175)",
		"hsl": "hsl(300,33%,52%)\r"
	},
	{
		"ansi": 134,
		"desc": "MediumOrchid",
		"html": "#af5fd7",
		"rgb": "rgb(175,95,215)",
		"hsl": "hsl(280,60%,60%)\r"
	},
	{
		"ansi": 135,
		"desc": "MediumPurple2",
		"html": "#af5fff",
		"rgb": "rgb(175,95,255)",
		"hsl": "hsl(270,100%,68%)\r"
	},
	{
		"ansi": 136,
		"desc": "DarkGoldenrod",
		"html": "#af8700",
		"rgb": "rgb(175,135,0)",
		"hsl": "hsl(6,100%,34%)\r"
	},
	{
		"ansi": 137,
		"desc": "LightSalmon3",
		"html": "#af875f",
		"rgb": "rgb(175,135,95)",
		"hsl": "hsl(30,33%,52%)\r"
	},
	{
		"ansi": 138,
		"desc": "RosyBrown",
		"html": "#af8787",
		"rgb": "rgb(175,135,135)",
		"hsl": "hsl(0,20%,60%)\r"
	},
	{
		"ansi": 139,
		"desc": "Grey63",
		"html": "#af87af",
		"rgb": "rgb(175,135,175)",
		"hsl": "hsl(300,20%,60%)\r"
	},
	{
		"ansi": 140,
		"desc": "MediumPurple2",
		"html": "#af87d7",
		"rgb": "rgb(175,135,215)",
		"hsl": "hsl(270,50%,68%)\r"
	},
	{
		"ansi": 141,
		"desc": "MediumPurple1",
		"html": "#af87ff",
		"rgb": "rgb(175,135,255)",
		"hsl": "hsl(260,100%,76%)\r"
	},
	{
		"ansi": 142,
		"desc": "Gold3",
		"html": "#afaf00",
		"rgb": "rgb(175,175,0)",
		"hsl": "hsl(60,100%,34%)\r"
	},
	{
		"ansi": 143,
		"desc": "DarkKhaki",
		"html": "#afaf5f",
		"rgb": "rgb(175,175,95)",
		"hsl": "hsl(60,33%,52%)\r"
	},
	{
		"ansi": 144,
		"desc": "NavajoWhite3",
		"html": "#afaf87",
		"rgb": "rgb(175,175,135)",
		"hsl": "hsl(60,20%,60%)\r"
	},
	{
		"ansi": 145,
		"desc": "Grey69",
		"html": "#afafaf",
		"rgb": "rgb(175,175,175)",
		"hsl": "hsl(0,0%,68%)\r"
	},
	{
		"ansi": 146,
		"desc": "LightSteelBlue3",
		"html": "#afafd7",
		"rgb": "rgb(175,175,215)",
		"hsl": "hsl(240,33%,76%)\r"
	},
	{
		"ansi": 147,
		"desc": "LightSteelBlue",
		"html": "#afafff",
		"rgb": "rgb(175,175,255)",
		"hsl": "hsl(240,100%,84%)\r"
	},
	{
		"ansi": 148,
		"desc": "Yellow3",
		"html": "#afd700",
		"rgb": "rgb(175,215,0)",
		"hsl": "hsl(1,100%,42%)\r"
	},
	{
		"ansi": 149,
		"desc": "DarkOliveGreen3",
		"html": "#afd75f",
		"rgb": "rgb(175,215,95)",
		"hsl": "hsl(80,60%,60%)\r"
	},
	{
		"ansi": 150,
		"desc": "DarkSeaGreen3",
		"html": "#afd787",
		"rgb": "rgb(175,215,135)",
		"hsl": "hsl(90,50%,68%)\r"
	},
	{
		"ansi": 151,
		"desc": "DarkSeaGreen2",
		"html": "#afd7af",
		"rgb": "rgb(175,215,175)",
		"hsl": "hsl(120,33%,76%)\r"
	},
	{
		"ansi": 152,
		"desc": "LightCyan3",
		"html": "#afd7d7",
		"rgb": "rgb(175,215,215)",
		"hsl": "hsl(180,33%,76%)\r"
	},
	{
		"ansi": 153,
		"desc": "LightSkyBlue1",
		"html": "#afd7ff",
		"rgb": "rgb(175,215,255)",
		"hsl": "hsl(210,100%,84%)\r"
	},
	{
		"ansi": 154,
		"desc": "GreenYellow",
		"html": "#afff00",
		"rgb": "rgb(175,255,0)",
		"hsl": "hsl(8,100%,50%)\r"
	},
	{
		"ansi": 155,
		"desc": "DarkOliveGreen2",
		"html": "#afff5f",
		"rgb": "rgb(175,255,95)",
		"hsl": "hsl(90,100%,68%)\r"
	},
	{
		"ansi": 156,
		"desc": "PaleGreen1",
		"html": "#afff87",
		"rgb": "rgb(175,255,135)",
		"hsl": "hsl(100,100%,76%)\r"
	},
	{
		"ansi": 157,
		"desc": "DarkSeaGreen2",
		"html": "#afffaf",
		"rgb": "rgb(175,255,175)",
		"hsl": "hsl(120,100%,84%)\r"
	},
	{
		"ansi": 158,
		"desc": "DarkSeaGreen1",
		"html": "#afffd7",
		"rgb": "rgb(175,255,215)",
		"hsl": "hsl(150,100%,84%)\r"
	},
	{
		"ansi": 159,
		"desc": "PaleTurquoise1",
		"html": "#afffff",
		"rgb": "rgb(175,255,255)",
		"hsl": "hsl(180,100%,84%)\r"
	},
	{
		"ansi": 160,
		"desc": "Red3",
		"html": "#d70000",
		"rgb": "rgb(215,0,0)",
		"hsl": "hsl(0,100%,42%)\r"
	},
	{
		"ansi": 161,
		"desc": "DeepPink3",
		"html": "#d7005f",
		"rgb": "rgb(215,0,95)",
		"hsl": "hsl(33,100%,42%)\r"
	},
	{
		"ansi": 162,
		"desc": "DeepPink3",
		"html": "#d70087",
		"rgb": "rgb(215,0,135)",
		"hsl": "hsl(22,100%,42%)\r"
	},
	{
		"ansi": 163,
		"desc": "Magenta3",
		"html": "#d700af",
		"rgb": "rgb(215,0,175)",
		"hsl": "hsl(11,100%,42%)\r"
	},
	{
		"ansi": 164,
		"desc": "Magenta3",
		"html": "#d700d7",
		"rgb": "rgb(215,0,215)",
		"hsl": "hsl(300,100%,42%)\r"
	},
	{
		"ansi": 165,
		"desc": "Magenta2",
		"html": "#d700ff",
		"rgb": "rgb(215,0,255)",
		"hsl": "hsl(90,100%,50%)\r"
	},
	{
		"ansi": 166,
		"desc": "DarkOrange3",
		"html": "#d75f00",
		"rgb": "rgb(215,95,0)",
		"hsl": "hsl(6,100%,42%)\r"
	},
	{
		"ansi": 167,
		"desc": "IndianRed",
		"html": "#d75f5f",
		"rgb": "rgb(215,95,95)",
		"hsl": "hsl(0,60%,60%)\r"
	},
	{
		"ansi": 168,
		"desc": "HotPink3",
		"html": "#d75f87",
		"rgb": "rgb(215,95,135)",
		"hsl": "hsl(340,60%,60%)\r"
	},
	{
		"ansi": 169,
		"desc": "HotPink2",
		"html": "#d75faf",
		"rgb": "rgb(215,95,175)",
		"hsl": "hsl(320,60%,60%)\r"
	},
	{
		"ansi": 170,
		"desc": "Orchid",
		"html": "#d75fd7",
		"rgb": "rgb(215,95,215)",
		"hsl": "hsl(300,60%,60%)\r"
	},
	{
		"ansi": 171,
		"desc": "MediumOrchid1",
		"html": "#d75fff",
		"rgb": "rgb(215,95,255)",
		"hsl": "hsl(285,100%,68%)\r"
	},
	{
		"ansi": 172,
		"desc": "Orange3",
		"html": "#d78700",
		"rgb": "rgb(215,135,0)",
		"hsl": "hsl(7,100%,42%)\r"
	},
	{
		"ansi": 173,
		"desc": "LightSalmon3",
		"html": "#d7875f",
		"rgb": "rgb(215,135,95)",
		"hsl": "hsl(20,60%,60%)\r"
	},
	{
		"ansi": 174,
		"desc": "LightPink3",
		"html": "#d78787",
		"rgb": "rgb(215,135,135)",
		"hsl": "hsl(0,50%,68%)\r"
	},
	{
		"ansi": 175,
		"desc": "Pink3",
		"html": "#d787af",
		"rgb": "rgb(215,135,175)",
		"hsl": "hsl(330,50%,68%)\r"
	},
	{
		"ansi": 176,
		"desc": "Plum3",
		"html": "#d787d7",
		"rgb": "rgb(215,135,215)",
		"hsl": "hsl(300,50%,68%)\r"
	},
	{
		"ansi": 177,
		"desc": "Violet",
		"html": "#d787ff",
		"rgb": "rgb(215,135,255)",
		"hsl": "hsl(280,100%,76%)\r"
	},
	{
		"ansi": 178,
		"desc": "Gold3",
		"html": "#d7af00",
		"rgb": "rgb(215,175,0)",
		"hsl": "hsl(8,100%,42%)\r"
	},
	{
		"ansi": 179,
		"desc": "LightGoldenrod3",
		"html": "#d7af5f",
		"rgb": "rgb(215,175,95)",
		"hsl": "hsl(40,60%,60%)\r"
	},
	{
		"ansi": 180,
		"desc": "Tan",
		"html": "#d7af87",
		"rgb": "rgb(215,175,135)",
		"hsl": "hsl(30,50%,68%)\r"
	},
	{
		"ansi": 181,
		"desc": "MistyRose3",
		"html": "#d7afaf",
		"rgb": "rgb(215,175,175)",
		"hsl": "hsl(0,33%,76%)\r"
	},
	{
		"ansi": 182,
		"desc": "Thistle3",
		"html": "#d7afd7",
		"rgb": "rgb(215,175,215)",
		"hsl": "hsl(300,33%,76%)\r"
	},
	{
		"ansi": 183,
		"desc": "Plum2",
		"html": "#d7afff",
		"rgb": "rgb(215,175,255)",
		"hsl": "hsl(270,100%,84%)\r"
	},
	{
		"ansi": 184,
		"desc": "Yellow3",
		"html": "#d7d700",
		"rgb": "rgb(215,215,0)",
		"hsl": "hsl(60,100%,42%)\r"
	},
	{
		"ansi": 185,
		"desc": "Khaki3",
		"html": "#d7d75f",
		"rgb": "rgb(215,215,95)",
		"hsl": "hsl(60,60%,60%)\r"
	},
	{
		"ansi": 186,
		"desc": "LightGoldenrod2",
		"html": "#d7d787",
		"rgb": "rgb(215,215,135)",
		"hsl": "hsl(60,50%,68%)\r"
	},
	{
		"ansi": 187,
		"desc": "LightYellow3",
		"html": "#d7d7af",
		"rgb": "rgb(215,215,175)",
		"hsl": "hsl(60,33%,76%)\r"
	},
	{
		"ansi": 188,
		"desc": "Grey84",
		"html": "#d7d7d7",
		"rgb": "rgb(215,215,215)",
		"hsl": "hsl(0,0%,84%)\r"
	},
	{
		"ansi": 189,
		"desc": "LightSteelBlue1",
		"html": "#d7d7ff",
		"rgb": "rgb(215,215,255)",
		"hsl": "hsl(240,100%,92%)\r"
	},
	{
		"ansi": 190,
		"desc": "Yellow2",
		"html": "#d7ff00",
		"rgb": "rgb(215,255,0)",
		"hsl": "hsl(9,100%,50%)\r"
	},
	{
		"ansi": 191,
		"desc": "DarkOliveGreen1",
		"html": "#d7ff5f",
		"rgb": "rgb(215,255,95)",
		"hsl": "hsl(75,100%,68%)\r"
	},
	{
		"ansi": 192,
		"desc": "DarkOliveGreen1",
		"html": "#d7ff87",
		"rgb": "rgb(215,255,135)",
		"hsl": "hsl(80,100%,76%)\r"
	},
	{
		"ansi": 193,
		"desc": "DarkSeaGreen1",
		"html": "#d7ffaf",
		"rgb": "rgb(215,255,175)",
		"hsl": "hsl(90,100%,84%)\r"
	},
	{
		"ansi": 194,
		"desc": "Honeydew2",
		"html": "#d7ffd7",
		"rgb": "rgb(215,255,215)",
		"hsl": "hsl(120,100%,92%)\r"
	},
	{
		"ansi": 195,
		"desc": "LightCyan1",
		"html": "#d7ffff",
		"rgb": "rgb(215,255,255)",
		"hsl": "hsl(180,100%,92%)\r"
	},
	{
		"ansi": 196,
		"desc": "Red1",
		"html": "#ff0000",
		"rgb": "rgb(255,0,0)",
		"hsl": "hsl(0,100%,50%)\r"
	},
	{
		"ansi": 197,
		"desc": "DeepPink2",
		"html": "#ff005f",
		"rgb": "rgb(255,0,95)",
		"hsl": "hsl(37,100%,50%)\r"
	},
	{
		"ansi": 198,
		"desc": "DeepPink1",
		"html": "#ff0087",
		"rgb": "rgb(255,0,135)",
		"hsl": "hsl(28,100%,50%)\r"
	},
	{
		"ansi": 199,
		"desc": "DeepPink1",
		"html": "#ff00af",
		"rgb": "rgb(255,0,175)",
		"hsl": "hsl(18,100%,50%)\r"
	},
	{
		"ansi": 200,
		"desc": "Magenta2",
		"html": "#ff00d7",
		"rgb": "rgb(255,0,215)",
		"hsl": "hsl(09,100%,50%)\r"
	},
	{
		"ansi": 201,
		"desc": "Magenta1",
		"html": "#ff00ff",
		"rgb": "rgb(255,0,255)",
		"hsl": "hsl(300,100%,50%)\r"
	},
	{
		"ansi": 202,
		"desc": "OrangeRed1",
		"html": "#ff5f00",
		"rgb": "rgb(255,95,0)",
		"hsl": "hsl(2,100%,50%)\r"
	},
	{
		"ansi": 203,
		"desc": "IndianRed1",
		"html": "#ff5f5f",
		"rgb": "rgb(255,95,95)",
		"hsl": "hsl(0,100%,68%)\r"
	},
	{
		"ansi": 204,
		"desc": "IndianRed1",
		"html": "#ff5f87",
		"rgb": "rgb(255,95,135)",
		"hsl": "hsl(345,100%,68%)\r"
	},
	{
		"ansi": 205,
		"desc": "HotPink",
		"html": "#ff5faf",
		"rgb": "rgb(255,95,175)",
		"hsl": "hsl(330,100%,68%)\r"
	},
	{
		"ansi": 206,
		"desc": "HotPink",
		"html": "#ff5fd7",
		"rgb": "rgb(255,95,215)",
		"hsl": "hsl(315,100%,68%)\r"
	},
	{
		"ansi": 207,
		"desc": "MediumOrchid1",
		"html": "#ff5fff",
		"rgb": "rgb(255,95,255)",
		"hsl": "hsl(300,100%,68%)\r"
	},
	{
		"ansi": 208,
		"desc": "DarkOrange",
		"html": "#ff8700",
		"rgb": "rgb(255,135,0)",
		"hsl": "hsl(1,100%,50%)\r"
	},
	{
		"ansi": 209,
		"desc": "Salmon1",
		"html": "#ff875f",
		"rgb": "rgb(255,135,95)",
		"hsl": "hsl(15,100%,68%)\r"
	},
	{
		"ansi": 210,
		"desc": "LightCoral",
		"html": "#ff8787",
		"rgb": "rgb(255,135,135)",
		"hsl": "hsl(0,100%,76%)\r"
	},
	{
		"ansi": 211,
		"desc": "PaleVioletRed1",
		"html": "#ff87af",
		"rgb": "rgb(255,135,175)",
		"hsl": "hsl(340,100%,76%)\r"
	},
	{
		"ansi": 212,
		"desc": "Orchid2",
		"html": "#ff87d7",
		"rgb": "rgb(255,135,215)",
		"hsl": "hsl(320,100%,76%)\r"
	},
	{
		"ansi": 213,
		"desc": "Orchid1",
		"html": "#ff87ff",
		"rgb": "rgb(255,135,255)",
		"hsl": "hsl(300,100%,76%)\r"
	},
	{
		"ansi": 214,
		"desc": "Orange1",
		"html": "#ffaf00",
		"rgb": "rgb(255,175,0)",
		"hsl": "hsl(1,100%,50%)\r"
	},
	{
		"ansi": 215,
		"desc": "SandyBrown",
		"html": "#ffaf5f",
		"rgb": "rgb(255,175,95)",
		"hsl": "hsl(30,100%,68%)\r"
	},
	{
		"ansi": 216,
		"desc": "LightSalmon1",
		"html": "#ffaf87",
		"rgb": "rgb(255,175,135)",
		"hsl": "hsl(20,100%,76%)\r"
	},
	{
		"ansi": 217,
		"desc": "LightPink1",
		"html": "#ffafaf",
		"rgb": "rgb(255,175,175)",
		"hsl": "hsl(0,100%,84%)\r"
	},
	{
		"ansi": 218,
		"desc": "Pink1",
		"html": "#ffafd7",
		"rgb": "rgb(255,175,215)",
		"hsl": "hsl(330,100%,84%)\r"
	},
	{
		"ansi": 219,
		"desc": "Plum1",
		"html": "#ffafff",
		"rgb": "rgb(255,175,255)",
		"hsl": "hsl(300,100%,84%)\r"
	},
	{
		"ansi": 220,
		"desc": "Gold1",
		"html": "#ffd700",
		"rgb": "rgb(255,215,0)",
		"hsl": "hsl(0,100%,50%)\r"
	},
	{
		"ansi": 221,
		"desc": "LightGoldenrod2",
		"html": "#ffd75f",
		"rgb": "rgb(255,215,95)",
		"hsl": "hsl(45,100%,68%)\r"
	},
	{
		"ansi": 222,
		"desc": "LightGoldenrod2",
		"html": "#ffd787",
		"rgb": "rgb(255,215,135)",
		"hsl": "hsl(40,100%,76%)\r"
	},
	{
		"ansi": 223,
		"desc": "NavajoWhite1",
		"html": "#ffd7af",
		"rgb": "rgb(255,215,175)",
		"hsl": "hsl(30,100%,84%)\r"
	},
	{
		"ansi": 224,
		"desc": "MistyRose1",
		"html": "#ffd7d7",
		"rgb": "rgb(255,215,215)",
		"hsl": "hsl(0,100%,92%)\r"
	},
	{
		"ansi": 225,
		"desc": "Thistle1",
		"html": "#ffd7ff",
		"rgb": "rgb(255,215,255)",
		"hsl": "hsl(300,100%,92%)\r"
	},
	{
		"ansi": 226,
		"desc": "Yellow1",
		"html": "#ffff00",
		"rgb": "rgb(255,255,0)",
		"hsl": "hsl(60,100%,50%)\r"
	},
	{
		"ansi": 227,
		"desc": "LightGoldenrod1",
		"html": "#ffff5f",
		"rgb": "rgb(255,255,95)",
		"hsl": "hsl(60,100%,68%)\r"
	},
	{
		"ansi": 228,
		"desc": "Khaki1",
		"html": "#ffff87",
		"rgb": "rgb(255,255,135)",
		"hsl": "hsl(60,100%,76%)\r"
	},
	{
		"ansi": 229,
		"desc": "Wheat1",
		"html": "#ffffaf",
		"rgb": "rgb(255,255,175)",
		"hsl": "hsl(60,100%,84%)\r"
	},
	{
		"ansi": 230,
		"desc": "Cornsilk1",
		"html": "#ffffd7",
		"rgb": "rgb(255,255,215)",
		"hsl": "hsl(60,100%,92%)\r"
	},
	{
		"ansi": 231,
		"desc": "Grey100",
		"html": "#ffffff",
		"rgb": "rgb(255,255,255)",
		"hsl": "hsl(0,0%,100%)\r"
	},
	{
		"ansi": 232,
		"desc": "Grey3",
		"html": "#080808",
		"rgb": "rgb(8,8,8)",
		"hsl": "hsl(0,0%,3%)\r"
	},
	{
		"ansi": 233,
		"desc": "Grey7",
		"html": "#121212",
		"rgb": "rgb(18,18,18)",
		"hsl": "hsl(0,0%,7%)\r"
	},
	{
		"ansi": 234,
		"desc": "Grey11",
		"html": "#1c1c1c",
		"rgb": "rgb(28,28,28)",
		"hsl": "hsl(0,0%,10%)\r"
	},
	{
		"ansi": 235,
		"desc": "Grey15",
		"html": "#262626",
		"rgb": "rgb(38,38,38)",
		"hsl": "hsl(0,0%,14%)\r"
	},
	{
		"ansi": 236,
		"desc": "Grey19",
		"html": "#303030",
		"rgb": "rgb(48,48,48)",
		"hsl": "hsl(0,0%,18%)\r"
	},
	{
		"ansi": 237,
		"desc": "Grey23",
		"html": "#3a3a3a",
		"rgb": "rgb(58,58,58)",
		"hsl": "hsl(0,0%,22%)\r"
	},
	{
		"ansi": 238,
		"desc": "Grey27",
		"html": "#444444",
		"rgb": "rgb(68,68,68)",
		"hsl": "hsl(0,0%,26%)\r"
	},
	{
		"ansi": 239,
		"desc": "Grey30",
		"html": "#4e4e4e",
		"rgb": "rgb(78,78,78)",
		"hsl": "hsl(0,0%,30%)\r"
	},
	{
		"ansi": 240,
		"desc": "Grey35",
		"html": "#585858",
		"rgb": "rgb(88,88,88)",
		"hsl": "hsl(0,0%,34%)\r"
	},
	{
		"ansi": 241,
		"desc": "Grey39",
		"html": "#626262",
		"rgb": "rgb(98,98,98)",
		"hsl": "hsl(0,0%,37%)\r"
	},
	{
		"ansi": 242,
		"desc": "Grey42",
		"html": "#6c6c6c",
		"rgb": "rgb(108,108,108)",
		"hsl": "hsl(0,0%,40%)\r"
	},
	{
		"ansi": 243,
		"desc": "Grey46",
		"html": "#767676",
		"rgb": "rgb(118,118,118)",
		"hsl": "hsl(0,0%,46%)\r"
	},
	{
		"ansi": 244,
		"desc": "Grey50",
		"html": "#808080",
		"rgb": "rgb(128,128,128)",
		"hsl": "hsl(0,0%,50%)\r"
	},
	{
		"ansi": 245,
		"desc": "Grey54",
		"html": "#8a8a8a",
		"rgb": "rgb(138,138,138)",
		"hsl": "hsl(0,0%,54%)\r"
	},
	{
		"ansi": 246,
		"desc": "Grey58",
		"html": "#949494",
		"rgb": "rgb(148,148,148)",
		"hsl": "hsl(0,0%,58%)\r"
	},
	{
		"ansi": 247,
		"desc": "Grey62",
		"html": "#9e9e9e",
		"rgb": "rgb(158,158,158)",
		"hsl": "hsl(0,0%,61%)\r"
	},
	{
		"ansi": 248,
		"desc": "Grey66",
		"html": "#a8a8a8",
		"rgb": "rgb(168,168,168)",
		"hsl": "hsl(0,0%,65%)\r"
	},
	{
		"ansi": 249,
		"desc": "Grey70",
		"html": "#b2b2b2",
		"rgb": "rgb(178,178,178)",
		"hsl": "hsl(0,0%,69%)\r"
	},
	{
		"ansi": 250,
		"desc": "Grey74",
		"html": "#bcbcbc",
		"rgb": "rgb(188,188,188)",
		"hsl": "hsl(0,0%,73%)\r"
	},
	{
		"ansi": 251,
		"desc": "Grey78",
		"html": "#c6c6c6",
		"rgb": "rgb(198,198,198)",
		"hsl": "hsl(0,0%,77%)\r"
	},
	{
		"ansi": 252,
		"desc": "Grey82",
		"html": "#d0d0d0",
		"rgb": "rgb(208,208,208)",
		"hsl": "hsl(0,0%,81%)\r"
	},
	{
		"ansi": 253,
		"desc": "Grey85",
		"html": "#dadada",
		"rgb": "rgb(218,218,218)",
		"hsl": "hsl(0,0%,85%)\r"
	},
	{
		"ansi": 254,
		"desc": "Grey89",
		"html": "#e4e4e4",
		"rgb": "rgb(228,228,228)",
		"hsl": "hsl(0,0%,89%)\r"
	},
	{
		"ansi": 255,
		"desc": "Grey93",
		"html": "#eeeeee",
		"rgb": "rgb(238,238,238)",
		"hsl": "hsl(0,0%,93%)"
	}
];