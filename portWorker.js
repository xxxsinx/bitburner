/** @param {NS} ns */
export async function main(ns) {
	const [
		target,	// target server to hack
		delay, // delay before the hack begins once this script is started
		port, // port from which to fetch the current security/hacking level from
		expectedSecurity, // expected security for this job/batch
		expectedHackingLevel] = ns.args; // expected hacking level for this job/batch

	if (target == undefined || delay == undefined || port == undefined || expectedSecurity == undefined || expectedHackingLevel == undefined) {
		ns.tprint('FAIL: Missing some arguments?!');
		return;
	}

	// We wait the requested delay before starting our hack
	await ns.sleep(delay);

	// We make sure security and hacking level are where we want them to be
	const portData = JSON.parse(ns.peek(port));
	if (portData.security != expectedSecurity) {
		ns.tprint('FAIL: Security is ' + portData.security + ' expected ' + expectedSecurity + ' aborting!');
		return;
	}
	if (portData.hackLevel != expectedHackingLevel) {
		ns.tprint('FAIL: Hack level is ' + portData.hackLevel + ' expected ' + expectedHackingLevel + ' aborting!');
		return;
	}

	// Do the hack if we passed the checks!
	await ns.hack(target);
}