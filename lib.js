/** @param {string} str */
export function lengthWithoutAnsi(str) {
	const ansiLength = [...str.matchAll(/\x1b[^m]*m/g)].reduce((p, c) => p + c[0].length, 0)
	return str.length - ansiLength
}

/**
 * @typedef CreateTableOptions
 * @type {object}
 * @property {boolean} headers - Default is true
 * @property {boolean} padding - Default is true, adds spaces left and right of values
 * @property {boolean} top - Default is true, adds top line
 * @property {boolean} bottom - Default is true, adds bottom line
 * @property {Object<string,string>} align - Map of property name to alignment, default is 'right', options are 'center' and 'right'
 * @property {Object<string,string>} colors - ANSI escape color codes for: 'header', 'lines', 'normal'
 */

/**
 * Convert array of objects into array of lines for a pretty table
 * @param {Object[]} objects
 * @param {CreateTableOptions} options
 * @returns {string[]} array of strings for each line, suitable for ns.tprint('\n' + result.join('\n'))
 */
export function createTable(objects, options) {
	// see: https://talyian.github.io/ansicolors/
	const white = `\x1b[37m` // white
	const cyan = `\x1b[36m` // cyan
	const yellow = `\x1b[33m` // yellow
	const blue = '\x1b[38;5;81m' // lighter blue
	const reset = '\x1b[40m'

	let lines = []

	// adjust default options with passed
	options = Object.assign({ headers: true, padding: true, top: true, bottom: true }, options)
	let colors = Object.assign({ header: cyan, lines: white, normal: reset }, options.colors)

	const keys = Object.keys(objects[0])

	if (options.headers) {
		objects.unshift(keys.reduce((p, c) => Object.assign(p, { [c]: colors.header + c }), {}))
	}

	const maxLengths = objects.reduce((p, c) => {
		keys.forEach(key => p[key] = Math.max(p[key], lengthWithoutAnsi(`${c[key]}`)))
		return p
	}, keys.reduce((p, c) => Object.assign(p, { [c]: 0 }), {}))

	// includes padding
	const actualMaxLengths = keys.reduce((p, c) => Object.assign(p, { [c]: maxLengths[c] + (options.padding ? 2 : 0) }), {})

	const box = {
		topLeft: '┌', top: '─', topRight: '┐', topDivide: '┬',
		bottomLeft: '└', bottom: '─', bottomRight: '┘', bottomDivide: '┴',
		middleLeft: '├', middle: '│', middleRight: '┤', middleDivide: '┼'
	}

	const boxAscii = {
		topLeft: '=', top: '=', topRight: '=', topDivide: '=',
		bottomLeft: '=', bottom: '=', bottomRight: '=', bottomDivide: '=',
		middleLeft: '|', middle: '|', middleRight: '|', middleDivide: '+'
	}

	let valueRows = objects.map(x => {
		return keys.map(key => {
			let value = `${x[key]}`
			const valueLength = lengthWithoutAnsi(value)
			value = value[0] === '\x1b' ? value : colors.normal + x[key]
			if (options.align && options.align[key] === 'left') {
				value = value + ''.padEnd(maxLengths[key] - valueLength, ' ')
			} else if (options.align && options.align[key] === 'center') {
				let totalDiff = maxLengths[key] - valueLength
				let startDiff = Math.trunc(totalDiff / 2)
				let endDiff = totalDiff - startDiff
				value = ''.padStart(startDiff, ' ') + value + ''.padEnd(endDiff, ' ')
			} else {
				value = ''.padStart(maxLengths[key] - valueLength, ' ') + value
			}
			if (options.padding) return ` ${value} `
			return value
		})
	})

	// const withBars = valueRows.map(x => (`${colors.lines}${box.middle}`) + x.join(`${colors.lines}${box.middle}`) + `${colors.lines}${box.middle}`)

	if (options.top) {
		const columns = Object.values(actualMaxLengths).reduce((p, c) => p.concat(''.padStart(c, box.top)), [])
		lines.push(`${colors.lines}${box.topLeft}${columns.join(box.topDivide)}${box.topRight}`)
	}

	if (options.headers) {
		// DEBUG: lines.push('valueRows[0] is: ' + JSON.stringify(valueRows[0], null, 2))
		lines.push(`${colors.lines}${box.middle}${valueRows[0].join(colors.lines + box.middle)}${colors.lines}${box.middle}`)
		valueRows = valueRows.slice(1)

		const columns = Object.values(actualMaxLengths).reduce((p, c) => p.concat(''.padStart(c, box.top)), [])
		lines.push(`${colors.lines}${box.middleLeft}${columns.join(box.middleDivide)}${box.middleRight}`)
		valueRows = valueRows.slice(0)
	}

	lines = lines.concat(valueRows.map(row => {
		return `${colors.lines}${box.middle}${row.join(colors.lines + box.middle)}${colors.lines}${box.middle}`
	}))

	if (options.bottom) {
		const columns = Object.values(actualMaxLengths).reduce((p, c) => p.concat(''.padStart(c, box.bottom)), [])
		lines.push(`${colors.lines}${box.bottomLeft}${columns.join(box.bottomDivide)}${box.bottomRight}`)
	}

	return lines
}

/**
 * Convert object(s) to a table with one row per property.
 * @param {Object<key,any>} col1 - each property of col1 will be a line
 * @param {Object<key,any>} col2 - optional, if two columns are required
 * @param {CreateTableOptions} options
 * @returns {string[]} array of strings for each line, suitable for ns.tprint('\n' + result.join('\n'))
 */
export function createVTable(col1, col2, options) {
	options = options || {}
	options.align = { key1: 'left', value1: 'right' }
	if (col2) {
		Object.assign(options.align, { key2: 'left', value2: 'right' })
	}
	options.headers = false
	let rows1 = Object.entries(col1).map(x => {
		return { key1: x[0], value1: x[1] }
	})
	return createTable(rows1, options)
}

/**
 * @typedef DefaultOptions
 * @type {any[][]}
 * 
 * Example:
 * 
 *     [
 *      ['--help' , null, 'display this help'],
 *      ['--t' , null, '--t - open tail window isntead of using terminal'],
 *      ['--connect', '', '--connect <server> - connect to server'],
 *      ['--ram', 0, '--ram <count>'],
 *     ]
 * 
 */

/**
 * Get command-line options
 * 
 * @param {NS} ns - NetScript object
 * @param {DefaultOptions} defaults - Default options
 * 
 * Example:
 * 
 *       [
 *        ['--help' , null, 'display this help'],
 *        ['--t' , null, '--t - open tail window isntead of using terminal'],
 *        ['--connect', '', '--connect <server> - connect to server'],
 *        ['--ram', 0, '--ram <count>'],
 *        ['+target', null, 'target computer]
 *       ]
 * 
 */
export function getOptions(ns, defaults) {
	let args = [...ns.args]
	const justArgs = defaults.filter(x => x[0][0] === '+').map(x => [x[0].substring(1), ...x.slice(1)])
	const justOptions = defaults.filter(x => x[0][0] === '-' && x[0][1] === '-')
	let options = justOptions.reduce((p, c) => { p[c[0].replace(/^--/, '')] = c[1]; return p }, {})
	let optionKeys = justOptions.reduce((p, c) => { p[c[0].replace(/^--/, '')] = true; return p }, {})

	// ns.tprint('options:', JSON.str(options, null, 2))
	// ns.tprint('optionKeys:', JSON.str(optionKeys, null, 2))

	for (let i = 0; i < args.length;) {
		let key = args[i]
		const arg = args[i + 1]
		if (key[0] !== '-' || key[1] !== '-') {
			i++
			continue
		}
		key = key.substring(2)
		if (optionKeys[key]) {
			if (options[key] === null) { // these have no argument, just flag as true
				options[key] = true;
				args = args.slice(0, i).concat(args.slice(i + 1))
				continue
			} else if (typeof (options[key]) === 'boolean') {
				options[key] = arg === '1' || arg.toLocaleLowerCase() === 'true'
			} else if (typeof (options[key]) === 'number') {
				options[key] = parseFloat(arg)
			} else {
				options[key] = arg
			}
			args = args.slice(0, i).concat(args.slice(i + 2))
		} else {
			ns.tprint(`UNKNOWN OPTION '${key}'`)
			showUsage(ns, defaults)
			ns.exit()
		}
	}

	justArgs.forEach(arg => {
		options[arg[0]] = args.shift() || arg[1]
	})
	return { options, args }
}

/**
 * @param {NS} ns
 * @param {DefaultOptions} defaults
 * @param {string} description
 */
export function showUsage(ns, defaults, description = null) {
	ns.tprint('')
	if (description) ns.tprint(description)
	const justArgs = defaults.filter(x => x[0][0] === '+').map(x => [x[0].substring(1), ...x.slice(1)])
	const justOptions = defaults.filter(x => x[0][0] === '-' && x[0][1] === '-')

	let argsList = []
	let argOptions = []
	justArgs.forEach(arg => {
		const argName = arg[0]
		const isRequired = arg[1] === null
		const defaultValue = arg[1]
		const formattedName = `<${argName}>`
		argsList.push(isRequired ? formattedName : `[${formattedName}]`)
		argOptions.push({ argName, isRequired, text: arg[2], defaultValue, formattedName })
	})

	ns.tprint(`Usage: run ${ns.getScriptName()} (options) ${argsList.join(' ')}`)
	argOptions.forEach(x => {
		ns.tprint(`  ${x.formattedName} - ${x.isRequired ? '(required)' : '(optional)'} ${x.text}${x.isRequired ? '' : ' (default "' + x.defaultValue + '")'}`)
	})
	justOptions.forEach(x => ns.tprint(`  ${x[2]}`))
}


/**
 * Run a command as a separate temporary script and output to a temp file
 * on the host, then wait for it to end and return the result.  Creates a
 * script execuging the command in /var/tmp, copies it to the host, execs
 * it on the host, waits for the script to finish, copies the file back to
 * the current server,  * removes the script and file from the host, reads
 * the contents of the file and deletes it and the script file from the
 * current server.  Returns the result
 * 
 * @param {NS} ns
 * @param {string} method - the method on the NS object eo execute
 * @param {any[]} args - arguments to pass to the NS method
 * @param {string} host - host to run the command on (default to current host)
 */
export async function runNsMethodThroughFile(ns, method, args = [], host = null) {
	const argsString = args.length === 0 ? '' : args.map(arg => JSON.stringify(arg)).join(',')
	var rnd = Math.trunc(Math.random() * 0x8000000).toString(16)
	const fileName = `/var/tmp/${rnd}.txt`
	const scriptFileName = `/var/tmp/${rnd}.js`
	const script = `export async function main(ns) {
    let result = ns.${method}(${argsString})
    ns.write('${fileName}', JSON.stringify(result), 'w')
  }`
	ns.write(scriptFileName, script, 'w')
	if (host) {
		await ns.scp(scriptFileName, host)
		ns.rm(scriptFileName)
		const pid = ns.exec(scriptFileName, host)
		if (!pid) throw new Error(`Could not run ${fileName} on ${host}`)
		while (ns.ps(host).find(x => x.pid === pid)) {
			await ns.sleep(15)
		}
		ns.rm(scriptFileName, host)

		await ns.scp(fileName, ns.getHostname(), host)
		ns.rm(fileName, host)

		let result = JSON.parse(ns.read(fileName))
		ns.rm(fileName)
		return result
	}

	const pid = ns.exec(scriptFileName, ns.getHostname())
	if (!pid) throw new Error(`Could not run ${fileName} on ${ns.getHostname()}`)
	while (ns.ps(ns.getHostname()).find(x => x.pid === pid)) {
		await ns.sleep(15)
	}
	let result = JSON.parse(ns.read(fileName))
	ns.rm(fileName)
	ns.rm(scriptFileName)
	return result
}



const CONSTANTS = {
	ServerBaseGrowthRate: 1.03, // Unadjusted Growth rate
	ServerMaxGrowthRate: 1.0035, // Maximum possible growth rate (max rate accounting for server security)
}

function calculateIntelligenceBonus(intelligence, weight = 1) {
	return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
}


/**
 * Returns the number of "growth cycles" needed to grow the specified server by the
 * specified amount.
 * @param {Server} server - Server being grown
 * @param {number} growth - How much the server is being grown by, in DECIMAL form (e.g. 1.5 rather than 50)
 * @param {Player} p - Reference to Player object
 * @returns {number} Number of "growth cycles" needed
 */
export function numCycleForGrowth(server, growth, p, cores = 1) {
	let ajdGrowthRate = 1 + (CONSTANTS.ServerBaseGrowthRate - 1) / server.hackDifficulty;
	if (ajdGrowthRate > CONSTANTS.ServerMaxGrowthRate) {
		ajdGrowthRate = CONSTANTS.ServerMaxGrowthRate;
	}

	const serverGrowthPercentage = server.serverGrowth / 100;

	const coreBonus = 1 + (cores - 1) / 16;
	const cycles =
		Math.log(growth) /
		(Math.log(ajdGrowthRate) *
			p.mults.hacking_grow *
			serverGrowthPercentage *
			//BitNodeMultipliers.ServerGrowthRate *
			getBNMServerGrowthRate(p) *
			coreBonus);

	return cycles;
}

/**
 * Returns the chance the player has to successfully hack a server
 */
function calculateHackingChance(server, player) {
	const hackFactor = 1.75;
	const difficultyMult = (100 - server.hackDifficulty) / 100;
	const skillMult = hackFactor * player.skills.hacking;
	const skillChance = (skillMult - server.requiredHackingSkill) / skillMult;
	const chance =
		skillChance *
		difficultyMult *
		player.mults.hacking_chance *
		calculateIntelligenceBonus(player.skills.intelligence, 1);
	if (chance > 1) {
		return 1;
	}
	if (chance < 0) {
		return 0;
	}

	return chance;
}

function getBNMHackExpGain(player) {
	// HackExpGain based on player.bitNodeN
	const map = { 4: 0.4, 5: 0.5, 6: 0.25, 7: 0.25, 9: 0.05, 11: 0.5 }
	return map[player.binNodeN] || 1
}

function getBNMScriptHackMoney(player) {
	// ScriptHackMoney based on player.bitNodeN
	// what is 'ScriptHackMoneyGain'?  
	//    Says influences how much of the stolen money will be added to player?
	//    BN 8 has it set to 0?  So no money for hacking at all!
	const map = { 3: 0.2, 4: 0.2, 5: 0.15, 6: 0.75, 7: 0.5, 8: 0.3, 9: 0.1, 10: 0.5, }
	return map[player.bitNodeN] || 1
}

function getBNMServerGrowthRate(player) {
	// ScriptHackMoney based on player.bitNodeN
	// what is 'ScriptHackMoneyGain'?  
	//    Says influences how much of the stolen money will be added to player?
	//    BN 8 has it set to 0?  So no money for hacking at all!
	const map = { 2: 0.8, 3: 0.2, 11: 0.2, }
	return map[player.bitNodeN] || 1
}

/**
 * Returns the amount of hacking experience the player will gain upon
 * successfully hacking a server
 */
function calculateHackingExpGain(server, player) {
	const baseExpGain = 3;
	const diffFactor = 0.3;
	if (server.baseDifficulty == null) {
		server.baseDifficulty = server.hackDifficulty;
	}
	let expGain = baseExpGain;
	expGain += server.baseDifficulty * diffFactor;

	// return expGain * player.mults.hacking_exp * BitNodeMultipliers.HackExpGain;
	return expGain * player.mults.hacking_exp * getBNMHackExpGain(player);
}

/**
 * Returns the percentage of money that will be stolen from a server if
 * it is successfully hacked (returns the decimal form, not the actual percent value)
 */
function calculatePercentMoneyHacked(server, player) {
	// Adjust if needed for balancing. This is the divisor for the final calculation
	const balanceFactor = 240;

	const difficultyMult = (100 - server.hackDifficulty) / 100;
	const skillMult = (player.skills.hacking - (server.requiredHackingSkill - 1)) / player.skills.hacking;
	const percentMoneyHacked =
		(difficultyMult * skillMult * player.mults.hacking_money * getBNMScriptHackMoney(player)) / balanceFactor;
	if (percentMoneyHacked < 0) {
		return 0;
	}
	if (percentMoneyHacked > 1) {
		return 1;
	}

	return percentMoneyHacked;
}

/**
 * Returns time it takes to complete a hack on a server, in seconds
 */
function calculateHackingTime(server, player) {
	const difficultyMult = server.requiredHackingSkill * server.hackDifficulty;

	const baseDiff = 500;
	const baseSkill = 50;
	const diffFactor = 2.5;
	let skillFactor = diffFactor * difficultyMult + baseDiff;
	// tslint:disable-next-line
	skillFactor /= player.skills.hacking + baseSkill;

	const hackTimeMultiplier = 5;
	const hackingTime =
		(hackTimeMultiplier * skillFactor) /
		(player.mults.hacking_speed * calculateIntelligenceBonus(player.skills.intelligence, 1));

	return hackingTime;
}

/**
 * Returns time it takes to complete a grow operation on a server, in seconds
 */
function calculateGrowTime(server, player) {
	const growTimeMultiplier = 3.2; // Relative to hacking time. 16/5 = 3.2
	return growTimeMultiplier * calculateHackingTime(server, player);
}

/**
 * Returns time it takes to complete a weaken operation on a server, in seconds
 */
function calculateWeakenTime(server, player) {
	const weakenTimeMultiplier = 4; // Relative to hacking time
	return weakenTimeMultiplier * calculateHackingTime(server, player);
}

/**
 * @param {Server} server
 */
function calculateServerGrowth(server, threads, player, cores = 1) {
	const numServerGrowthCycles = Math.max(Math.floor(threads), 0);

	//Get adjusted growth rate, which accounts for server security
	const growthRate = CONSTANTS.ServerBaseGrowthRate; // 1.03
	let adjGrowthRate = 1 + (growthRate - 1) / server.hackDifficulty;
	if (adjGrowthRate > CONSTANTS.ServerMaxGrowthRate) {
		adjGrowthRate = CONSTANTS.ServerMaxGrowthRate; // capped at 1.0035
	}

	//Calculate adjusted server growth rate based on parameters
	const serverGrowthPercentage = server.serverGrowth / 100;
	const numServerGrowthCyclesAdjusted =
		//    numServerGrowthCycles * serverGrowthPercentage * BitNodeMultipliers.ServerGrowthRate;
		numServerGrowthCycles * serverGrowthPercentage * getBNMServerGrowthRate(player);


	//Apply serverGrowth for the calculated number of growth cycles
	const coreBonus = 1 + (cores - 1) / 16;
	return Math.pow(adjGrowthRate, numServerGrowthCyclesAdjusted * player.mults.hacking_grow * coreBonus);
}


/** @type {HackingFormulas} */
const mine = {
	/** @param {Server} server
	 * @param {Player} player
	 */
	hackChance: (server, player) => calculateHackingChance(server, player),
	/** @param {Server} server
	 * @param {Player} player
	 */
	hackExp: (server, player) => calculateHackingExpGain(server, player), // needs BitNodeModifiers
	/** @param {Server} server
	 * @param {Player} player
	 */
	hackPercent: (server, player) => calculatePercentMoneyHacked(server, player),
	/** @param {Server} server
	 * @param {Player} player
	 */
	growPercent: (server, threads, player, cores = 1) => calculateServerGrowth(server, threads, player, cores),
	/** @param {Server} server
	 * @param {Player} player
	 */
	hackTime: (server, player) => calculateHackingTime(server, player) * 1000,
	/** @param {Server} server
	 * @param {Player} player
	 */
	growTime: (server, player) => calculateGrowTime(server, player) * 1000,
	/** @param {Server} server
	 * @param {Player} player
	 */
	weakenTime: (server, player) => calculateWeakenTime(server, player) * 1000,
	/**
	 * Returns the number of "growth cycles" needed to grow the specified server by the
	 * specified amount.
	 * @param {Server} server - Server being grown
	 * @param {number} growth - How much the server is being grown by, in DECIMAL form (e.g. 1.5 rather than 50)
	 * @param {Player} player - Reference to Player object
	 * @returns {number} Number of "growth cycles" needed
	 */
	numCycleForGrowth: (server, growth, player, cores = 1) => numCycleForGrowth(server, growth, player, cores = 1),
}

export function checkFormulasExe(ns) {
	let files = ns.ls('home', 'Formulas.exe')
	return (files.length > 0)
}

/**
 * Get hacking formulas, preferring ns.formulas.hacking but falling back
 * to custom.
 * 
 * @param {NS} ns - Netscript object
 * @param {boolean} force - If true, will prevent fallback to my functions
 * @returns {HackingFormulas} - Formulas to calculate hacking values
 */
export function getHackingFormulas(ns, force = null) {
	if (force === true || (force === null && checkFormulasExe(ns))) {
		return ns.formulas.hacking
	}
	return mine
}

/**
 * Returns my customized formulas created from Bitburner code
 * 
 * @returns {HackingFormulas}
 */
export function getCustomFormulas() {
	return mine
}