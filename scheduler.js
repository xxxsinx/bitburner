import { Prep, IsPrepped } from "prep.js";
import { BATCH_SPACER, MaxHackForServer, GetBestMetricsForServer, HGW_MODE } from "metrics.js";
import { RunScript, MemoryMap } from "ram.js";
import { HasFormulas, ServerReport, WaitPids } from "utils.js";

// We define constants to index the times and delays in metrics
const H = 0;
const W1 = 1;
const G = 2;
const W2 = 3;

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

// Amount of time between jobs. The same spacer is used between batches as well.
const SPACER = 25;

export async function main(ns) {
	ns.disableLog('ALL');

	let [target] = ns.args;
	if (target == null) {
		ns.tprint('FAIL: Scheduler called without a target! Example usage: run scheduler n00dles');
		return;
	}

	ns.tail();

	// Port used by the worker scripts to report their death to this script
	const PORT = 1;

	// We declare a clock object
	const clock = new ClockSync(ns);

	// This is the fixed window length for a batch paywindow (H-W-G-W, that's SPACER*3, plus another to space out the last W and the next batch's H)
	const windowLen = SPACER * 4;

	// We are scheduling batches to the clock. In order to do this, we simply increment this variable by windowLen each time we create a new
	// batch job. This means that we intend to start a batch every windowLength
	let nextBatch = performance.now();

	// id of the next batch we'll be spawning. This is simply incremented every time we create a new one
	let id = 0;

	// Semi-bogus metrics, those were precalculated using a script from my repo (n00dles at hack level 2706 with no augs, if you're curious)
	// Order is H, W1, G, W2
	// let metrics = {
	// 	// This is how long we expect each job to last. For the purpose of this test the fake job script we call simply sleeps for that amount of time
	// 	// to simulate each type of job
	// 	"times": [524, 2094, 1675, 2094],
	// 	// This is how long we need to wait from batch start to kick each job
	// 	"delays": [1540, 0, 449, 60],
	// 	// Delay between jobs
	// 	delay: SPACER,
	// 	// Tolerance
	// 	tolerance: SPACER / 1.5
	// };

	let metrics = await GetBestMetricsForServer(ns, target, 1, MaxHackForServer(ns, target), 1);
	metrics.delay = SPACER;
	metrics.tolerance = SPACER / 1.5;

	ServerReport(ns, target, metrics);

	// Simply an array to track batches. We currently never purge this array so don't leave it running too long or it will pile up
	// and it might skew the results/behavior
	let batches = [];

	// Empty whatever is still lingering on the port, whatever is there is stale and we have no use for it
	ClearPort(ns, PORT);

	while (true) {
		// Look for 'Batch' tasks and add some if we're under the target. We're using a target of 1 for this test.
		while (clock.tasks.filter(t => t.desc.startsWith('Batch')).length < 2) {
			if (!BatchFitsInMemoryBlocks(ns, metrics)) break;

			const batch = new Batch(ns, id++, metrics);
			batches.push(batch);
			batch.Schedule(clock, nextBatch, PORT);

			// The next batch time is based on the previous batch, not the current time
			nextBatch += windowLen;
		}

		// This simply processes the task queue and runs what needs to be run
		clock.Process();

		// Removes any task that's aborted or started
		clock.PurgeTasks();

		// Checks the port for worker reports. We compile those and report when a batch finishes (either in correct or bad order)
		// Note that any batch that's been partially spawned because of cancelled job will never finish and linger in there forever
		// in the current implementation
		WorkerDeathReports(ns, PORT, batches);

		for (let batch of batches) {
			batch.Validate();
		}
		batches = batches.filter(s => s.reports.length < 4 && !s.aborted);

		// Yield CPU to other scripts
		await ns.asleep(0);
	}
}

// WIP
class Batch {
	constructor(ns, id, metrics) {
		this.ns = ns;
		this.id = id;
		this.metrics = metrics;

		this.clock = undefined;
		this.port = undefined;

		this.scheduledTime = 0;	// Time when the batch is meant to start (performance.now() based)
		this.execTime = 0;		// Actual time when the batch was allowed to start ((performance.now() based))

		this.started = undefined;	// Indicates time when this batch was started
		this.aborted = false;		// Indicates whether or not this batch was completely or partially aborted

		this.reports = [];
		this.workerAborted = [false, false, false, false];	// Indicates whether or not each worker has been aborted
	}

	Schedule(clock, time, port) {
		this.clock = clock;
		this.port = port;
		this.scheduledTime = time;

		// Adds the new task in the scheduler
		this.clock.AddTask(`Batch ${this.id}`, this.scheduledTime, this.metrics.delay, () => this.Start(), []);
	}

	// Test function to start a mock batch. It simply adds them as tasks in the ClockSync instance.
	Start() {
		this.started = performance.now();
		this.clock.AddTask(`${this.id}.H`, this.started + this.metrics.delays[H], this.metrics.tolerance, () => this.StartJob('H', H, this.metrics.times[H]), []);
		this.clock.AddTask(`${this.id}.W1`, this.started + this.metrics.delays[W1], this.metrics.tolerance, () => this.StartJob('W1', W1, this.metrics.times[W1]), []);
		this.clock.AddTask(`${this.id}.G`, this.started + this.metrics.delays[G], this.metrics.tolerance, () => this.StartJob('G', G, this.metrics.times[G]), []);
		this.clock.AddTask(`${this.id}.W2`, this.started + this.metrics.delays[W2], this.metrics.tolerance, () => this.StartJob('W2', W2, this.metrics.times[W2]), []);
	}

	// Test function to start a mock job. The script emulates H/W/G without actually doing anything to the server
	// Desyncs are inconsequential, since they do not affect any servers. The script just sleeps for the duration to simulate
	// a hack, grow or weaken call
	StartJob(desc, type, duration) {
		let script = undefined;

		switch (type) {
			case H:
				script = 'hack-jit.js';
				break;
			case G:
				script = 'grow-jit.js';
				break;
			case W1:
				script = 'weaken-jit.js';
				break;
			case W2:
				script = 'weaken-jit.js';
				break;
		}

		let pids = RunScript(this.ns, script, this.metrics.threads[type], [this.id, this.metrics.server, desc, type, duration, this.port], type == W1 || type == W2, false);
		//this.ns.exec(script, 'home', 1, this.id, desc, type, duration, this.port);
	}

	LogReport(data) {
		data.reported = performance.now();
		this.reports.push(data);
		let drift = this.GetJobDrift(data.type);
		if (drift == undefined) this.ns.print(ANSI_COLORS.r, 'This should not happen?!');
		if (drift > this.delay - 2) {
			this.ns.print(ANSI_COLORS.y, 'Batch job ' + this.id + '.' + data.desc + ' finished late... drift=' + drift);
		}
	}

	GetJobDrift(jobId) {
		let report = this.reports.find(r => r.type == jobId);
		if (report == undefined) return 0;
		let ended = report.end;
		let expectedEnd = this.started + this.metrics.delays[jobId] + this.metrics.times[jobId];
		let drift = ended - expectedEnd;
		return drift;
	}

	Validate() {
		let now = performance.now();
		if (this.scheduledTime > now + this.delay) {
			this.ns.print(ANSI_COLORS.y, 'Batch ' + this.id + ' did not start on time');
		}

		if (this.started) {
			if ([H, W1, G, W2].some(s => this.GetJobDrift(s) > this.metrics.tolerance * 5)) {
				this.ns.print(ANSI_COLORS.y, 'Batch ' + this.id + ' has some jobs past tolerance');
				// if ([H, W1, G, W2].some(s => this.GetJobDrift(s) > this.metrics.tolerance * 15)) {
				// 	this.ns.print(ANSI_COLORS.y, 'Batch ' + this.id + ' has some jobs past tolerance');
				// }
			}
		}

		if (performance.now() > (this.started + this.metrics.times[W1] + 3 * SPACER) + SPACER * 5) {
			this.ns.print(ANSI_COLORS.r, 'Batch ' + this.id + ' gone on too long, cancelling');
			this.aborted = true;
		}

		if (this.reports.length != 4) return;

		let replyChain = [];
		for (const report of this.reports) {
			switch (report.type) {
				case H:
					replyChain.push('H');
					break;
				case W1:
					replyChain.push('W1');
					break;
				case G:
					replyChain.push('G');
					break;
				case W2:
					replyChain.push('W2');
					break;
			}
		}

		if (replyChain.toString() == 'H,W1,G,W2') {
			//this.ns.print('SUCCESS: Batch ' + this.id + ' finished in correct order');
		}
		else {
			this.ns.print(ANSI_COLORS.y, 'Batch ' + this.id + ' finished out of order ' + replyChain.toString());
		}
	}
}

// Simply clears the data on the specified port
function ClearPort(ns, port) {
	while (ns.peek(port) != 'NULL PORT DATA') {
		ns.readPort(port);
	}
}

// Looks for worker reports and reports batches that fully executed
// It's very basic, the point is to not spam the log, so we only report batches whose 4 jobs have ended
// and we are able to determine if they finished in the expected order or not
function WorkerDeathReports(ns, port, batches) {
	while (ns.peek(port) != 'NULL PORT DATA') {
		let raw = ns.readPort(port);
		let data = JSON.parse(raw);
		let batch = batches.find(b => b.id == data.id);
		if (batch == undefined) {
			ns.print(ANSI_COLORS.r, "Dismissing report of an unknown batch " + data.id);
			continue;
		}

		batch.LogReport(data);
		//batch.Validate();
	}
}

// The ClockSync class
// This class is used to create, execute and delete tasks to be executed at precise time, with a drift tolerance
// The drift can only be positive (ie: you want to start at X, it will only execute if current time is >= X)
// Each task has a tolerance parameter, we are using 20ms in this test. This means a task meant to run at X
// can be delayed up to X + 20ms, if the task is still in the queue at that time and not executed yet,
// it's cancelled.
class ClockSync {
	constructor(ns) {
		this.tasks = [];
		this.lastProc = performance.now();
		this.drift = 0;
		this.ns = ns;
		this.nextTid = 0;
	}

	Process() {
		// We use the time of entry in this function as the reference.
		const now = performance.now();

		// The drift is how much time elapsed since the last time we entered this function (excluding the current one obviously)
		this.drift = now - this.lastProc;

		// We filter out tasks that have already been started or that have been aborted, they're just logs/ghosts at this point
		// We also filter out tasks for which the start time hasn't been reached yet, we'll get to them next time this function
		// is called
		const tasks = this.tasks.filter(t => t.time <= now && !t.started && !t.aborted);
		for (const task of tasks) {
			// Started is when we processed the task. It could be aborted, it doesn't been it's been spawned/executed.
			task.started = now;

			// Different from this.drift, this one represents how many ms we are past the time we want to start this task
			let drift = now - task.time;

			// If we are past tolerance, task is aborted
			if (drift > task.tolerance) {
				// For debugging purposes, we use different colors for batches and jobs
				// TODO: This should be a task parameter so we can keep this function generic
				if (task.desc.startsWith('Batch'))
					this.ns.print(ANSI_COLORS.y, `Task ${task.desc} cancelled... drift=${Math.ceil(drift)}`);
				else
					this.ns.print(ANSI_COLORS.r, `Task ${task.desc} cancelled... drift=${Math.ceil(drift)}`);

				task.aborted = true;
				continue;
			}

			// Execute the scheduled task
			task.func(...task.args);
		}

		this.lastProc = now;
	}

	// Adds a task to the queue
	// 
	AddTask(
		desc,  		// Task description, not important
		time, 		// Time at which we want to start the task (relative to performance.now())
		tolerance, 	// How much further than 'time' we allow the task to be started. If we get to it beyond this time, it will be cancelled.
		func, 		// Lambda function to execute (ie: the proverbial task)
		args		// Arguments to be passed to the function (pass an empty array if none are needed)
	) {
		let task = {
			id: this.nextTid++,
			desc: desc,
			time: time,
			tolerance: tolerance,
			func: func,
			args: args,
			aborted: false,
			started: null
		};
		this.tasks.push(task);
		return task.id;
	}

	// Removes tasks that are started or aborted to keep the queue mean and lean
	PurgeTasks() {
		this.tasks = this.tasks.filter(t => t.started == null && t.aborted == false);
	}
}

export function BatchFitsInMemoryBlocks(ns, metrics) {
	const mem = new MemoryMap(ns);

	const HACK_RAM = ns.getScriptRam('hack-jit.js');
	const GROW_RAM = ns.getScriptRam('grow-jit.js');
	const WEAKEN_RAM = ns.getScriptRam('weaken-jit.js');

	// Failsafe, on veut pas trop taxer
	if (metrics.batchRam > mem.available * 0.9) {
		//ns.print('Batch won\'t fit in 90% of total ram (failsalfe)');
		return false;
	}

	if (mem.ReserveBlock(metrics.threads[H] * HACK_RAM) == undefined) {
		// ns.print('Could not find a block big enough for ' + metrics.threads[H] + ' hack threads');
		// ns.print('Required = ' + metrics.threads[H] * HACK_RAM + ' Biggest block = ' + mem.BiggestBlock());

		return false;
	}
	if (mem.ReserveBlock(metrics.threads[G] * GROW_RAM) == undefined) {
		//ns.print('Could not find a block big enough for ' + metrics.threads[G] + ' grow threads');
		return false;
	}
	for (let i = 0; i < (metrics.threads[W1] + metrics.threads[W2]) * WEAKEN_RAM; i++) {
		if (mem.ReserveBlock(WEAKEN_RAM) == undefined) {
			//ns.print('Could not find enough network RAM for ' + (metrics.threads[W1] + metrics.threads[W2]) + ' weaken threads');
			return false;
		}
	}
	return true;
}

// // Test function to start a mock batch. It simply adds them as tasks in the ClockSync instance.
// function StartBatch(ns, id, metrics, port, clock) {
// 	let now = performance.now();
// 	clock.AddTask(`${id}.H`, now + metrics.delays[H], SPACER - 10, () => StartJob(ns, 'H ', id, metrics.times[H], port), []);
// 	clock.AddTask(`${id}.W1`, now + metrics.delays[W1], SPACER - 10, () => StartJob(ns, 'W1', id, metrics.times[W1], port), []);
// 	clock.AddTask(`${id}.G`, now + metrics.delays[G], SPACER - 10, () => StartJob(ns, 'G ', id, metrics.times[G], port), []);
// 	clock.AddTask(`${id}.W2`, now + metrics.delays[W2], SPACER - 10, () => StartJob(ns, 'W2', id, metrics.times[W2], port), []);
// }

// // Test function to start a mock job. The script emulates H/W/G without actually doing anything to the server
// // Desyncs are inconsequential, since they do not affect any servers. The script just sleeps for the duration to simulate
// // a hack, grow or weaken call
// function StartJob(ns, type, id, duration, port) {
// 	ns.exec('fakejob.js', 'home', 1, id, type, duration, port);
// }