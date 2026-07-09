const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')
const AdmZip = require('adm-zip')

const root = path.resolve(__dirname, '..')
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'iris.config.json'), 'utf8'))

function ensureDir(dir){
    fs.mkdirSync(dir, { recursive: true })
}

function slash(p){
    return p.replace(/\\/g, '/')
}

function md5(file){
    return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex')
}

function size(file){
    return fs.statSync(file).size
}

function rawUrl(rel){
    return `${cfg.githubRawBase.replace(/\/$/, '')}/${slash(rel).split('/').map(encodeURIComponent).join('/')}`
}

function mavenPath(mavenId){
    const [group, artifact, versionAndRest] = mavenId.split(':')
    if(!group || !artifact || !versionAndRest){
        throw new Error(`Identifiant Maven invalide: ${mavenId}`)
    }

    let version = versionAndRest
    let extension = 'jar'
    let classifier = null

    if(versionAndRest.includes('@')){
        const parts = versionAndRest.split('@')
        version = parts[0]
        extension = parts[1]
    }

    // groupe:artefact:version:classifier n'est pas le format principal ici,
    // mais on garde un minimum de compatibilité au cas où Forge l'utilise.
    const split = mavenId.split(':')
    if(split.length >= 4){
        version = split[2]
        classifier = split[3].split('@')[0]
        if(split[3].includes('@')) extension = split[3].split('@')[1]
    }

    const fileName = classifier
        ? `${artifact}-${version}-${classifier}.${extension}`
        : `${artifact}-${version}.${extension}`

    return slash(path.join(group.replace(/\./g, '/'), artifact, version, fileName))
}

function moduleIdWithoutClassifier(mavenId){
    const split = mavenId.split(':')
    if(split.length >= 3){
        return `${split[0]}:${split[1]}:${split[2].split('@')[0]}`
    }
    return mavenId
}

function download(url, dest){
    return new Promise((resolve, reject) => {
        ensureDir(path.dirname(dest))
        const file = fs.createWriteStream(dest)
        const request = https.get(url, response => {
            if(response.statusCode >= 300 && response.statusCode < 400 && response.headers.location){
                file.close()
                fs.rmSync(dest, { force: true })
                download(response.headers.location, dest).then(resolve).catch(reject)
                return
            }
            if(response.statusCode !== 200){
                file.close()
                fs.rmSync(dest, { force: true })
                reject(new Error(`Téléchargement impossible (${response.statusCode}) : ${url}`))
                return
            }
            response.pipe(file)
            file.on('finish', () => {
                file.close(resolve)
            })
        })
        request.on('error', err => {
            file.close()
            fs.rmSync(dest, { force: true })
            reject(err)
        })
    })
}

function findEntry(zip, candidates){
    const entries = zip.getEntries().map(e => e.entryName)
    for(const c of candidates){
        const direct = entries.find(e => e === c)
        if(direct) return direct
        const suffix = entries.find(e => e.endsWith('/' + c) || e.endsWith(c))
        if(suffix) return suffix
    }
    return null
}

function readJsonFromZip(zip, entryName){
    const entry = zip.getEntry(entryName)
    if(!entry) return null
    return JSON.parse(entry.getData().toString('utf8'))
}

async function ensureArtifact(zip, mavenId, preferredDownloadUrl = null){
    const rel = mavenPath(mavenId)
    const outRel = slash(path.join('libraries', rel))
    const outAbs = path.join(root, 'files', outRel)
    const zipCandidates = [
        slash(path.join('maven', rel)),
        rel
    ]

    const entry = findEntry(zip, zipCandidates)
    if(entry){
        ensureDir(path.dirname(outAbs))
        fs.writeFileSync(outAbs, zip.getEntry(entry).getData())
    } else if(preferredDownloadUrl){
        await download(preferredDownloadUrl, outAbs)
    } else {
        throw new Error(`Fichier introuvable pour ${mavenId}. Il n'est pas dans l'installer et aucune URL n'est disponible.`)
    }

    return {
        id: mavenId,
        localRel: outRel,
        artifact: {
            size: size(outAbs),
            MD5: md5(outAbs),
            url: rawUrl(outRel)
        }
    }
}

function getInstallerPath(){
    const argIndex = process.argv.findIndex(x => x === '--installer')
    if(argIndex !== -1 && process.argv[argIndex + 1]){
        return path.resolve(process.argv[argIndex + 1])
    }

    const exact = path.join(root, 'forge', `forge-${cfg.minecraftVersion}-${cfg.forgeVersion}-installer.jar`)
    if(fs.existsSync(exact)) return exact

    const forgeDir = path.join(root, 'forge')
    const found = fs.existsSync(forgeDir)
        ? fs.readdirSync(forgeDir).find(f => /^forge-.+-installer\.jar$/i.test(f))
        : null

    return found ? path.join(forgeDir, found) : exact
}

async function ensureInstaller(installerPath){
    if(fs.existsSync(installerPath)) return
    ensureDir(path.dirname(installerPath))
    const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${cfg.minecraftVersion}-${cfg.forgeVersion}/forge-${cfg.minecraftVersion}-${cfg.forgeVersion}-installer.jar`
    console.log(`[IRIS] Installer Forge absent, téléchargement : ${url}`)
    await download(url, installerPath)
}

function normalizeVersionManifest(versionJson, profile){
    const id = versionJson.id || profile.version || `${cfg.minecraftVersion}-forge-${cfg.forgeVersion}`
    versionJson.id = id

    if(!versionJson.inheritsFrom){
        versionJson.inheritsFrom = cfg.minecraftVersion
    }

    return versionJson
}

function collectLibraries(profile, versionJson){
    const byName = new Map()
    for(const lib of [...(profile.libraries || []), ...(versionJson.libraries || [])]){
        if(!lib || !lib.name) continue
        byName.set(moduleIdWithoutClassifier(lib.name), lib)
    }
    return Array.from(byName.values())
}

function artifactUrlFromLibrary(lib){
    return lib?.downloads?.artifact?.url || lib?.url || null
}

async function main(){
    const installerPath = getInstallerPath()
    await ensureInstaller(installerPath)

    console.log(`[IRIS] Lecture de ${installerPath}`)
    const zip = new AdmZip(installerPath)

    const profileEntry = findEntry(zip, ['install_profile.json'])
    if(!profileEntry){
        throw new Error('install_profile.json introuvable dans l’installer Forge.')
    }

    const profile = readJsonFromZip(zip, profileEntry)

    let versionJson = null
    const versionEntry = findEntry(zip, ['version.json'])
    if(versionEntry){
        versionJson = readJsonFromZip(zip, versionEntry)
    } else if(profile.json && typeof profile.json === 'object'){
        versionJson = profile.json
    } else if(profile.versionInfo && typeof profile.versionInfo === 'object'){
        versionJson = profile.versionInfo
    }

    if(!versionJson){
        throw new Error('Version manifest Forge introuvable. Impossible de préparer Forge automatiquement avec cet installer.')
    }

    versionJson = normalizeVersionManifest(versionJson, profile)
    const versionId = versionJson.id
    const forgeMavenId = profile.path || `net.minecraftforge:forge:${cfg.minecraftVersion}-${cfg.forgeVersion}`

    const versionRel = slash(path.join('versions', versionId, `${versionId}.json`))
    const versionAbs = path.join(root, 'files', versionRel)
    ensureDir(path.dirname(versionAbs))
    fs.writeFileSync(versionAbs, JSON.stringify(versionJson, null, 2) + '\n', 'utf8')

    console.log(`[IRIS] Manifest Forge : ${versionId}`)

    const forgeArtifact = await ensureArtifact(zip, forgeMavenId, `https://maven.minecraftforge.net/${mavenPath(forgeMavenId)}`)

    const subModules = [
        {
            id: versionId,
            name: `Forge ${versionId} - version manifest`,
            type: 'VersionManifest',
            artifact: {
                size: size(versionAbs),
                MD5: md5(versionAbs),
                path: versionRel,
                url: rawUrl(versionRel)
            }
        }
    ]

    const libs = collectLibraries(profile, versionJson)
    let ok = 0
    let skipped = 0

    for(const lib of libs){
        if(!lib.name) continue
        if(moduleIdWithoutClassifier(lib.name) === moduleIdWithoutClassifier(forgeMavenId)) continue

        try {
            const artifact = await ensureArtifact(zip, lib.name, artifactUrlFromLibrary(lib))
            subModules.push({
                id: lib.name,
                name: lib.name,
                type: 'Library',
                artifact: artifact.artifact
            })
            ok++
        } catch(err) {
            skipped++
            console.warn(`[IRIS] Bibliothèque ignorée : ${lib.name}`)
            console.warn(`       ${err.message}`)
        }
    }

    const forgeModule = {
        id: forgeMavenId,
        name: `Minecraft Forge ${cfg.minecraftVersion}-${cfg.forgeVersion}`,
        type: 'ForgeHosted',
        artifact: forgeArtifact.artifact,
        subModules
    }

    ensureDir(path.join(root, 'generated'))
    fs.writeFileSync(path.join(root, 'generated', 'forge-module.json'), JSON.stringify(forgeModule, null, 2) + '\n', 'utf8')

    console.log(`[IRIS] Forge préparé.`)
    console.log(`[IRIS] Bibliothèques ajoutées : ${ok}`)
    if(skipped > 0){
        console.log(`[IRIS] Bibliothèques ignorées : ${skipped}`)
    }
    console.log('[IRIS] Lance maintenant : npm run build')
}

main().catch(err => {
    console.error('[IRIS] Erreur préparation Forge:')
    console.error(err)
    process.exit(1)
})
