# Mise en ligne GitHub — Iris Distribution

## Option recommandée

Créer un dépôt GitHub séparé appelé :

```txt
iris-distribution
```

Dans ce dépôt, tu mets le contenu du dossier `iris-distribution`, pas le dossier entier.

Donc sur GitHub, à la racine du dépôt, tu dois voir :

```txt
distribution.json
iris.config.json
package.json
files/
tools/
forge/
generated/
README.md
```

Pas :

```txt
iris-distribution/distribution.json
```

## Ligne à modifier

Dans `iris.config.json` :

```json
"githubRawBase": "https://raw.githubusercontent.com/TON_COMPTE/iris-distribution/main/files"
```

Remplace `TON_COMPTE` par ton compte GitHub.

## Ligne à modifier dans le launcher

Dans :

```txt
app/assets/js/distromanager.js
```

Remplace :

```js
https://raw.githubusercontent.com/TON_COMPTE/iris-distribution/main/distribution.json
```

par ton vrai lien.

## Après chaque ajout de mod/config/resourcepack

Dans `iris-distribution` :

```powershell
npm run build
```

Puis tu envoies les changements sur GitHub.
