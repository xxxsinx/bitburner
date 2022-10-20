// jeek's roulette script
// Start the roulette script, then go to the roulette table.

const levenshteinDistance = (str1 = '', str2 = '') => {
	const track = Array(str2.length + 1).fill(null).map(() =>
		Array(str1.length + 1).fill(null));
	for (let i = 0; i <= str1.length; i += 1) {
		track[0][i] = i;
	}
	for (let j = 0; j <= str2.length; j += 1) {
		track[j][0] = j;
	}
	for (let j = 1; j <= str2.length; j += 1) {
		for (let i = 1; i <= str1.length; i += 1) {
			const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
			track[j][i] = Math.min(
				track[j][i - 1] + 1, // deletion
				track[j - 1][i] + 1, // insertion
				track[j - 1][i - 1] + indicator, // substitution
			);
		}
	}
	return track[str2.length][str1.length];
};

/** @param {NS} ns */
export async function main(ns) {
	let z = 0;
	let doc = eval('document');
	let initseed = Date.now();
	while (!doc.body.innerText.includes("1 to 12")) {
		await ns.sleep(1); // Sleep until you find a libertarian's ideal dating partner
	}
	let buttons = Array.from(doc.evaluate("//button[text()='Stop playing']", doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.parentElement.children[6].getElementsByTagName('button')).map(x => [parseInt(x.innerText), x]).filter(x => x[0].toString() == x[1].innerText).sort((a, b) => { return a[0] - b[0] });
	let wheels = [];
	for (let i = initseed; i < initseed + 15000; i++) {
		wheels.push([[(i / 1000) % 30000, (i / 1000) % 30000, (i / 1000) % 30000]]);
		while (wheels[wheels.length - 1].length < 75) {
			let curseed = wheels[wheels.length - 1].pop();
			let s1 = curseed[0]; let s2 = curseed[1]; let s3 = curseed[2];
			s1 = (171 * s1) % 30269; s2 = (172 * s2) % 30307; s3 = (170 * s3) % 30323;
			wheels[wheels.length - 1].push(Math.floor(37 * ((s1 / 30269.0 + s2 / 30307.0 + s3 / 30323.0) % 1.0)));
			wheels[wheels.length - 1].push([s1, s2, s3]);

		}
	}
	//    ns.tprint("Generated");
	//    ns.tprint(wheels[wheels.length-1]);
	//    ns.tprint(levenshteinDistance(wheels[0], wheels[1]));
	//    return;
	let seen = [];
	while (!doc.body.innerText.includes("You're not allowed here anymore.")) {
		if (z > 10) {
			let wagerField = doc.evaluate("//button[text()='Stop playing']", doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.parentElement.children[4].firstChild.firstChild;
			Object.getOwnPropertyDescriptor(eval('window').HTMLInputElement.prototype, "value").set.call(wagerField, '10000000')
			wagerField.dispatchEvent(new Event('input', { bubbles: true }));
			await ns.sleep(0);
		}
		let wheels2 = wheels.filter(x => levenshteinDistance(x.slice(0, seen.length - 1), seen.slice(0, seen.length - 1)) < Math.max(5, seen.length / 2));
		if (wheels2.length > 10) {
			wheels = wheels2;
		}
		if (seen.length > 0) {
			wheels.sort((a, b) => levenshteinDistance(seen, a) - levenshteinDistance(seen, b));
		}
		let nextguess = [...wheels[0]];
		for (let i = 0; i < seen.length; i++) {
			nextguess.splice(0, 1 + nextguess.indexOf(seen[i]));
		}
		if (nextguess.length < 1) {
			nextguess = [0];
		}
		ns.print("Guessing... " + nextguess[0].toString());
		try {
			buttons[nextguess[0]][1][Object.keys(buttons[nextguess[0]][1])[1]].onClick({ isTrusted: true });
		} catch {
			// ns.singularity.commitCrime("Mug");
			// ns.spawn('lazy.js')
		};
		z = z + 1;
		ns.print(wheels[0]);
		ns.print(seen);
		await ns.sleep(5000);
		seen.push(parseInt(doc.evaluate("//button[text()='Stop playing']", doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.parentElement.children[3].innerText));
	}
}