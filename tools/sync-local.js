const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const launcherRoot = path.resolve(root, '..')
const source = path.join(root, 'distribution.json')
const target = path.join(launcherRoot, 'app', 'assets', 'distribution', 'distribution.json')

function main(){
    if(!fs.existsSync(source)){
        throw new Error('distribution.json introuvable. Lance d’abord npm run build dans iris-distribution.')
    }

    if(!fs.existsSync(path.join(launcherRoot, 'app'))){
        console.log('[IRIS] Dossier app introuvable. Rien à synchroniser côté launcher local.')
        return
    }

    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(source, target)

    console.log('[IRIS] Distribution locale synchronisée.')
    console.log(`[IRIS] ${target}`)
}

try {
    main()
} catch(err) {
    console.error('[IRIS] Erreur sync-local:')
    console.error(err.message)
    process.exit(1)
}
