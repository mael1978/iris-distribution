# Iris Distribution

Ce dossier sert à préparer les fichiers téléchargés automatiquement par Iris Launcher.

## Structure

```txt
files/mods/           Mods Forge .jar
files/config/         Configs du modpack
files/resourcepacks/  Resource packs .zip
files/shaderpacks/    Shader packs .zip
files/server/         Icone du serveur
forge/                Installer Forge si besoin
libraries/            Fichiers Forge générés
versions/             Version Forge générée
```

## Utilisation simple

1. Mets les mods dans `files/mods/`
2. Mets les configs dans `files/config/`
3. Mets les resource packs dans `files/resourcepacks/`
4. Lance :

```powershell
npm run build
```

Si ce dossier est encore dans le projet launcher, `npm run build` copie aussi la distribution dans :

```txt
../app/assets/distribution/distribution.json
```

## Forge

Pour préparer Forge 1.20.1 :

```powershell
npm run prepare-forge
npm run build
```

## GitHub

Quand le dépôt GitHub sera créé, modifie `iris.config.json` :

```json
"githubRawBase": "https://raw.githubusercontent.com/TON_COMPTE/iris-distribution/main/files"
```

Puis envoie le contenu de ce dossier sur GitHub.
