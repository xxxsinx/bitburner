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

	//<input aria-invalid="false" type="number" class="MuiInput-input MuiInputBase-input MuiInputBase-inputAdornedEnd css-babvp0" value="">

	// const input = await find(doc, "//input[@value = '']");
	// if (!input) {
	// 	ns.print('FAIL: Could not get a hold of the bet amount input!');
	// 	return;
	// }

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

	// Step 5: Validate sequence
	for (let i = 0; i < 1024; i++) {
		if (log[i] == 'T') {
			await click(tails);
			const isTails = find(doc, "//p[text() = 'T']");
			if (!isTails) {
				ns.print('FAIL: Something went wrong, aborting sequence!');
				return;
			}
		}
		else if (log[i] == 'H') {
			await click(heads);
			const isHeads = find(doc, "//p[text() = 'H']");
			if (!isHeads) {
				ns.print('FAIL: Something went wrong, aborting sequence!');
				return;
			}
		}
		else {
			ns.print('FAIL: Something went wrong, aborting sequence!');
			return;
		}

		await ns.sleep(0);
	}

	ns.print('You have 10 seconds to enter a wager amount. Chop chop!');
	await ns.sleep(10000);

	const iterations = 10_000_000_000 / 10_000;

	// Step 5: Execute sequence
	for (let i = 0; i < iterations; i++) {
		if (log[i % 1024] == 'T') {
			await click(tails);
			const isTails = find(doc, "//p[text() = 'T']");
			if (!isTails) {
				ns.print('FAIL: Something went wrong, aborting sequence!');
				return;
			}
		}
		else if (log[i % 1024] == 'H') {
			await click(heads);
			const isHeads = find(doc, "//p[text() = 'H']");
			if (!isHeads) {
				ns.print('FAIL: Something went wrong, aborting sequence!');
				return;
			}
		}
		else {
			ns.print('FAIL: Something went wrong, aborting sequence!');
			return;
		}

		if (i % 100 == 0)
			await ns.sleep(0);
	}

	// Step 6: Enter an amount
	//await setText(input, `69`);
}

function find(doc, xpath) { return doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; }

async function click(elem) {
	await elem[Object.keys(elem)[1]].onClick({ isTrusted: true });
}

async function setText(input, text) {
	await input[Object.keys(input)[1]].onChange({ isTrusted: true, target: { value: text } });
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