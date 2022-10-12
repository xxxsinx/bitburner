/**
 * 1.7t in 1320 or 4.7t/h (6.2t/h max)
 * 2.4t in 1800s or 4.9t/h (6.0t/h max)
 * available ram hovering around 7200gb, I'm missing about 20%
 * 4.3t in 3001s or 5.1t/h (5.8t/h max)
 
/tools/grader-hgw.js: Finished testing after 1:00:00. Money increased by $5.20t, effective profit is $86.70b/min
/tools/batcher-hgw.js: {"availableRam":7251.9000000000015,"hostMaxRam":32768,"expectedWeak":748,"possibleHacks":187}
/tools/batcher-hgw.js: kills: {"weak":0,"grow":40747,"hack":35205}/h max), counts: {"weak":749,"grow":600,"hack":187}
/tools/batcher-hgw.js: $5.2t in 3,601s or $5.2t/h ($5.7t/h max)

 */

const GROWTH_FUDGE_FACTOR = 0.99 // Must recover this much of a hack

import { createTable, getCustomFormulas } from "/lib"

const hacking = getCustomFormulas()

/** @param {NS} ns */
export async function main(ns) {
	if (ns.args[0] === '--help' || ns.args[0] === '-h') {
		const lines = [
			`Usage: run ${ns.getScriptName()} <host> <target> [command] [growPort] [hackPort]`,
			`  <host>    - scripting host with lots of ram`,
			`  <target>  - target computer, or 'all' which will pick`,
			`  command - optional, defaults to 'run'`,
			`      run     - default if not specified, runs batcher`,
			`      analyze - analyze server(s) and report as a table`,
			`      details - analyze server(s) and report details a table`,
			`  port - first port to use for communication (default 5), uses port+1 and port+2 also`,
		]
		ns.tprint('\n' + lines.join('\n'))
		return
	}

	let [host, target, command, port] = ns.args
	// ns.tprint(JSON.stringify({host, target, command, port}))
	port = port || 5

	// get host information
	host = host || ns.getHostname()
	let hostServer = ns.getServer(host)
	let ram = ((command === 'analyze' || command === 'details') && (host !== ns.getHostname())) ? hostServer.maxRam : hostServer.maxRam - hostServer.ramUsed // use all ram when anlyzing only and if host isn't current computer
	let cores = hostServer.cpuCores
	ns.tprint(`WARNING: host is ${host}`)

	// perform calculations and analyze server(s)
	const calculations = (target === 'all' || !target ? analyzeAllServers(ns, ram, cores) : [analyzeServer(ns, ram, target, cores)])
	//ns.tprint('calculations: ' + JSON.stringify(calculations))
	calculations.sort((a, b) => (b.profit || 0) - (a.profit || 0)) // highest profit first

	// if analyzing, report as a table and return
	if (command === 'analyze' || command === 'details') {
		(command === 'analyze' ? report : reportDetails)(ns, calculations)
		return
	}

	// disable logs
	ns.disableLog('ALL')

	console.log('calculations: ', calculations);

	var obj = eval("window['obj'] = window['obj'] || {}")
	obj.errors = []
	obj.nonstop = []
	let batcher = {}
	obj.batcher = batcher
	batcher.calculations = calculations[0]
	target = batcher.calculations.hostname
	batcher.args = ns.args
	batcher.host = host
	batcher.target = target
	batcher.command = command
	batcher.port = port
	batcher.hResults = ns.getPortHandle(port)
	batcher.hResults2 = ns.getPortHandle(port + 1)
	batcher.hWeakenTime = ns.getPortHandle(port + 2)
	batcher.player = ns.getPlayer()
	batcher.server = ns.getServer(batcher.target)
	batcher.hackTimeUpdates = []

	batcher.hResults.clear()
	batcher.hResults2.clear()
	batcher.hWeakenTime.clear()
	batcher.ram = ram
	batcher.cores = cores

	report(ns, [batcher.calculations])


	/**
	 * Object containing all active workers, key is exec time.
	 * @type {Object<string,Worker}
	 */
	batcher.workers = {}

	/**
	 * Object containing created hacks and grows we haven't received a start
	 * message for.  When we get the start message and the worker ending
	 * immediately before is the same type, kill it.
	 * @type {Object<string,Worker}
	 */
	batcher.checkWorkers = {}

	/**
	 * Array of workers, populated after start/continue message is received from
	 * worker script and sorted by eEnd - expected end time set by script with
	 * accurate start time and duration.
	 *
	 * @type {Worker[]}
	 */
	batcher.processing = []
	batcher.totalProfit = 0
	batcher.hackSuccess = 0
	batcher.hackFail = 0

	/**
	 * Function to compare workers using eEnd and then id, used to keep
	 * processing[] sorted and perform binary searches to find slots for
	 * scheduling when we know the end time.
	 * 
	 * @param {Worker} worker1
	 * @param {Worker} worker2
	 */
	const compareWorkers = (worker1, worker2) => {
		if (!worker2) return -1 // this is 'less' than no worker, for bsearch insert
		if (worker1.eEnd > worker2.eEnd) return 1
		if (worker1.eEnd < worker2.eEnd) return -1
		if (worker1.id > worker2.id) return 1
		if (worker1.id < worker2.id) return -1
		return 0
	}
	batcher.compareWorkers = compareWorkers

	/**
	 * Use binary search to quickly find worker or location to insert a new worker
	 * using 'worker.eEnd' and given two at the same time, use  
	 * 
	 * @param {Worker} worker
	 */
	const findProcessing = (worker) => {
		let min = 0, max = batcher.processing.length - 1
		while (min <= max) {
			let index = Math.trunc((min + max) / 2)
			let test = batcher.compareWorkers(worker, batcher.processing[index])
			if (test > 0) {
				min = index + 1
			} else {
				max = index - 1
			}
		}
		return min;
	}
	batcher.findProcessing = findProcessing

	/**
	 * How many scripts are currently executing, used to calculate ram usage
	 * when scheduling grows so we leave room for hacks.
	 * 
	 * @type {Counts}
	 */
	const counts = {
		weak: 0,
		grow: 0,
		hack: 0
	}
	batcher.counts = counts

	/**
	 * How many total executions we've had since start
	 * 
	 * @type {Counts}
	 */
	const executions = {
		weak: 0,
		grow: 0,
		hack: 0
	}
	batcher.executions = executions

	/**
	 * How many total times we've killed these commands
	 * 
	 * @type {Counts}
	 */
	const kills = {
		weak: 0,
		grow: 0,
		hack: 0
	}
	batcher.kills = kills

	// make sure server has been prepped, in a real script we might do this automatically
	ns.print(`Ensuring server ${target} is ready`)
	const ensureServerIsReady = (target) => {
		let testServer = ns.getServer(target)
		if (testServer.hackDifficulty !== testServer.minDifficulty || testServer.moneyAvailable !== testServer.moneyMax) {
			ns.tprint(JSON.stringify(testServer, null, 2))
			ns.tprint(`ERROR!  ${target} needs prepping!`)
			ns.exit()
		}
	}
	ensureServerIsReady(target)

	// used to calculate ram available
	batcher.hostMaxRam = ns.getServerMaxRam(host)

	// if we have an error, kill all scripts on all servers and exit
	const EXIT = (message, errorObject) => {
		ns.tprint(`ERROR: ${message}`)
		ns.tprint(`INFO: ` + JSON.stringify(errorObject, null, 2))
		otherServers.forEach(x => ns.killall(x.hostname))
		ns.killall()
		ns.exit()
	}

	/**
	 * Process pending messages on ports from worker scripts
	 */
	const processIncomingMessages = () => {
		let messages = []
		while (!batcher.hResults.empty()) {
			messages[messages.length] = JSON.parse(batcher.hResults.read())
		}
		while (!batcher.hResults2.empty()) {
			messages[messages.length] = JSON.parse(batcher.hResults2.read())
		}
		if (messages.length === 0) return

		// sort 'end' first, then by id
		messages.sort((a, b) => {
			if (a.message === 'end' && b.message !== 'end') return -1
			if (b.message === 'end' && a.message !== 'end') return 1
			return a.id - b.id
		})

		messages.forEach(msg => {
			let { message, id, command, start, time, eEnd, end, result } = msg
			let worker = batcher.workers[id]
			if (!worker) EXIT(`Got message for unknown worker ${id}`, { msg, workers: batcher.workers })

			// ------------------------------ start message ------------------------------
			// { id, message: 'start', command: 'weak', start, time, eEnd }
			// Worker has actually started and called the method, add to the right spot
			// in processing[] and update with a more accurate 'eEnd' expected end time.
			if (message === 'start') {
				let index = batcher.findProcessing({ id, eEnd })
				if (batcher.compareWorkers({ id, eEnd }, batcher.processing[index]) === 0) EXIT('got start message for worker already in array!', { msg, processing: batcher.processing, workers: batcher.workers })

				// update worker with accurate info and insert into array at the right spot
				Object.assign(worker, { start, time, eEnd })
				batcher.processing = batcher.processing.slice(0, index).concat([worker]).concat(batcher.processing.slice(index))
				batcher.counts[command]++

				// check if previous command is the same, and kill it if so
				/** @type {Worker} */
				let previous = batcher.processing[index - 1]
				if (worker.command !== 'weak' && previous && previous.command === worker.command) {
					ns.kill(previous.pid, previous.host)
					delete batcher.workers[previous.id]
					batcher.counts[previous.command]--
					batcher.kills[previous.command]++
					batcher.processing = batcher.processing.slice(0, index - 1).concat(batcher.processing.slice(index))
				}
			} else if (message === 'continue') {
				// { id, message: 'continue', command: 'weak', start, time, eEnd, end, result }
				// this is for end and restart of 'weak' commands that are running continuously,
				// with end time and result from previous run and new eEnd and start times
				// for the new run

				batcher.nextWeak = 0

				// remove previous run from processing[]
				let oldIndex = batcher.findProcessing(worker)
				batcher.processing = batcher.processing.slice(0, oldIndex).concat(batcher.processing.slice(oldIndex + 1))

				// update worker and insert into new position in processing[] with new eEnd
				Object.assign(worker, { start, time, eEnd, end: null, result: null })
				let newIndex = batcher.findProcessing(worker)
				batcher.processing = batcher.processing.slice(0, newIndex).concat([worker]).concat(batcher.processing.slice(newIndex))
				batcher.executions[command]++
			} else if (message === 'end') {
				// ------------------------------ end message ------------------------------
				// { id, message: 'end', command: 'grow', end, result }
				// Update end information and remove from processing[] and workers{}
				let index = batcher.findProcessing(worker)
				if (batcher.compareWorkers(worker, batcher.processing[index]) !== 0) EXIT(`got end message for worker missing from array!`, { msg, worker, index, processingLength: batcher.processing.length, processing: batcher.processing[index] })

				// record profits, successes, and failures
				if (command === 'hack') {
					batcher.totalProfit += result || 0
					batcher.hackSuccess += result ? 1 : 0
					batcher.hackFail += result ? 0 : 1
				}

				// delete worker from processing[] and workers{}, update counts
				batcher.processing = batcher.processing.slice(0, index).concat(batcher.processing.slice(index + 1))
				delete batcher.workers[id]
				batcher.counts[command]--
				batcher.executions[command]++
			} else {
				EXIT(`unknown message ${message}`, msg)
			}
		});
	}

	// handle utilizing ram on other servers for weak scripts
	// let otherServers = [{"hostname":"n00dles","maxRam":4},{"hostname":"foodnstuff","maxRam":16},{"hostname":"sigma-cosmetics","maxRam":16},{"hostname":"joesguns","maxRam":16},{"hostname":"hong-fang-tea","maxRam":16},{"hostname":"harakiri-sushi","maxRam":16},{"hostname":"iron-gym","maxRam":32},{"hostname":"zer0","maxRam":32},{"hostname":"nectar-net","maxRam":16},{"hostname":"max-hardware","maxRam":32},{"hostname":"CSEC","maxRam":8},{"hostname":"silver-helix","maxRam":64},{"hostname":"phantasy","maxRam":32},{"hostname":"omega-net","maxRam":32},{"hostname":"neo-net","maxRam":32},{"hostname":"netlink","maxRam":16},{"hostname":"avmnite-02h","maxRam":64},{"hostname":"the-hub","maxRam":64},{"hostname":"I.I.I.I","maxRam":64},{"hostname":"summit-uni","maxRam":16},{"hostname":"zb-institute","maxRam":32},{"hostname":"catalyst","maxRam":128},{"hostname":"rothman-uni","maxRam":128},{"hostname":"alpha-ent","maxRam":128},{"hostname":"millenium-fitness","maxRam":64},{"hostname":"lexo-corp","maxRam":32},{"hostname":"aevum-police","maxRam":64},{"hostname":"rho-construction","maxRam":16},{"hostname":"global-pharm","maxRam":16},{"hostname":"omnia","maxRam":64},{"hostname":"unitalife","maxRam":32},{"hostname":"univ-energy","maxRam":128},{"hostname":"solaris","maxRam":16},{"hostname":"titan-labs","maxRam":128},{"hostname":"run4theh111z","maxRam":512},{"hostname":"microdyne","maxRam":64},{"hostname":"fulcrumtech","maxRam":128},{"hostname":"helios","maxRam":64},{"hostname":"vitalife","maxRam":64},{"hostname":".","maxRam":16},{"hostname":"omnitek","maxRam":512},{"hostname":"blade","maxRam":128},{"hostname":"powerhouse-fitness","maxRam":16}]
	let otherServers = []
	let usableServers = [...otherServers]
	batcher.otherServers = otherServers
	batcher.usableServers = usableServers

	const copyFilesToServers = async () => {
		ns.write(getScriptName('hack'), getScript('hack'), 'w')
		ns.write(getScriptName('grow'), getScript('grow'), 'w')
		ns.write(getScriptName('weak'), getScript('weak'), 'w')
		let servers = [...otherServers, host]
		for (let i = 0; i < servers.length; i++) {
			if (servers[i] === ns.getHostname()) continue
			ns.rm(getScriptName('hack'), servers[i])
			ns.rm(getScriptName('grow'), servers[i])
			ns.rm(getScriptName('weak'), servers[i])
			await ns.scp(getScriptName('hack'), servers[i])
			await ns.scp(getScriptName('grow'), servers[i])
			await ns.scp(getScriptName('weak'), servers[i])
		}
	}
	await copyFilesToServers()

	/**
	 * Used to schedule weakens on other servers
	 */
	const findOtherServer = (ram) => {
		while (usableServers.length > 0 && usableServers[0].maxRam < weakScriptRam) {
			usableServers = usableServers.slice(1)
		}

		if (usableServers.length <= 0) return null
		usableServers[0].maxRam -= weakScriptRam
		return usableServers[0].hostname
	}
	batcher.findOtherServer = findOtherServer

	/**
	 * Create a new worker
	 * @param {string} host Hostname to execute command on
	 * @param {string} command One of 'weak', 'hack', 'grow'
	 * @param {number} threads How many threads to use
	 * @param {number} id Id (time)
	 * @param {number} execTime Expected duration
	 * @param {number} execEnd Expected end time
	 */
	const createWorker = (host, command, threads, id, execTime, execEnd) => {
		if (batcher.workers[id]) return null

		/**
		 * @type{Worker}
		 */
		const worker = {
			id,
			command,
			start: null,
			time: null,
			eEnd: null,
			end: null,
			result: null,
			execStart: id,
			execEnd,
			execTime,
			host,
			pid: null,
		}

		batcher.workers[id] = worker
		const scriptFile = getScriptName(command)
		try {
			worker.pid = ns.exec(scriptFile, host, threads, batcher.target, id, command, port, execTime)
		} catch (ERR) {
			EXIT(ERR, { args: [scriptFile, host, threads, batcher.target, id, command, port, execTime], worker, calculations: batcher.calculations })
		}
		if (!worker.pid) {
			EXIT(`could not exec() script`, { args: [scriptFile, host, threads, batcher.target, id, command, port, execTime], worker, calculations: batcher.calculations })
		}
		return worker
	}
	batcher.createWorker = createWorker

	ns.tprint(`Starting main loop at ${new Date().toLocaleTimeString()}`)
	ns.tprint(`    Expect results at ${new Date(new Date().valueOf() + ns.getWeakenTime(target)).toLocaleTimeString()}`)

	// for scheduling weaken commands
	batcher.nextWeak = new Date().valueOf()
	batcher.absoluteStartTime = new Date().valueOf()

	// for special processing running first hack before first weaken
	batcher.firstHack = true

	batcher.lastGrowCreatedAt = 0
	batcher.lastHackCreatedAt = 0

	// method is weak, weak, grow, weak, weak, grow with hack in between
	batcher.expectedWeak = Math.ceil(ns.getWeakenTime(target) / (batcher.calculations.delay)) // how many weakens will be running
	batcher.possibleHacks = batcher.calculations.activeHacks // how many hacks can we possibly fit?

	const removeOldProcessing = () => {
		let i = 0
		let time = new Date().valueOf() - 30000 // 30 seconds late
		while (batcher.processing.length && i < batcher.processing.length && batcher.processing[i].eEnd < time) {
			i++
		}
		if (i > 0) {
			obj.errors.push({ message: `Removing ${i} processing that are 30 seconds late`, rows: batcher.processing.slice(0, i) })
			batcher.processing = batcher.processing.slice(i)
		}
	}

	const createResultReporter = () => {
		let lastReport = new Date().valueOf()
		return (data) => {
			const now = new Date().valueOf()
			if (now - lastReport >= 60000) {
				lastReport = now
				ns.tprint(JSON.stringify(data))
				const seconds = (now - batcher.absoluteStartTime) / 1000
				const perHour = batcher.totalProfit / (seconds / 3600)
				if (!batcher.warmup) {
					batcher.warmup = batcher.calculations.wTime / 1000
				}
				let maxPerHour = 0
				if (seconds > batcher.warmup) {
					maxPerHour = batcher.totalProfit / ((seconds - batcher.warmup) / 3600)
				}
				ns.tprint(`kills: ${JSON.stringify(batcher.kills)}, counts: ${JSON.stringify(batcher.counts)}`)
				ns.tprint(`${ns.nFormat(batcher.totalProfit, '$0,000.0a')} in ${ns.nFormat(seconds, '0,000')}s or ${ns.nFormat(perHour, '$0,000.0a')}/h (${ns.nFormat(maxPerHour, '$0,000.0a')}/h max)`)
			}
		}
	}
	const reportResults = createResultReporter()

	const updateCalculations = () => {
		let hackTime = ns.getHackTime(batcher.target)
		if (hackTime < batcher.calculations.hTime) {
			// we need to notify weakens of the new time, and may need to recalculate
			let update = {
				time: new Date().valueOf(),
				timeString: new Date(new Date().valueOf()).toLocaleTimeString(),
				oldLevel: batcher.player.skills.hacking,
				newLevel: 0,
				oldPlayer: batcher.player,
				oldServer: batcher.server,
				oldCalculations: batcher.calculations,
			}
			batcher.hackTimeUpdates.push(update)
			batcher.player = ns.getPlayer()
			batcher.newLevel = batcher.player.skills.hacking
			batcher.server = ns.getServer(batcher.target)
			let calculations = calculateHGW(batcher.server, batcher.player, batcher.ram, batcher.cores, batcher.calculations.wt, 200, ns)
			if (calculations) {
				batcher.calculations = calculations
				batcher.hWeakenTime.clear()
				batcher.hWeakenTime.write(calculations.wTime)
			} else {
				ns.tprint("ERROR: Cannot update calculations!")
				ns.tprint('args: ' + JSON.stringify([batcher.server, batcher.player, batcher.ram, batcher.cores, batcher.calculations.wt, 200, ns]))
				ns.exit()
			}
		}
	}

	//----------------------------------------------------------------------------------------------------
	// main loop
	//----------------------------------------------------------------------------------------------------
	while (true) {
		// update information with messages from worker scripts
		processIncomingMessages()
		removeOldProcessing()
		updateCalculations()

		batcher.availableRam = batcher.hostMaxRam - ns.getServerUsedRam(host)

		// schedule weakens every delay until we receive our first continue message from one
		if ((batcher.nextWeak != 0) && (new Date().valueOf() >= batcher.nextWeak)) {
			let duration = ns.getWeakenTime(target)
			let id = new Date().valueOf()
			let eEnd = id + duration

			// we can use other servers for weak
			let useHost = batcher.findOtherServer(batcher.calculations.rW) || host
			if (batcher.createWorker(useHost, 'weak', batcher.calculations.wt, id, duration, eEnd)) {
				batcher.nextWeak += batcher.calculations.delay
				await ns.sleep(10)
				continue
			}
		}

		// schedule grows only when there are two weakens guaranteed before
		// it and two weakens guaranteed after it, and reserve ram for enough
		// hacks so that we have two grows per hack.  We can schedule 8 times
		// as many grows since we use two grow per hack and since hacks only
		// take 1/4 the time
		let missingHack = Math.max(batcher.possibleHacks - batcher.counts.hack, 0)
		let missingHackRam = missingHack * batcher.calculations.rH
		let missingWeak = Math.max(batcher.expectedWeak - batcher.counts.weak, 0)
		let missingWeakRam = missingWeak * batcher.calculations.rW
		let missingRam = missingHackRam + missingWeakRam + batcher.calculations.rH

		// if we have ram for this grow, and we have enough reserved for hacks for existing grows
		// plus this one, and we haven't created a grow in the last 20ms, check if it will fit
		if (batcher.availableRam > missingRam + batcher.calculations.rG && (new Date().valueOf() - batcher.lastGrowCreatedAt) >= 20) {
			let duration = ns.getGrowTime(target)
			let id = new Date().valueOf()
			let eEnd = id + duration

			let index = batcher.findProcessing({ eEnd, id })
			let nextWorker = batcher.processing[index]
			if (nextWorker && nextWorker.eEnd < eEnd + 200 && nextWorker.command === 'weak' && nextWorker.eEnd >= eEnd + 20) {
				if (batcher.createWorker(host, 'grow', batcher.calculations.gt, id, duration, eEnd)) {
					batcher.lastGrowCreatedAt = id
					await ns.sleep(10)
					continue
				}
			}
		}

		if (batcher.availableRam >= batcher.calculations.rH) {
			let duration = ns.getHackTime(target)
			let id = new Date().valueOf()
			let eEnd = id + duration

			let index = batcher.findProcessing({ eEnd, id })
			let found = batcher.processing[index]
			if (found && found.command === 'grow' && found.eEnd - eEnd <= 150 && found.eEnd > eEnd + 20 && (new Date().valueOf() - batcher.lastHackCreatedAt) >= 20) {
				if (batcher.createWorker(host, 'hack', batcher.calculations.ht, id, duration, eEnd)) {
					batcher.firstHack = false
					batcher.lastHackCreatedAt = id
					await ns.sleep(10)
					continue
				}
			}
		}

		// didn't start anything, delay 10ms and report if it's been 10s
		reportResults({ availableRam: batcher.availableRam, hostMaxRam: batcher.hostMaxRam, expectedWeak: batcher.expectedWeak, possibleHacks: batcher.possibleHacks })
		await ns.sleep(10)
	}
}

/**
 * @typedef Worker
 * @type {object}
 * @property {number} id - ID - Time when exec() was called - set by worker script from argument
 * @property {string} command - one of 'weak', 'grow', 'hack' - set by worker script
 * @property {number} start - Actual time when last command was started - set by worker script
 * @property {number} time - Estimaged duration - set by worker script
 * @property {number} eEnd - Estimated end time of finish - set by worker script
 * @property {number} end - Actual time when command ends - set by worker script
 * @property {number} result - Actual result of call - set by worker script
 * @property {number} execStart - Expected start time at the point exec() is called
 * @property {number} execEnd - Expected end time at the point exec() is called
 * @property {number} execTime - Expected duration at the point exec() is called
 */

/**
 * @typedef Counts
 * @type {object}
 * @property {number} weak - how many weak are currently executing
 * @property {number} grow - how many grow are currently executing
 * @property {number} hack - how many hack are currently executing
 */


function analyzeServer(ns, ram, hostname, cores = 1) {
	let player = ns.getPlayer()
	try {
		let server = ns.getServer(hostname)
		let values = calculateHGW(server, player, ram, cores, 0, 200, ns)
		//ns.tprint("analyzeServer() values: " + JSON.stringify(values))
		if (values) {
			return values
		}
		return { hostname } // ERROR
	} catch (err) {
		ns.tprint(`ERROR!  ${err} with ${hostname}`)
		return { hostname }
	}
}

function analyzeAllServers(ns, ram, cores) {
	const player = ns.getPlayer()
	const servers = {}
	const scanServer = (hostname) => {
		const server = ns.getServer(hostname)
		servers[hostname] = server
		server.connections = ns.scan(hostname)
		server.connections.forEach(name => {
			if (!servers[name]) scanServer(name)
		})
	}
	scanServer('home')
	/** @type {Server[]} */
	let list = Object.values(servers)
	list = list.filter(x => !x.purchasedByPlayer && x.hostname !== 'home' && x.moneyMax > 0 && x.requiredHackingSkill < player.skills.hacking && x.hasAdminRights)
	// list = list.slice(0, 2)
	ns.tprint(`INFO: Calculating for ${list.length} servers`)
	let results = list.map(x => analyzeServer(ns, ram, x.hostname, cores)).filter(x => x)
	ns.tprint(`INFO: Have ${results.length} results`)
	return results
}

function report(ns, list, useLog = false) {
	let sorted = [...list]
	sorted.sort((a, b) => (b.profit || 0) - (a.profit || 0))

	let results = sorted.filter(x => x.profit).map(x => {
		try {

			return {
				hostname: x.hostname,
				profit: x.profit ? ns.nFormat(x.profit, '$0,000.00a') : 'ERR',
				'wTime': x.wTime ? ns.nFormat(x.wTime / 1000, '0') + 's' : 'ERR',
				'ram': x.ramUsed ? ns.nFormat(x.ramUsed, '0,000') : 'ERR',
				'max$': x.maxm ? ns.nFormat(x.maxm, '$0.0a') : 'ERR',
				'hack$': x.hm ? ns.nFormat(x.hm, '$0.0a') : 'ERR',
				'grow$': x.gm ? ns.nFormat(x.gm, '$0.0a') : 'ERR',
				'delay': x.delay ? ns.nFormat(x.delay, '0') : 'ERR',
				'active': x.activeHacks ? ns.nFormat(x.activeHacks, '0') : 'ERR',
				'chance': x.hc ? ns.nFormat(x.hc, '0.0%') : 'ERR',
			}
		} catch (err) {
			ns.tprint("FORMAT ERROR: " + err)
			return null
		}
	})
	results = results.filter(x => x) // throw away errors

	if (results.length <= 0) {
		ns.tprint('ERROR!  Cannot find any servers with valid results')
		return
	}

	let table = createTable(results, {
		align: { hostname: 'left' }
	})

	if (useLog) {
		ns.print(`Using:\n` + table.join('\n') + '\n')
	} else {
		ns.tprint(`results:\n` + table.join('\n'))
	}
}

function reportDetails(ns, list, useLog = false) {
	let sorted = [...list]
	sorted.sort((a, b) => (b.profit || 0) - (a.profit || 0))

	let results = sorted.filter(x => x.profit).map(x => {
		try {

			return {
				hostname: x.hostname,
				'max$': x.maxm ? ns.nFormat(x.maxm, '$0.0a') : 'ERR',
				profit: x.profit ? ns.nFormat(x.profit, '$0,000.00a') : 'ERR',
				'hTime': x.hTime ? ns.nFormat(x.hTime / 1000, '0') + 's' : 'ERR',
				'gTime': x.gTime ? ns.nFormat(x.gTime / 1000, '0') + 's' : 'ERR',
				'wTime': x.wTime ? ns.nFormat(x.wTime / 1000, '0') + 's' : 'ERR',
				'delay': x.delay ? ns.nFormat(x.delay, '0') : 'ERR',
				'active': x.activeHacks ? ns.nFormat(x.activeHacks, '0') : 'ERR',
				'ht': x.ht ? ns.nFormat(x.ht, '0,000') : 'ERR',
				'gt': x.gt ? ns.nFormat(x.gt, '0,000') : 'ERR',
				'wt': x.wt ? ns.nFormat(x.wt, '0,000') : 'ERR',
				'ram': x.ramUsed ? ns.nFormat(x.ramUsed, '0,000') : 'ERR',
				'hack$': x.hm ? ns.nFormat(x.hm, '$0.0a') : 'ERR',
				'grow$': x.gm ? ns.nFormat(x.gm, '$0.0a') : 'ERR',
				'chance': x.hc ? ns.nFormat(x.hc, '0.0%') : 'ERR',
			}
		} catch (err) {
			ns.tprint("FORMAT ERROR: " + err)
			return null
		}
	})
	results = results.filter(x => x) // throw away errors

	if (results.length <= 0) {
		ns.tprint('ERROR!  Cannot find any servers with valid results')
		return
	}

	let table = createTable(results, {
		align: { hostname: 'left' }
	})

	if (useLog) {
		ns.print(`Using:\n` + table.join('\n') + '\n')
	} else {
		ns.tprint(`results:\n` + table.join('\n'))
	}
}

/**
 * Calculate optimal 'batch' parameters for a server and player given 
 * given an amount of ram and number of cores (default 1) with a delay
 * of at least 200ms, which I think will always be the one with the
 * lowest delay where we maximize the threads that will fit within a certain
 * weaken number.
 * 
 * @param {Server} server
 * @param {Player} player
 * @param {number} ram - gb available
 * @param {number} cores - cores (default 1)
 * @param {number} wt - weaken threads, if not passed will find based on delay > 200ms
 * @param {number} minDelay - look for configurations with at least this delay, default 200ms
 */
function calculateHGW(server, player, ram, cores = 1, wt = 0, minDelay = 200, ns) {
	// percent hacking with one thread
	let prepped = { ...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax }
	let hacked = { ...prepped }
	let wtMin = wt ? wt : 1
	let wtMax = wt ? wt : 100
	for (let wt = wtMin; wt <= wtMax; wt++) {
		let hackPercent = hacking.hackPercent(prepped, player)
		let growPercentFn = (ht) => {
			hacked.hackDifficulty = hacked.minDifficulty + ht * 0.002
			hacked.moneyAvailable = hacked.moneyMax - (ht * hackPercent)
			return hacking.growPercent(hacked, 1, player, cores)
		}

		let { hackThreads, growThreads } = solveForWeakens(wt, hackPercent, growPercentFn)
		// ns.tprint(JSON.stringify({wt, hackThreads, growThreads}))
		let ht = hackThreads
		let gt = growThreads

		if (wt && hackThreads && growThreads) {
			let hp = hackThreads * hackPercent
			let hm = hp * prepped.moneyMax
			hacked.moneyAvailable = hacked.moneyMax - hm
			hacked.hackDifficulty = hacked.minDifficulty + hackThreads * 0.002
			let gp = hacking.growPercent(hacked, growThreads, player, cores) - 1
			let gm = hacked.moneyAvailable * gp
			let rH = hackThreads * 1.7
			let rG = growThreads * 1.75
			let rW = wt * 1.75
			let ramUsed = rH + rG * 16 / 5 + rW * 4
			let activeHacks = Math.trunc(ram / ramUsed)
			let hTime = hacking.hackTime(prepped, player)
			let gTime = hacking.growTime(prepped, player)
			let wTime = hacking.weakenTime(prepped, player)
			let delay = hTime / activeHacks
			if (delay > minDelay) {
				let hc = hacking.hackChance(prepped, player)
				let profit = Math.trunc(3600000 / delay) * hm * hc
				let hExp = hacking.hackExp(prepped, player)
				let tExp = hExp * hc + hExp * (1 - hc) * ht + gt * hExp + wt * hExp

				return {
					ht, gt, wt, hp, gp, hm, gm, rH, rG, rW, ramUsed, activeHacks,
					hTime, gTime, wTime, delay,
					hc, profit, hExp, tExp,
					maxm: server.moneyMax,
					hostname: server.hostname,
				}
			}
		}
	}
	return null;
}

/**
 * @param {number} growPercent - Grow multiplier for 1 thread (i.e. 1.0025)
 * @param {number} money - Current money
 * @param {number} moneyMax - Desired money after grows
 */
function solveGrow(growPercent, money, moneyMax) {
	if (money >= moneyMax) { return 0; } // invalid
	const needFactor = 1 + (moneyMax - money) / money
	const needThreads = Math.log(needFactor) / Math.log(growPercent)
	return Math.ceil(needThreads)
}

/**
 * @param {number} weakenThreads - The number of weaken threads to optimize for
 * @param {number} hackPercent - The percent hacked with one thread, adjust with fudge factor for hackChance if desired
 * @param {function} growPercentFn - function taking hack threads and returning grow percent (i.e. 1.0025) for 1 grow thread
 * @return {Object} Object with hackThreads and growThreads properties
 */
function solveForWeakens(weakenThreads, hackPercent, growPercentFn) {
	let minH = 1, maxH = weakenThreads * 24
	let validH = 0, validG = 0
	//ns.tprint(`Solving for weakens ${weakenThreads}, ${hackPercent}, ${growPercentFn}`)

	while (minH <= maxH) {
		let midH = (minH + maxH) >> 1
		let growPercent = growPercentFn(midH)
		let G = solveGrow(growPercent, 1e9 * (1 - (midH * hackPercent)), 1e9)
		// ns.tprint(`${minH}-${midH}-${maxH}: ` + JSON.stringify({ G, growPercent }))
		if (G * 0.004 + midH * 0.002 > weakenThreads * 0.050) { maxH = midH - 1; continue }
		validH = midH
		validG = G
		minH = midH + 1
	}

	return { hackThreads: validH, growThreads: validG }
}

const getScriptName = (command) => {
	return `/remote/${command}-hgw.js`
}

const getScript = (command) => {
	if (command === 'hack') {
		return `/** @param {NS} ns */
      export async function main(ns) {
        let [target, id, command, port, time] = ns.args
        port = port || 5
        const handle = ns.getPortHandle(port)
        const handle2 = ns.getPortHandle(port + 1)
        const obj = eval("window.obj = window.obj || {}")
        obj.errors = obj.errors || []
      
        let start = new Date().valueOf()
        // let time = ns.getHackTime(target)
        let eEnd = start + time
      
        let msg = JSON.stringify({ id, message: 'start', command: 'hack', start, time, eEnd })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      
        let result = await ns.hack(target)
      
        let end = new Date().valueOf()
        msg = JSON.stringify({ id, message: 'end', command: 'hack', end, result })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      }
      `
	}
	if (command === 'grow') {
		return `/** @param {NS} ns */
      export async function main(ns) {
        let [target, id, command, port, time] = ns.args
        port = port || 5
        const handle = ns.getPortHandle(port)
        const handle2 = ns.getPortHandle(port + 1)
        const obj = eval("window.obj = window.obj || {}")
        obj.errors = obj.errors || []
      
        let start = new Date().valueOf()
        let eEnd = start + time
      
        let msg = JSON.stringify({ id, message: 'start', command: 'grow', start, time, eEnd })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      
        let result = await ns.grow(target)
      
        let end = new Date().valueOf()
        msg = JSON.stringify({ id, message: 'end', command: 'grow', end, result })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      }
      `
	}
	if (command === 'weak') {
		return `/** @param {NS} ns */
      export async function main(ns) {
        let [target, id, command, port, time] = ns.args
        port = port || 5
        const handle = ns.getPortHandle(port)
        const handle2 = ns.getPortHandle(port + 1)
        const handle3 = ns.getPortHandle(port + 2)
        const obj = eval("window.obj = window.obj || {}")
        obj.errors = obj.errors || []
      
        // weakens are different, they run continuously so we loop
        let count = 0
        let start = new Date().valueOf()
        let eEnd = start + time
        let end = null
        let result = null
        let msg = JSON.stringify({ id, message: 'start', command: 'weak', start, time, eEnd })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      
        while (true) {
          result = await ns.weaken(target)
      
          if (!handle3.empty()) time = handle3.peek()
          end = new Date().valueOf()
          start = end
          time = ns.getWeakenTime(target)
          eEnd = start + time
          count++
          msg = JSON.stringify({ id, message: 'continue', command: 'weak', start, time, eEnd, end, result, count })
          if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
        }
      }`
	}

	throw new Error(`getScript('${command}') - unknown command!`)
}