/** @param {NS} ns */
export async function main(ns) {
  const orig = React.createElement;
  const origState = React.useState;
  let stateCalls = 0;
  let resolve;
  const nextLevelHook = (callNumber, fn, parentThis, parentArgs) => {
    React.createElement = orig;
    const wrapped = new Proxy(fn, {
      apply(target, thisArg, args_) {
        if (stateCalls === 0) {
          React.useState = function (...args) {
            stateCalls++;
            const state = origState.call(this, ...args);
            if (stateCalls === callNumber) {
              resolve(state);
              React.useState = origState;
            }
            return state;
          }
        }
        return target.apply(thisArg, args_);
      }
    });
    return orig.call(parentThis, wrapped, ...parentArgs.slice(1));
  }
  React.createElement = function (...args) {
    const fn = args[0];
    const stringFn = (typeof fn === "function") ? String(fn) : null;
    if (stringFn?.includes("Trying to go to a page without the proper setup")) {
      return nextLevelHook(2, fn, this, args);
    } else if (stringFn?.includes("Routing is currently disabled")) {
      return nextLevelHook(1, fn, this, args);
    }
    return orig.call(this, ...args);
  }
  const resultP = Promise.race([
    new Promise((res) => resolve = res),
    ns.asleep(5000).then(() => { throw Error("Something unknown went wrong while running exploit") })])
    .finally(() => {
      React.createElement = orig;
      React.useState = origState;
    });
  ns.ui.setTheme(ns.ui.getTheme());
  const [state, setState] = await resultP;
  if (typeof state === "string") {
    setState("Dev");
  } else if (typeof state === "number") {
    setState(8);
  } else if (Array.isArray(state)) {
    setState([{ page: "Dev" }, ...state]);
  } else {
    ns.tprintf("ERROR: Exploit succeeded, but got an unknown result for the type of page");
  }
}