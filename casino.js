/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL');

	// Go to Aevum if we aren't already there
	if (ns.getPlayer().city != 'Aevum') {
		if (ns.getPlayer().money < 200_000) {
			ns.tprint('ERROR: Sorry, you need at least 200k to travel to Aevum.');
			return;
		}
		if (!ns.singularity.travelToCity('Aevum')) {
			ns.tprint('ERROR: Failed to travel to Aevum.');
			return;
		}
		ns.tprint('INFO: Traveled to Aevum.');
	}

	if (!ns.singularity.goToLocation('Iker Molina Casino')) {
		ns.tprint('ERROR: Failed to travel to the casino.');
	}

	let doc = eval("document");

	// Step 2 Try to start the coin flip game
	const coinflip = find(doc, "//button[contains(text(), 'coin flip')]");
	if (!coinflip) {
		ns.tprint('Could not enter the coin flip game!');
		return;
	}
	await click(coinflip);

	// Step 3 Find the buttons
	const tails = find(doc, "//button[contains(text(), 'Tail!')]");
	const heads = find(doc, "//button[contains(text(), 'Head!')]");

	//await shash(ns)

	// Click just so we can get the result textbox
	const log = [];

	// Step 4: Click one of the buttons
	for (let i = 0; i < 1024; i++) {
		await click(tails);
		const isTails = find(doc, "//p[text() = 'T']");
		const isHeads = find(doc, "//p[text() = 'H']");

		if (isTails) log.push('T');
		else if (isHeads) log.push('H');
		else {
			ns.print('FAIL: Something went wrong, aborting sequence!');
			return;
		}
		await ns.sleep(0);
	}

	ns.print('Sequence: ' + log.join(''));

	// // Step 5: Validate sequence
	// for (let i = 0; i < 1024; i++) {
	// 	if (log[i] == 'T') {
	// 		await click(tails);
	// 		const isTails = find(doc, "//p[text() = 'T']");
	// 		if (!isTails) {
	// 			ns.print('FAIL: Something went wrong, aborting sequence!');
	// 			return;
	// 		}
	// 	}
	// 	else if (log[i] == 'H') {
	// 		await click(heads);
	// 		const isHeads = find(doc, "//p[text() = 'H']");
	// 		if (!isHeads) {
	// 			ns.print('FAIL: Something went wrong, aborting sequence!');
	// 			return;
	// 		}
	// 	}
	// 	else {
	// 		ns.print('FAIL: Something went wrong, aborting sequence!');
	// 		return;
	// 	}

	// 	await ns.sleep(0);
	// }

	const input = await find(doc, "//input[@type='number']");
	if (!input) {
		ns.print('FAIL: Could not get a hold of the bet amount input!');
		return;
	}
	input.value = 10000;

	const iterations = 10_000_000_000 / 10_000;
	let loops = 0;

	// Step 5: Execute sequence
	while (true) {
		try {
			if (log[loops % 1024] == 'T') {
				await click(tails);
				// const isTails = find(doc, "//p[text() = 'T']");
				// if (!isTails) {
				// 	ns.print('FAIL: Something went wrong, aborting sequence!');
				// 	return;
				// }
			}
			else if (log[loops % 1024] == 'H') {
				await click(heads);
				// const isHeads = find(doc, "//p[text() = 'H']");
				// if (!isHeads) {
				// 	ns.print('FAIL: Something went wrong, aborting sequence!');
				// 	return;
				// }
			}
			// else {
			// 	ns.print('FAIL: Something went wrong, aborting sequence!');
			// 	return;
			// }

			if (loops % 500 == 0)
				await ns.sleep(0);

			loops++;
		}
		catch (e) {
			ns.tprint('FAIL: ' + e);
			return;
		}
	}
	ns.tprint('INFO: Made it to the end with ' + loops + ' loops!');
}

function find(doc, xpath) { return doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; }

async function click(elem) {
	await elem[Object.keys(elem)[1]].onClick({ isTrusted: true });
}

async function setText(input, text) {
	//debugger;
	await input[Object.keys(input)[1]].onChange({ isTrusted: true, currentTarget: { value: text } });
}
async function findRetry(ns, xpath, expectFailure = false, retries = null) {
	try {
		return await autoRetry(ns, () => find(xpath), e => e !== undefined,
			() => expectFailure ? `It's looking like the element with xpath: ${xpath} isn't present...` :
				`Could not find the element with xpath: ${xpath}\nSomething may have re-routed the UI`,
			retries != null ? retries : expectFailure ? 3 : 10, 1, 2);
	} catch (e) {
		if (!expectFailure) throw e;
	}
}

async function shash(ns) {
	var doc = eval('document')

	var input
	do {
		input = doc.querySelector('input[type="number"]')
		await ns.sleep(0)
	} while (input == null);

	var buttons = doc.querySelectorAll('div#root div div div div div div button[type="button"]')
	var heads = buttons[2], tails = buttons[3]

	function click(elem) {
		Object.values(elem)[1].onClick({ isTrusted: true, target: elem })
	}

	var seq = []
	var x = 0, a = 341, b = 1, m = 1024
	for (var i = 0; i < m; i++) {
		seq.push(x < m / 2)
		x = (a * x + b) % m
	}

	function checkstart(i, v) {
		return v.at(-1) == seq[(i + v.length - 1) % m]
	}

	var v = []
	var poss = [...Array(m).keys()]

	while (poss.length > 1) {
		click(heads)
		var next = doc.querySelector('div#root div div div h3').textContent.includes('win!')
		v.push(next)
		poss = poss.filter(i => checkstart(i, v))
	}

	ns.tprint(poss[0], ' ', v.length, ' ', v)

	var start = (poss[0] + v.length) % m
	seq = [...seq.slice(start), ...seq.slice(0, start)]

	input.value = 1000000000000

	var i = 0
	while (true) {
		click(seq[i] ? heads : tails)
		// if (!doc.querySelector('div#root div div div h3').textContent.includes('win!'))
		//     ns.tprint('bad ', i)
		i = (i + 1) % m
		if (!(i % 100)) await ns.sleep(0)
	}
}