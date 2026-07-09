const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const root = path.resolve(__dirname, '..')
const configPath = path.join(root, 'iris.config.json')
const generatedForgeModulePath = path.join(root, 'generated', 'forge-module.json')

function readJson(file){
    return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeJson(file, data){
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function syncBundledDistribution(){
    const launcherRoot = path.resolve(root, '..')
    const bundledPath = path.join(launcherRoot, 'app', 'assets', 'distribution', 'distribution.json')
    const distributionPath = path.join(root, 'distribution.json')

    if(fs.existsSync(path.join(launcherRoot, 'app'))){
        fs.mkdirSync(path.dirname(bundledPath), { recursive: true })
        fs.copyFileSync(distributionPath, bundledPath)
        console.log(`[IRIS] Distribution locale copiée dans app/assets/distribution/distribution.json`)
    }
}

function md5(file){
    return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex')
}

function fileSize(file){
    return fs.statSync(file).size
}

function walk(dir){
    if(!fs.existsSync(dir)) return []
    const out = []
    for(const entry of fs.readdirSync(dir, { withFileTypes: true })){
        const full = path.join(dir, entry.name)
        if(entry.name === '.gitkeep' || entry.name === '.DS_Store') continue
        if(entry.name === 'README.md' || entry.name === 'LISEZ-MOI.txt' || entry.name.startsWith('METTRE_')) continue
        if(entry.isDirectory()){
            out.push(...walk(full))
        } else {
            out.push(full)
        }
    }
    return out
}

function slash(p){
    return p.replace(/\\/g, '/')
}

function cleanName(name){
    return name
        .toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'file'
}

function rawUrl(base, rel){
    return `${base.replace(/\/$/, '')}/${slash(rel).split('/').map(encodeURIComponent).join('/')}`
}

function makeForgeMod(file, cfg){
    const rel = slash(path.relative(path.join(root, 'files'), file))
    const hash = md5(file)
    const name = path.basename(file)
    const artifact = cleanName(name)
    const version = hash.slice(0, 12)

    return {
        id: `iris.mods:${artifact}:${version}`,
        name: name.replace(/\.jar$/i, ''),
        type: 'ForgeMod',
        artifact: {
            size: fileSize(file),
            MD5: hash,
            url: rawUrl(cfg.githubRawBase, rel)
        }
    }
}

function makeFileModule(file, baseDir, destPrefix, cfg){
    const relInside = slash(path.relative(baseDir, file))
    const relFromFiles = slash(path.relative(path.join(root, 'files'), file))
    const hash = md5(file)
    const idSafe = cleanName(`${destPrefix}-${relInside}`)

    return {
        id: `iris.file.${idSafe}.${hash.slice(0, 12)}`,
        name: relInside,
        type: 'File',
        artifact: {
            size: fileSize(file),
            MD5: hash,
            path: slash(path.join(destPrefix, relInside)),
            url: rawUrl(cfg.githubRawBase, relFromFiles)
        }
    }
}

function main(){
    if(!fs.existsSync(configPath)){
        throw new Error('iris.config.json introuvable.')
    }

    const cfg = readJson(configPath)
    const modules = []

    if(fs.existsSync(generatedForgeModulePath)){
        modules.push(readJson(generatedForgeModulePath))
    } else {
        console.warn('[IRIS] Forge n’est pas encore préparé. Lance npm run prepare-forge avant le vrai test de lancement.')
    }

    for(const file of walk(path.join(root, 'files', 'mods')).filter(f => f.toLowerCase().endsWith('.jar'))){
        modules.push(makeForgeMod(file, cfg))
    }

    const fileGroups = [
        ['config', 'config'],
        ['resourcepacks', 'resourcepacks'],
        ['shaderpacks', 'shaderpacks'],
        ['servers', '']
    ]

    for(const [folder, destPrefix] of fileGroups){
        const baseDir = path.join(root, 'files', folder)
        for(const file of walk(baseDir)){
            modules.push(makeFileModule(file, baseDir, destPrefix, cfg))
        }
    }

    const address = cfg.serverPort && Number(cfg.serverPort) !== 25565
        ? `${cfg.serverAddress}:${cfg.serverPort}`
        : cfg.serverAddress

    const distribution = {
        version: '1.0.0',
        discord: {
            clientId: cfg.discordClientId || '000000000000000000',
            smallImageText: 'Iris Launcher',
            smallImageKey: 'iris'
        },
        rss: cfg.rss || 'https://example.invalid/iris-news-disabled.xml',
        servers: [
            {
                id: 'iris-forge-1.20.1',
                name: 'Iris',
                description: 'Serveur Minecraft Iris.',
                icon: rawUrl(cfg.githubRawBase, 'server/icon.png'),
                version: cfg.serverPackVersion || '0.1.0',
                address,
                minecraftVersion: cfg.minecraftVersion || '1.20.1',
                discord: {
                    shortId: 'Iris',
                    largeImageText: 'Iris',
                    largeImageKey: 'iris'
                },
                mainServer: true,
                autoconnect: true,
                javaOptions: {
                    supported: '>=17.x <22.x',
                    suggestedMajor: 17,
                    distribution: cfg.javaDistribution || 'TEMURIN',
                    ram: {
                        recommended: cfg.recommendedRamMb || 4096,
                        minimum: cfg.minimumRamMb || 3072
                    }
                },
                modules
            }
        ]
    }

    writeJson(path.join(root, 'distribution.json'), distribution)
    syncBundledDistribution()

    console.log(`[IRIS] distribution.json généré.`)
    console.log(`[IRIS] Modules: ${modules.length}`)
    console.log(`[IRIS] Serveur: ${address}`)
}

try {
    main()
} catch(err) {
    console.error('[IRIS] Erreur génération distribution:')
    console.error(err)
    process.exit(1)
}
