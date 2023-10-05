[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/uurshin/minotaure/blob/main/README-EN.md)
<img src="[https://github.com/favicon.ico](https://github.com/uurshin/minotaure/blob/main/src/assets/images/minotaure_logo.svg)" width="48">

# Comment utiliser Minotaure ?

Ce projet est prévu pour être utilisé de 2 façons, au choix :

1. en lancant le fichier index.html dans votre navigateur
2. en hébergeant le fichier index.html sur un serveur puis en naviguant vers l'adresse de ce fichier

# Contribuer au développement
## Installation des sources
Pour construire le projet, clonez le puis lancez les commandes suivantes (la commande npm doit être disponible) :
 `npm ci`

Ensuite, vous pouvez créer une build pour, au choix :
- un environnement local avec `npm run build -- --mode=offline` (le fichier index.html pourra être trouvé dans le dossier /dist/offline)
- un environnement hébergé avec `npm run build` (le fichier index.html pourra être trouvé dans le dossier /dist/online)

## Contribution au dépôt
### Les icônes sont générées via l'application Icomoon
Les icônes utilisés dans ce projet sont injectés dans une webfont produite grâce à IcoMoon : https://icomoon.io/#faq
Si un de vos développements nécessite un nouvel icône, importez le fichier icomoon_minotaure.json, effectuez vos modifications, puis exportez le projet et la police avant de soumettre vos modification sur le dépôt.
