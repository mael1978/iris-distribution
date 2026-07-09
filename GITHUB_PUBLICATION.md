# Publier la distribution Iris sur GitHub

## 1. Créer le dépôt

Sur GitHub :

```txt
+  →  New repository
```

Nom conseillé :

```txt
iris-distribution
```

Important : choisis `Public`.

Le launcher doit pouvoir lire les fichiers sans mot de passe. Pour commencer, un dépôt privé est donc à éviter.

## 2. Préparer les fichiers

Depuis le dossier `IrisLauncherV2`, lance :

```powershell
npm run iris:local-distro
```

Ça met à jour :

```txt
iris-distribution/distribution.json
```

## 3. Envoyer sur GitHub

Dans GitHub, ouvre ton dépôt `iris-distribution`, puis :

```txt
Add file → Upload files
```

Glisse le contenu du dossier :

```txt
IrisLauncherV2/iris-distribution/
```

Il faut envoyer le contenu du dossier, pas le dossier `IrisLauncherV2` complet.

Le dépôt GitHub doit ressembler à ça :

```txt
distribution.json
iris.config.json
package.json
README.md
files/
  mods/
  config/
  resourcepacks/
  shaderpacks/
  server/
tools/
  build-distribution.js
  prepare-forge.js
  sync-local.js
.github/
  workflows/
```

## 4. Brancher le launcher

À la racine de `IrisLauncherV2` :

```powershell
npm run iris:github -- --owner TON_COMPTE_GITHUB
```

Exemple :

```powershell
npm run iris:github -- --owner MaelIris
```

## 5. Vérifier

Après avoir envoyé les fichiers sur GitHub :

```powershell
npm run iris:github:check
```

Si tout est OK, le launcher lit bien GitHub.

## Plus tard

Quand tu ajoutes un mod :

```txt
iris-distribution/files/mods/
```

Quand tu ajoutes une config :

```txt
iris-distribution/files/config/
```

Quand tu ajoutes un resource pack :

```txt
iris-distribution/files/resourcepacks/
```

Puis :

```powershell
npm run iris:local-distro
```

Et tu renvoies `iris-distribution` sur GitHub.
