const BLACKLISTED_HOSTS         = ['darkweb']
const SEARCH_DEPTH              = 999
const INACCESSIBLE_STYLE_NAME   = 'inaccessible'
const MERMAID_HEAD              = 'graph LR'
const MERMAID_STYLE             = `classDef ${INACCESSIBLE_STYLE_NAME} fill:#f96;`

/** @type {NS} **/
let ns 

/** @param {NS} _ns **/
export async function main(_ns) {
    ns = _ns

    const limit = ns.getHackingLevel()
    const hostCache = []
    const content = []

    const deepSearch = (name, i = 0, parent = null) => {
        if (i > SEARCH_DEPTH) {
            return
        }

        // Check if host has been traversed already
        if (hostCache.indexOf(name) == -1 && BLACKLISTED_HOSTS.indexOf(name)) {
            hostCache.push(name)
        } else {
            return
        }

        let target = ns.getServer(name)
        target.connections = ns.scan(name)
        target.connectionsResolved = {}

        // Creating node definition for mermaid
        if (parent !== null) {
            const isAccessible = target.requiredHackingSkill >= limit ? `:::${INACCESSIBLE_STYLE_NAME}` : ''
            content.push(`${parent} -- ${target.requiredHackingSkill} ---> ${name}${isAccessible}`)
        }

        if (target.connections.length > 0) {
            for (let subTarget of target.connections) {
                let peek = deepSearch(subTarget, i + 1, name)
                if (peek) target.connectionsResolved[subTarget] = peek
            }
        }

        return target
    }

    deepSearch('home')
    renderDefinition(content)
}

function renderDefinition(content) {
    ns.tprint(`\n` + MERMAID_HEAD + '\n\t' + content.join('\n\t') + MERMAID_STYLE)
    ns.tprint('Copy & paste the content above into https://mermaid.live')
}