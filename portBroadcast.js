/** @param {NS} ns */
export async function main(ns) {
	// Arbitrary port number here, you'll want to use one port per target server
	const port = 666;

	// We start with bogus values which will force an update on the port value
	let lastSecurity = -1;
	let lastHackLevel = -1;

	while (true) {
		// Get current security level and hacking level, both of which are the main factors in batch times
		// In endgame, you'd want to include some other values as well
		let security = ns.getServerMinSecurityLevel('n00dles');
		let hackLevel = ns.getHackingLevel();

		// If there was a change clear and broadcast the new value
		if (security != lastSecurity || hackLevel != lastHackLevel) {
			ns.clearPort(port);

			// Write a JSON object to the port that includes the current security level of our target
			// and the current hacking level of the player
			ns.writePort(port, JSON.stringify(
				{
					security: security,
					hackLevel: hackLevel
				}
			));

			// Update our "last" values for the next iteration
			lastSecurity= security;
			lastHackLevel= hackLevel;
		}

		await ns.sleep(0);
	}
}