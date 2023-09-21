# Build d'un projet

Ce projet est prévu pour être utilisé de 2 façons :

- via un fichier index.html lancé dans le navigateur (file://)
- via un fichier hébergé sur un serveur

Les deux contextes d'éxécution ayant leurs limitations, lorsque vous buildez vous pouvez créer une version pour :

- l'environnement local avec `npm run build -- --mode=offline`
- l'environnement hébergé avec `npm run build`