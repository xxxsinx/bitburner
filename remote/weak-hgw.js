/** @param {NS} ns */
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
      }