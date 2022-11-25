import { LogMessage } from 'utils.js'

export async function main(ns) {
	const [silent = false] = ns.args;

	if (ns.args[0] == 'test') {
		ns.tprint(factor3(5793264));
		return;
	}

	let prep = undefined;
	try {
		prep = JSON.parse(ns.read('contractPrep.txt'));
	}
	catch {
		ns.tprint('FAIL: Could not load contractPrep.txt, please run contactPrep.js before calling this script!');
		return;
	}

	let found = 0;
	for (const contract of prep) {
		//output.push({ server: server, file: contract, type: type, data: data });
		found++;
		let didSolve = false;

		// ns.tprint('INFO: server: ' + contract.server);
		// ns.tprint('INFO: file  : ' + contract.file);
		// ns.tprint('INFO: type  : ' + contract.type);
		// ns.tprint('INFO: data  : ' + contract.data);

		// if (ns.ls(contract.server, contract.file).length == 0) {
		// 	ns.tprint('FAIL: Could not find |' + contract.file + '| on |' + contract.server + '|');
		// 	continue;
		// }

		try { didSolve = await solve(contract.type, contract.data, contract.server, contract.file, ns); } catch { }
		if (didSolve) {
			ns.tprint(`INFO: Solved ` + contract.type + ' (' + didSolve + ')');
			LogMessage(ns, `INFO: Solved ` + contract.type + ' (' + didSolve + ')')
		}
		else {
			ns.tprint(`FAIL: ${contract.server} - ${contract.file} - ${contract.type} - ${didSolve || "FAILED!"}`);
			LogMessage(ns, `FAIL: ${contract.server} - ${contract.file} - ${contract.type} - ${didSolve || "FAILED!"}`)
		}

		await ns.sleep(10);
	}

	if (found > 0 && !silent)
		ns.tprint(`Found ${found} contracts`);
}

async function solve(type, data, server, contract, ns) {
	let solution = 'none';

	switch (type) {
		case "Algorithmic Stock Trader I":
			solution = maxProfit([1, data]);
			break;
		case "Algorithmic Stock Trader II":
			solution = maxProfit([Math.ceil(data.length / 2), data]);
			break;
		case "Algorithmic Stock Trader III":
			solution = maxProfit([2, data]);
			break;
		case "Algorithmic Stock Trader IV":
			solution = maxProfit(data);
			break;
		case "Minimum Path Sum in a Triangle":
			solution = solveTriangleSum(data, ns);
			break;
		case "Unique Paths in a Grid I":
			solution = uniquePathsI(data);
			break;
		case "Unique Paths in a Grid II":
			solution = uniquePathsII(data);
			break;
		case "Generate IP Addresses":
			solution = generateIps(data);
			break;
		case "Find Largest Prime Factor":
			solution = factor3(data);
			break;
		case "Spiralize Matrix":
			solution = spiral(data);
			break;
		case "Merge Overlapping Intervals":
			solution = mergeOverlap(data);
			break;
		case "Find All Valid Math Expressions":
			solution = solverWaysToExpress(ns, data);
			break;
		case "Subarray with Maximum Sum":
			solution = solverLargestSubset(ns, data);
			break;
		case "Sanitize Parentheses in Expression":
			solution = SanitizeParensSolver(data);
			break;
		case "Array Jumping Game":
			solution = solverArrayJumpingGame(data)
			break;
		case "Total Ways to Sum":
			solution = solverWaysToSum(data);
			break;
		case "Total Ways to Sum II":
			solution = solveWaysToSumII(data);
			break;
		case "HammingCodes: Integer to Encoded Binary":
			solution = HammingEncode(data);
			break;
		case "HammingCodes: Encoded Binary to Integer":
			solution = HammingDecode(data);
			break;
		case "Shortest Path in a Grid":
			solution = ShortestPathInAGrid(data);
			break;
		case "Array Jumping Game II":
			solution = solverArrayJumpingGameII(data);
			break;
		case "Compression II: LZ Decompression":
			solution = comprLZDecode(data);
			break;
		case "Proper 2-Coloring of a Graph":
			solution = coloringGraph(data);
			break;
		case "Compression III: LZ Compression":
			solution = comprLZEncode(data);
			break;
		case "Compression I: RLE Compression":
			solution = RLEencode(data);
			break;
		case "Encryption I: Caesar Cipher":
			solution = caesarCipher(data);
			break;
		case "Encryption II: Vigenère Cipher":
			solution = vignereCipher(data);
			break;
	}

	if (solution == 'none') {
		ns.tprint('ERROR: NO SOLVER FOR ' + contract + ' ' + solution);
		return '';
	}

	var ret = ns.codingcontract.attempt(solution, contract, server, { returnReward: true });
	if (ret == false) {
		ns.tprint('FAILED TO SOLVE: ' + contract + ' type: ' + type + ' data: ' + data + ' attempted solution: ' + solution);
	}

	return ret;
}

function vignereCipher(data) {
	const cipher = [...data[0]]
		.map((a, i) => {
			return a === " "
				? a
				: String.fromCharCode(((a.charCodeAt(0) - 2 * 65 + data[1].charCodeAt(i % data[1].length)) % 26) + 65);
		})
		.join("");
	return cipher;
}

function caesarCipher(data) {
	const cipher = [...data[0]]
		.map((a) => (a === " " ? a : String.fromCharCode(((a.charCodeAt(0) - 65 - data[1] + 26) % 26) + 65)))
		.join("");
	return cipher;
}

function solverArrayJumpingGameII(arrayData) {
	let n = arrayData.length;
	let reach = 0;
	let jumps = 0;
	let lastJump = -1;
	while (reach < n - 1) {
		let jumpedFrom = -1;
		for (let i = reach; i > lastJump; i--) {
			if (i + arrayData[i] > reach) {
				reach = i + arrayData[i];
				jumpedFrom = i;
			}
		}
		if (jumpedFrom === -1) {
			jumps = 0;
			break;
		}
		lastJump = jumpedFrom;
		jumps++;
	}
	return jumps
}

function ShortestPathInAGrid(data) {
	let H = data.length, W = data[0].length;
	let dist = Array.from(Array(H), () => Array(W).fill(Number.POSITIVE_INFINITY));
	dist[0][0] = 0;

	let queue = [[0, 0]];
	while (queue.length > 0) {
		let [i, j] = queue.shift();
		let d = dist[i][j];

		if (i > 0 && d + 1 < dist[i - 1][j] && data[i - 1][j] !== 1) { dist[i - 1][j] = d + 1; queue.push([i - 1, j]); }
		if (i < H - 1 && d + 1 < dist[i + 1][j] && data[i + 1][j] !== 1) { dist[i + 1][j] = d + 1; queue.push([i + 1, j]); }
		if (j > 0 && d + 1 < dist[i][j - 1] && data[i][j - 1] !== 1) { dist[i][j - 1] = d + 1; queue.push([i, j - 1]); }
		if (j < W - 1 && d + 1 < dist[i][j + 1] && data[i][j + 1] !== 1) { dist[i][j + 1] = d + 1; queue.push([i, j + 1]); }
	}

	let path = "";
	if (Number.isFinite(dist[H - 1][W - 1])) {
		let i = H - 1, j = W - 1;
		while (i !== 0 || j !== 0) {
			let d = dist[i][j];

			let new_i = 0, new_j = 0, dir = "";
			if (i > 0 && dist[i - 1][j] < d) { d = dist[i - 1][j]; new_i = i - 1; new_j = j; dir = "D"; }
			if (i < H - 1 && dist[i + 1][j] < d) { d = dist[i + 1][j]; new_i = i + 1; new_j = j; dir = "U"; }
			if (j > 0 && dist[i][j - 1] < d) { d = dist[i][j - 1]; new_i = i; new_j = j - 1; dir = "R"; }
			if (j < W - 1 && dist[i][j + 1] < d) { d = dist[i][j + 1]; new_i = i; new_j = j + 1; dir = "L"; }

			i = new_i; j = new_j;
			path = dir + path;
		}
	}

	return path;
}

/**
 *
 * @param {number[][]} input [targetNumber,[available numbers]]
 * @returns
 */
function solveWaysToSumII(input) {
	/**
	 *
	 * @param {number} target
	 * @param {number[]} nums
	 * @returns
	 */
	let n = input[0];
	let nums = input[1];
	let table = new Array(n + 1);
	for (let i = 0; i < n + 1; i++) {
		table[i] = 0;
	}
	table[0] = 1;

	for (let i of nums) {
		if (i > n) {
			continue;
		}
		for (let j = i; j <= n; j++) {
			table[j] += table[j - i];
		}
		console.log(table);
	}
	return table[n];
}

//ALGORITHMIC STOCK TRADER
function maxProfit(arrayData) {
	let i, j, k;

	let maxTrades = arrayData[0];
	let stockPrices = arrayData[1];

	let tempStr = "[0";
	for (i = 0; i < stockPrices.length; i++) {
		tempStr += ",0";
	}
	tempStr += "]";
	let tempArr = "[" + tempStr;
	for (i = 0; i < maxTrades - 1; i++) {
		tempArr += "," + tempStr;
	}
	tempArr += "]";

	let highestProfit = JSON.parse(tempArr);

	for (i = 0; i < maxTrades; i++) {
		for (j = 0; j < stockPrices.length; j++) { // Buy / Start
			for (k = j; k < stockPrices.length; k++) { // Sell / End
				if (i > 0 && j > 0 && k > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
				} else if (i > 0 && j > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
				} else if (i > 0 && k > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
				} else if (j > 0 && k > 0) {
					highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
				} else {
					highestProfit[i][k] = Math.max(highestProfit[i][k], stockPrices[k] - stockPrices[j]);
				}
			}
		}
	}
	return highestProfit[maxTrades - 1][stockPrices.length - 1];
}

//SMALLEST TRIANGLE SUM
function solveTriangleSum(arrayData, ns) {
	let triangle = arrayData;
	let nextArray;
	let previousArray = triangle[0];

	for (let i = 1; i < triangle.length; i++) {
		nextArray = [];
		for (let j = 0; j < triangle[i].length; j++) {
			if (j == 0) {
				nextArray.push(previousArray[j] + triangle[i][j]);
			} else if (j == triangle[i].length - 1) {
				nextArray.push(previousArray[j - 1] + triangle[i][j]);
			} else {
				nextArray.push(Math.min(previousArray[j], previousArray[j - 1]) + triangle[i][j]);
			}

		}

		previousArray = nextArray;
	}

	return Math.min.apply(null, nextArray);
}

//UNIQUE PATHS IN A GRID
function uniquePathsI(grid) {
	const rightMoves = grid[0] - 1;
	const downMoves = grid[1] - 1;

	return Math.round(factorialDivision(rightMoves + downMoves, rightMoves) / (factorial(downMoves)));
}

function factorial(n) {
	return factorialDivision(n, 1);
}

function factorialDivision(n, d) {
	if (n == 0 || n == 1 || n == d)
		return 1;
	return factorialDivision(n - 1, d) * n;
}

function uniquePathsII(grid, ignoreFirst = false, ignoreLast = false) {
	const rightMoves = grid[0].length - 1;
	const downMoves = grid.length - 1;

	let totalPossiblePaths = Math.round(factorialDivision(rightMoves + downMoves, rightMoves) / (factorial(downMoves)));

	for (let i = 0; i < grid.length; i++) {
		for (let j = 0; j < grid[i].length; j++) {

			if (grid[i][j] == 1 && (!ignoreFirst || (i != 0 || j != 0)) && (!ignoreLast || (i != grid.length - 1 || j != grid[i].length - 1))) {
				const newArray = [];
				for (let k = i; k < grid.length; k++) {
					newArray.push(grid[k].slice(j, grid[i].length));
				}

				let removedPaths = uniquePathsII(newArray, true, ignoreLast);
				removedPaths *= uniquePathsI([i + 1, j + 1]);

				totalPossiblePaths -= removedPaths;
			}
		}

	}

	return totalPossiblePaths;
}

//GENERATE IP ADDRESSES
function generateIps(num) {
	num = num.toString();
	const length = num.length;
	const ips = [];
	for (let i = 1; i < length - 2; i++) {
		for (let j = i + 1; j < length - 1; j++) {
			for (let k = j + 1; k < length; k++) {
				const ip = [
					num.slice(0, i),
					num.slice(i, j),
					num.slice(j, k),
					num.slice(k, num.length)
				];
				let isValid = true;
				ip.forEach(seg => {
					isValid = isValid && isValidIpSegment(seg);
				});
				if (isValid) ips.push(ip.join("."));
			}
		}
	}
	return ips.toString();
}

function isValidIpSegment(segment) {
	if (segment[0] == "0" && segment != "0") return false;
	segment = Number(segment);
	if (segment < 0 || segment > 255) return false;
	return true;
}

//GREATEST FACTOR
function factor3(n) {
	// Returns all the prime factors of a positive integer
	let factors = new Array();
	let d = 2
	while (n > 1) {
		while (n % d == 0) {
			factors.push(d);
			n /= d;
		}
		d = d + 1
		if (d * d > n) {
			if (n > 1) factors.push(n);
			break
		}
	}

	if (factors.length > 0) return factors.pop();
	return '';
}

//SPIRALIZE Matrix
function spiral(arr, accum = []) {
	if (arr.length === 0 || arr[0].length === 0) {
		return accum;
	}
	accum = accum.concat(arr.shift());
	if (arr.length === 0 || arr[0].length === 0) {
		return accum;
	}
	accum = accum.concat(column(arr, arr[0].length - 1));
	if (arr.length === 0 || arr[0].length === 0) {
		return accum;
	}
	accum = accum.concat(arr.pop().reverse());
	if (arr.length === 0 || arr[0].length === 0) {
		return accum;
	}
	accum = accum.concat(column(arr, 0).reverse());
	if (arr.length === 0 || arr[0].length === 0) {
		return accum;
	}
	return spiral(arr, accum);
}

function column(arr, index) {
	const res = [];
	for (let i = 0; i < arr.length; i++) {
		const elm = arr[i].splice(index, 1)[0];
		if (elm) {
			res.push(elm);
		}
	}
	return res;
}

// Merge Overlapping Intervals
function mergeOverlap(intervals) {
	intervals.sort(([minA], [minB]) => minA - minB);
	for (let i = 0; i < intervals.length; i++) {
		for (let j = i + 1; j < intervals.length; j++) {
			const [min, max] = intervals[i];
			const [laterMin, laterMax] = intervals[j];
			if (laterMin <= max) {
				const newMax = laterMax > max ? laterMax : max;
				const newInterval = [min, newMax];
				intervals[i] = newInterval;
				intervals.splice(j, 1);
				j = i;
			}
		}
	}
	return intervals;
}

function SanitizeParensSolver(data) {
	var left = 0
	var right = 0
	var res = []
	for (var i = 0; i < data.length; ++i) {
		if (data[i] === '(') {
			++left
		} else if (data[i] === ')') {
			left > 0 ? --left : ++right
		}
	}

	function dfs(pair, index, left, right, s, solution, res) {
		if (s.length === index) {
			if (left === 0 && right === 0 && pair === 0) {
				for (var i = 0; i < res.length; i++) {
					if (res[i] === solution) {
						return
					}
				}
				res.push(solution)
			}
			return
		}
		if (s[index] === '(') {
			if (left > 0) {
				dfs(pair, index + 1, left - 1, right, s, solution, res)
			}
			dfs(pair + 1, index + 1, left, right, s, solution + s[index], res)
		} else if (s[index] === ')') {
			if (right > 0) dfs(pair, index + 1, left, right - 1, s, solution, res)
			if (pair > 0) dfs(pair - 1, index + 1, left, right, s, solution + s[index], res)
		} else {
			dfs(pair, index + 1, left, right, s, solution + s[index], res)
		}
	}

	dfs(0, 0, left, right, data, '', res)
	return res
}

function solverArrayJumpingGame(arrayData) {
	if (arrayData[0] == 0) return '0';
	let arrayJump = [1];

	for (let n = 0; n < arrayData.length; n++) {
		if (arrayJump[n]) {
			for (let p = n; p <= Math.min(n + arrayData[n], arrayData.length - 1); p++) { // fixed off-by-one error
				arrayJump[p] = 1;
			}
		}
	}

	return 0 + Boolean(arrayJump[arrayData.length - 1]); // thanks /u/Kalumniatoris
}

function solverWaysToSum(arrayData) {
	var ways = [];
	ways[0] = 1;

	for (var a = 1; a <= arrayData; a++) {
		ways[a] = 0;
	}

	for (var i = 1; i <= arrayData - 1; i++) {
		for (var j = i; j <= arrayData; j++) {
			ways[j] += ways[j - i];
		}
	}

	return ways[arrayData];
}

function solverWaysToExpress(ns, arrayData) {
	let i, j, k;

	let operatorList = ["", "+", "-", "*"];
	let validExpressions = [];

	let tempPermutations = Math.pow(4, (arrayData[0].length - 1));

	for (i = 0; i < tempPermutations; i++) {

		if (!Boolean(i % 100000)) {
			//ns.tprint(i + "/" + tempPermutations + ", " + validExpressions.length + " found.");
			//await ns.sleep(10);
		}

		let arraySummands = [];
		let candidateExpression = arrayData[0].substr(0, 1);
		arraySummands[0] = parseInt(arrayData[0].substr(0, 1));

		for (j = 1; j < arrayData[0].length; j++) {
			candidateExpression += operatorList[(i >> ((j - 1) * 2)) % 4] + arrayData[0].substr(j, 1);

			let rollingOperator = operatorList[(i >> ((j - 1) * 2)) % 4];
			let rollingOperand = parseInt(arrayData[0].substr(j, 1));

			switch (rollingOperator) {
				case "":
					rollingOperand = rollingOperand * (arraySummands[arraySummands.length - 1] / Math.abs(arraySummands[arraySummands.length - 1]));
					arraySummands[arraySummands.length - 1] = arraySummands[arraySummands.length - 1] * 10 + rollingOperand;
					break;
				case "+":
					arraySummands[arraySummands.length] = rollingOperand;
					break;
				case "-":
					arraySummands[arraySummands.length] = 0 - rollingOperand;
					break;
				case "*":
					while (j < arrayData[0].length - 1 && ((i >> (j * 2)) % 4) === 0) {
						j += 1;
						candidateExpression += arrayData[0].substr(j, 1);
						rollingOperand = rollingOperand * 10 + parseInt(arrayData[0].substr(j, 1));
					}
					arraySummands[arraySummands.length - 1] = arraySummands[arraySummands.length - 1] * rollingOperand;
					break;
			}
		}

		let rollingTotal = arraySummands.reduce(function (a, b) { return a + b; });

		if (arrayData[1] === rollingTotal) {
			validExpressions[validExpressions.length] = candidateExpression;
		}
	}

	return JSON.stringify(validExpressions);
}

function solverLargestSubset(ns, arrayData) {
	let highestSubset = arrayData[0];

	for (let i = 0; i < arrayData.length; i++) {

		for (let j = i; j < arrayData.length; j++) {
			let tempSubset = 0;
			for (let k = i; k <= j; k++) {
				tempSubset += arrayData[k];
			}

			if (highestSubset < tempSubset) {
				highestSubset = tempSubset;
			}
		}
	}

	return highestSubset;
}

export function HammingSumOfParity(_lengthOfDBits) { // will calculate the needed amount of parityBits 'without' the "overall"-Parity
	return (_lengthOfDBits < 3 || _lengthOfDBits == 0)
		? ((_lengthOfDBits == 0) ? 0 : _lengthOfDBits + 1)
		// the Math.log2-math will only work, if the length is greater egqual 3 otherwise it's "kinda broken" :D
		: ((Math.ceil(Math.log2(_lengthOfDBits * 2))) <= Math.ceil(Math.log2(1 + _lengthOfDBits + Math.ceil(Math.log2(_lengthOfDBits)))))
			? Math.ceil(Math.log2(_lengthOfDBits) + 1)
			: Math.ceil(Math.log2(_lengthOfDBits))
}

export function HammingEncode(value) {
	let _dataBits = value.toString(2); // change value into string of binary bits
	let _sum_parity = HammingSumOfParity(_dataBits.length); // get the sum of needed parity bits
	let _data = _dataBits.split(""); // create new array with the given data bits
	let _build = []; // init new array for building
	let count = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0);
	// count specified data in the array, for later use

	_build.push("x", "x", ..._data.splice(0, 1)); // pre-build the "pre-build"

	for (let i = 2; i < _sum_parity; i++) { // add new paritybits and the corresponding data bits
		_build.push("x", ..._data.splice(0, Math.pow(2, i) - 1))
	}
	// "pre"-build my array, now the "calculation"... get the paritybits working
	for (let index of _build.reduce(function (a, e, i) { if (e == "x") a.push(i); return a; }, [])) {
		let _tempcount = index + 1; // set the "stepsize"
		let _temparray = []; // temporary array to store the corresponding bits
		let _tempdata = [..._build]; // copy the "build"
		while (_tempdata[index] !== undefined) { // as long as there are bits, do "cut"
			let _temp = _tempdata.splice(index, _tempcount * 2); // get x*2 bits, then
			_temparray.push(..._temp.splice(0, _tempcount)); // .. cut them and keep first half
		}
		_temparray.splice(0, 1); // remove first bit, which is the parity one
		_build[index] = ((count(_temparray, "1")) % 2.).toString() // simple count and remainder of 2 with "toString" to store it
	}
	_build.unshift(((count(_build, "1")) % 2.).toString()) // adding first index, which is done as last element
	return _build.join("") // return a string again
}

export function HammingDecode(_data) {
	let _build = _data.split(""); // ye, an array again
	let _testArray = [];  //for the "tests". if any is false, it is been altered data, will check and fix it later
	let _sum_parity = Math.ceil(Math.log2(_data.length)); // excluding first bit
	let count = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0); // count.... again ;)
	let _overallParity = _build.splice(0, 1).join(""); // remove first index, for checking and to use the _build properly later
	_testArray.push((_overallParity == (count(_build, "1") % 2).toString()) ? true : false); // checking the "overall" parity
	for (var i = 0; i < _sum_parity; i++) {
		let _tempIndex = Math.pow(2, i) - 1 // get the parityBits Index
		let _tempStep = _tempIndex + 1 // set the stepsize
		let _tempData = [..._build] // "copy" the build-data
		let _tempArray = [] // init empty array for "testing"
		while (_tempData[_tempIndex] != undefined) { // extract from the copied data until the "starting" index is undefined
			var _temp = [..._tempData.splice(_tempIndex, _tempStep * 2)] // extract 2*stepsize
			_tempArray.push(..._temp.splice(0, _tempStep))  // and cut again for keeping first half
		}
		let _tempParity = _tempArray.shift() // and cut the first index for checking with the rest of the data
		_testArray.push(((_tempParity == (count(_tempArray, "1") % 2).toString())) ? true : false) // is the _tempParity the calculated data?
	}
	let _fixIndex = 0; // init the "fixing" index amd start with -1, bc we already removed the first bit
	for (let i = 1; i < _sum_parity + 1; i++) {
		_fixIndex += (_testArray[i]) ? 0 : (Math.pow(2, i) / 2)
	}
	_build.unshift(_overallParity)
	// fix the actual hammingcode if there is an error
	if (_fixIndex > 0 && _testArray[0] == false) {  // if the overall is false and the sum of calculated values is greater equal 0, fix the corresponding hamming-bit
		_build[_fixIndex] = (_build[_fixIndex] == "0") ? "1" : "0"
	}
	else if (_testArray[0] == false) { // otherwise, if the the overall_parity is only wrong, fix that one
		_overallParity = (_overallParity == "0") ? "1" : "0"
	}
	else if (_testArray[0] == true && _testArray.some((truth) => truth == false)) {
		return 0 // uhm, there's some strange going on... 2 bits are altered? How?
	}
	// oof.. halfway through... we fixed the altered bit, now "extract" the parity from the build and parse the binary data
	for (var i = _sum_parity; i >= 0; i--) { // start from the last parity down the starting one
		_build.splice(Math.pow(2, i), 1)
	}
	_build.splice(0, 1)
	return parseInt(_build.join(""), 2)
}


// decompress LZ-compressed string, or return null if input is invalid
function comprLZDecode(compr) {
	let plain = "";

	for (let i = 0; i < compr.length;) {
		const literal_length = compr.charCodeAt(i) - 0x30;

		if (literal_length < 0 || literal_length > 9 || i + 1 + literal_length > compr.length) {
			return null;
		}

		plain += compr.substring(i + 1, i + 1 + literal_length);
		i += 1 + literal_length;

		if (i >= compr.length) {
			break;
		}
		const backref_length = compr.charCodeAt(i) - 0x30;

		if (backref_length < 0 || backref_length > 9) {
			return null;
		} else if (backref_length === 0) {
			++i;
		} else {
			if (i + 1 >= compr.length) {
				return null;
			}

			const backref_offset = compr.charCodeAt(i + 1) - 0x30;
			if ((backref_length > 0 && (backref_offset < 1 || backref_offset > 9)) || backref_offset > plain.length) {
				return null;
			}

			for (let j = 0; j < backref_length; ++j) {
				plain += plain[plain.length - backref_offset];
			}

			i += 2;
		}
	}

	return plain;
}

function coloringGraph(data) {
	//Helper function to get neighbourhood of a vertex
	function neighbourhood(vertex) {
		const adjLeft = data[1].filter(([a, _]) => a == vertex).map(([_, b]) => b);
		const adjRight = data[1].filter(([_, b]) => b == vertex).map(([a, _]) => a);
		return adjLeft.concat(adjRight);
	}

	//Verify that there is no solution by attempting to create a proper 2-coloring.
	const coloring = Array(data[0]).fill(undefined);
	while (coloring.some((val) => val === undefined)) {
		//Color a vertex in the graph
		const initialVertex = coloring.findIndex((val) => val === undefined);
		coloring[initialVertex] = 0;
		const frontier = [initialVertex];

		//Propogate the coloring throughout the component containing v greedily
		while (frontier.length > 0) {
			const v = frontier.pop() || 0;
			const neighbors = neighbourhood(v);

			//For each vertex u adjacent to v
			for (const id in neighbors) {
				const u = neighbors[id];

				//Set the color of u to the opposite of v's color if it is new,
				//then add u to the frontier to continue the algorithm.
				if (coloring[u] === undefined) {
					if (coloring[v] === 0) coloring[u] = 1;
					else coloring[u] = 0;

					frontier.push(u);
				}

				//Assert u,v do not have the same color
				else if (coloring[u] === coloring[v]) {
					//If u,v do have the same color, no proper 2-coloring exists, meaning
					//the player was correct to say there is no proper 2-coloring of the graph.
					return "[]";
				}
			}
		}
	}
	return coloring;
}

// compress plaintest string
export function comprLZEncode(plain) {
	// for state[i][j]:
	//      if i is 0, we're adding a literal of length j
	//      else, we're adding a backreference of offset i and length j
	let cur_state = Array.from(Array(10), () => Array(10).fill(null));
	let new_state = Array.from(Array(10), () => Array(10));

	function set(state, i, j, str) {
		const current = state[i][j];
		if (current == null || str.length < current.length) {
			state[i][j] = str;
		} else if (str.length === current.length && Math.random() < 0.5) {
			// if two strings are the same length, pick randomly so that
			// we generate more possible inputs to Compression II
			state[i][j] = str;
		}
	}

	// initial state is a literal of length 1
	cur_state[0][1] = "";

	for (let i = 1; i < plain.length; ++i) {
		for (const row of new_state) {
			row.fill(null);
		}
		const c = plain[i];

		// handle literals
		for (let length = 1; length <= 9; ++length) {
			const string = cur_state[0][length];
			if (string == null) {
				continue;
			}

			if (length < 9) {
				// extend current literal
				set(new_state, 0, length + 1, string);
			} else {
				// start new literal
				set(new_state, 0, 1, string + "9" + plain.substring(i - 9, i) + "0");
			}

			for (let offset = 1; offset <= Math.min(9, i); ++offset) {
				if (plain[i - offset] === c) {
					// start new backreference
					set(new_state, offset, 1, string + String(length) + plain.substring(i - length, i));
				}
			}
		}

		// handle backreferences
		for (let offset = 1; offset <= 9; ++offset) {
			for (let length = 1; length <= 9; ++length) {
				const string = cur_state[offset][length];
				if (string == null) {
					continue;
				}

				if (plain[i - offset] === c) {
					if (length < 9) {
						// extend current backreference
						set(new_state, offset, length + 1, string);
					} else {
						// start new backreference
						set(new_state, offset, 1, string + "9" + String(offset) + "0");
					}
				}

				// start new literal
				set(new_state, 0, 1, string + String(length) + String(offset));

				// end current backreference and start new backreference
				for (let new_offset = 1; new_offset <= Math.min(9, i); ++new_offset) {
					if (plain[i - new_offset] === c) {
						set(new_state, new_offset, 1, string + String(length) + String(offset) + "0");
					}
				}
			}
		}

		const tmp_state = new_state;
		new_state = cur_state;
		cur_state = tmp_state;
	}

	let result = null;

	for (let len = 1; len <= 9; ++len) {
		let string = cur_state[0][len];
		if (string == null) {
			continue;
		}

		string += String(len) + plain.substring(plain.length - len, plain.length);
		if (result == null || string.length < result.length) {
			result = string;
		} else if (string.length == result.length && Math.random() < 0.5) {
			result = string;
		}
	}

	for (let offset = 1; offset <= 9; ++offset) {
		for (let len = 1; len <= 9; ++len) {
			let string = cur_state[offset][len];
			if (string == null) {
				continue;
			}

			string += String(len) + "" + String(offset);
			if (result == null || string.length < result.length) {
				result = string;
			} else if (string.length == result.length && Math.random() < 0.5) {
				result = string;
			}
		}
	}

	return result ?? "";
}

function RLEencode(data) {
	let chars = Array.from(data);
	let answer = '';
	let current = undefined;
	let count = 0;
	while (chars.length > 0) {
		let char = chars.shift();
		switch (current) {
			case undefined:
				current = char;
				count = 1;
				break;
			case char:
				if (count == 9) {
					answer = `${answer}${count}${current}`;
					count = 0;
				}
				count++;
				break;
			default:
				answer = `${answer}${count}${current}`;
				current = char;
				count = 1;
				break;
		}
	}
	answer = `${answer}${count}${current}`;
	return answer;
}