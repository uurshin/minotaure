# Comment utiliser Minotaure ?

Ce projet est prévu pour être utilisé de 2 façons, au choix :

1. en lancant le fichier index.html dans votre navigateur
2. en hébergeant le fichier index.html sur un serveur puis en naviguant vers l'adresse de ce fichier

# Build d'un projet

Pour construire le projet, lancez les commandes suivantes (la commande npm doit être disponible) :
 `npm ci`
 
Ensuite, vous pouvez créer une build pour, au choix :
- un environnement local avec `npm run build -- --mode=offline` (le fichier index.html pourra être trouvé dans le dossier /dist/offline)
- un environnement hébergé avec `npm run build` (le fichier index.html pourra être trouvé dans le dossier /dist/online)

# Contribution au repository

Les icônes utilisés dans ce projet sont injectés dans une webfont produite grâce à IcoMoon : https://icomoon.io/#faq
Si un de vos développements nécessite un nouvel icône, ajoutez le dans la police générée.
[A compléter]

