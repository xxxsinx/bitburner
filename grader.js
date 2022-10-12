// --- CONFIG SECTION ---
const testFile="geo.js"; //File to run to initiate testing
const testFileArgs=[]; //Any arguments to be sent to the test file
const testTimeLimit=1000*60*60; //Graded time, default is 1hr.
// --- END CONFIG SECTION ---


/** @param {NS} ns */
export async function main(ns) {
  let startTime = Date.now();
  let startMoney = ns.getServerMoneyAvailable("home");
  ns.run(testFile, 1, ...testFileArgs);
  await ns.asleep(testTimeLimit);
  let finishTime = Date.now();
  let finishMoney = ns.getServerMoneyAvailable("home");

  let message = `Finished testing after ${ns.nFormat((finishTime-startTime)/1000,"0:00:00")}. Money increased by ${ns.nFormat(finishMoney-startMoney,"$0.00a")}, effective profit is ${ns.nFormat((finishMoney-startMoney)*60000/(finishTime-startTime),"$0.00a")}/min`
  console.log(message);
  ns.tprint(message);
}