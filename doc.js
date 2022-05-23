import { GetAllServers } from 'utils.js'

/** @param {NS} ns */
export async function main(ns) {
	ns.rainbow('rockyou');
	ns.rainbow('stanek');


	//ns.exploit();
	//ns.tprint(await ns.alterReality);
	// debugger;
	// await ns.alterReality();
}

// BYPASS
function bypass(ns) {
	const doc = eval('document');
	let url = doc.URL;
	ns.tprint(url);
	doc.completely_unused_field = 'potato';
	ns.bypass(doc);
}

// UNCLICKABLE
function unclickable() {
	let doc = eval("document");
	const element = find(doc, "//div[contains(text(), 'Click on this to')]");

	// ns.tprint(Object.keys(element));
	// for (var key of Object.keys(element)) {
	// 	ns.tprint('key: ' + key + ' value: ' + Object.keys(element[key]));
	// }

	click(element);
}

//Number.toExponential = () => 0;
//ns.tampering();


// Some DOM helpers (partial credit to @ShamesBond)
function find(doc, xpath) { return doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; }

async function click(elem) {
	debugger;
	await elem[Object.keys(elem)[1]].onClick({ target: elem, isTrusted: true });
}