# Guide modpack Iris

## Mods

Tous les mods Forge `.jar` vont ici :

```txt
files/mods/
```

Exemple :

```txt
files/mods/Emotecraft-for-MC1.20.1.jar
files/mods/AnotherMod.jar
```

## Configs

Les configs vont ici :

```txt
files/config/
```

Si dans ton dossier `.minecraft` tu as :

```txt
config/emotecraft.json
```

Alors tu mets :

```txt
files/config/emotecraft.json
```

## Resource packs

Les resource packs `.zip` vont ici :

```txt
files/resourcepacks/
```

## Shader packs

Les shaders `.zip` vont ici :

```txt
files/shaderpacks/
```

## Icone du serveur

L’icone affichée par le launcher est ici :

```txt
files/server/icon.png
```

Format conseillé : PNG carré, 64x64 ou 128x128.

## Après modification

À chaque fois que tu ajoutes, retires ou modifies un fichier :

```powershell
npm run build
```

Depuis la racine du launcher, tu peux faire :

```powershell
npm run iris:local-distro
```
