/** @param {NS} ns */
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
      