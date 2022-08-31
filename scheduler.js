// We define constants to index the times and delays in metrics
const H = 0;
const W1 = 1;
const G = 2;
const W2 = 3;

// Port used by the worker scripts to report their death to this script
const PORT = 1;

// Amount of time between jobs. The same spacer is used between batches as well.
const SPACER = 30;

let g_currentId= 0;

export async function main(ns) {
	ns.disableLog('ALL');
	ns.tail();

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
	let metrics = {
		// This is how long we expect each job to last. For the purpose of this test the fake job script we call simply sleeps for that amount of time
		// to simulate each type of job
		"times": [524, 2094, 1675, 2094],
		// This is how long we need to wait from batch start to kick each job
		"delays": [1540, 0, 449, 60]
	};

	// Simply an array to track batches. We currently never purge this array so don't leave it running too long or it will pile up
	// and it might skew the results/behavior
	let batches = [];

	// Empty whatever is still lingering on the port, whatever is there is stale and we have no use for it
	ClearPort(ns, PORT);

	while (true) {
		// Look for 'Batch' tasks and add some if we're under the target. We're using a target of 1 for this test.
		while (clock.tasks.filter(t => t.desc.startsWith('Batch')).length < 2) {
			// Adds the new task in the scheduler
			clock.AddTask(g_currentId++, `Batch ${id}`, nextBatch, SPACER - 10, () => StartBatch(ns, id, metrics, PORT, clock), []);

			// The next batch time is based on the previous batch, not the current time
			nextBatch += windowLen;

			// Correct any significant offset we might have
			while (nextBatch < performance.now()) {
				nextBatch += windowLen;
				ns.print('WARN: Skipping ahead, we are lagging behind!');
			}

			// Add a placeholder object in our batches array to keep track of job ends (see how it's used in WorkerDeathReports())
			batches.push({ id: id, replies: '', replyCount: 0 });

			// Increase the batch id for the next batch
			id++;
		}

		// This simply processes the task queue and runs what needs to be run
		clock.Process();

		// Removes any task that's aborted or started
		clock.PurgeTasks();

		// Checks the port for worker reports. We compile those and report when a batch finishes (either in correct or bad order)
		// Note that any batch that's been partially spawned because of cancelled job will never finish and linger in there forever
		// in the current implementation
		WorkerDeathReports(ns, PORT, batches);

		// Yield CPU to other scripts
		await ns.asleep(0);
	}
}

// WIP
class Batch {
	constructor() {
		this.scheduledTime= 0;
		this.execTime= 0;
		this.workerStartTime= [0,0,0,0];
		this.workerEndTime= [0,0,0,0];
		this.reportedTime [0,0,0,0];
		this.started= false;
		this.aborted= false;
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
			ns.print("WARN: Dismissing report of an unknown batch " + data.id);
			continue;
		}

		batch.replyCount++;
		batch.replies = batch.replies + data.type;
		if (batch.replyCount == 4) {
			if (batch.replies == 'H W1G W2') {
				ns.print('SUCCESS: Batch ' + data.id + ' finished in correct order');
			}
			else {
				ns.print('FAIL: Batch ' + data.id + ' finished out of order ' + batch.replies);
			}
		}
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
					this.ns.print(`WARN: Task ${task.desc} cancelled... drift=${Math.ceil(drift)}`);
				else
					this.ns.print(`FAIL: Task ${task.desc} cancelled... drift=${Math.ceil(drift)}`);

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
		id,  		// Task id
		desc,  		// Task description, not important
		time, 		// Time at which we want to start the task (relative to performance.now())
		tolerance, 	// How much further than 'time' we allow the task to be started. If we get to it beyond this time, it will be cancelled.
		func, 		// Lambda function to execute (ie: the proverbial task)
		args		// Arguments to be passed to the function (pass an empty array if none are needed)
	) {
		let task = {
			id: id,
			desc: desc,
			time: time,
			tolerance: tolerance,
			func: func,
			args: args,
			aborted: false,
			started: null
		};
		this.tasks.push(task);
	}

	// Removes tasks that are started or aborted to keep the queue mean and lean
	PurgeTasks() {
		this.tasks = this.tasks.filter(t => t.started == null && t.aborted == false);
	}
}

// Test function to start a mock batch. It simply adds them as tasks in the ClockSync instance.
function StartBatch(ns, id, metrics, port, clock) {
	let now = performance.now();
	clock.AddTask(g_currentId++, `${id}.H`, now + metrics.delays[H], SPACER - 10, () => StartJob(ns, 'H ', id, metrics.times[H], port), []);
	clock.AddTask(g_currentId++, `${id}.W1`, now + metrics.delays[W1], SPACER - 10, () => StartJob(ns, 'W1', id, metrics.times[W1], port), []);
	clock.AddTask(g_currentId++, `${id}.G`, now + metrics.delays[G], SPACER - 10, () => StartJob(ns, 'G ', id, metrics.times[G], port), []);
	clock.AddTask(g_currentId++, `${id}.W2`, now + metrics.delays[W2], SPACER - 10, () => StartJob(ns, 'W2', id, metrics.times[W2], port), []);
}

// Test function to start a mock job. The script emulates H/W/G without actually doing anything to the server
// Desyncs are inconsequential, since they do not affect any servers. The script just sleeps for the duration to simulate
// a hack, grow or weaken call
function StartJob(ns, type, id, duration, port) {
	ns.exec('fakejob.js', 'home', 1, id, type, duration, port);
}