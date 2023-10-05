<h1>
 <img style="float:right" src="https://github.com/uurshin/minotaure/blob/main/src/assets/images/minotaure_logo.svg" width="88">
 <span>Minotaure</span>
</h1>

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/uurshin/minotaure/blob/main/README-EN.md)
 
## A quoi ça sert ?

Minotaure est un outil vous aidant à animer une aventure pour plusieurs dizaines ou centaines de personnes, dont les mécanismes sont en partie empruntés à un jeu de rôle classique mais appliqués à une population plus large. Minotaure s'inspire du fonctionnement d'un outil plus ancien créé par FibreTigre sous le nom ATRPG.

L'application est à utiliser en complément d'une application de streaming vidéo et d'un système de messagerie instantané (Twitch, Discord, etc.)
Chaque personne rejoignant votre partie disposera d'une fiche de personnage minimaliste.
Vous pourrez ranger ces personnages dans des catégories (**tags**) différentes (genre, espèce, classe, couleur, faction, etc.). Cela pourra influencer leurs **caractéristiques** (force, agilité, etc.) et leurs **jauges** (vie, volonté, etc.).
Vous allez proposer des choix grâce aux **sondages** à des personnages.
Vous pourrez aussi leur faire passer des **épreuves**.
Les épreuves et les sondages pourront avoir, en plus de leurs conséquences sur l'aventure, des **conséquences** sur les fiches des personnages (ajout / suppression de tags, modification de caractéristiques et/ou de jauges).

Vous voulez en savoir plus ? Vous cherchez des exemples de situation de parties ? Tout est sur le wiki.

## Comment utiliser Minotaure ?

### Installation

Ce projet est prévu pour être utilisé de 2 façons, au choix :

1. en lancant le fichier index.html dans votre navigateur (surnommée la version "offline")
2. en hébergeant le fichier index.html sur un serveur puis en naviguant vers l'adresse de ce fichier

### Où sont conservés les parties et personnages ?
<sup> Il est difficile de comprendre cette partie. Pour chacun des utilisateurs (MJ, PJ) il faut mieux expliquer ce qui est sur quel navigateur </sup>
Minotaure fonctionne **sans serveur distant** pour stocker des données. Les parties sont conservées dans le stockage local de **votre navigateur**. Les identifiants de vos personnages y sont également stockés pour qu'une partie distante sache quel personnage vous possédez et vous l'attribuer lorsque vous rejoignez la partie. Cet avantage nécessite que vous utilisez toujours le même appareil et navigateur pour retrouver vos parties et personnages, ou que vous exportiez ces données (en savoir plus sur le wiki).

### Créer une partie

1. Dans le menu principal, cliquez sur **créer une partie**.
2. Après avoir choisi le nom, un identifiant unique vous sera attribué (il servira à rejoindre votre partie pour vos participants). Vous pouvez changer cet identifiant ou le garder. Cliquez sur **Lancer la partie**
3. Une fois dans la partie, cliquez sur **Inviter à rejoindre**. Votre presse-papiers contiendra alors le lien à partager à vos participants (lorsque vous utilisez la version "offline", votre presse papier contient à la place l'identifiant à coller pour vos participants dans la page **Rejoindre une partie**).
4. Cliquez sur **Démarrer** pour que les participants puissent créer leurs personnages.
5. Vous pouvez modifier les paramètres de vos parties à tout moment, qu'elle soit démarrée ou non. Si vous ne savez pas utiliser Minotaure, vous pouvez consulter le wiki. Vous pouvez également cliquer sur **Aide** dans l'écran de votre partie pour lancer un didacticiel.
  
### Continuer une partie créée
Si vous avez créé une partie, vous pouvez la continuer à l'état où vous l'avez quittée. 
1. Dans le menu principal, cliquez sur **Gérer vos parties**.
2. Choisissez une partie dans la liste, et cliquez sur **Continuer**
3. Pour serez alors à la première étape de la création de partie.

### Rejoindre une partie
1. Si un lien pour rejoindre vous a été communiqué, cliquez dessus. Si un identifiant de partie vous a été communiqué au lien d'un lien, cliquez sur **rejoindre une partie** dans le menu principal puis entrez l'identifiant fourni et validez.
2. Si la partie a déjà démarré, vous pourrez créer un personnage. Sinon, vous serez en attente du démarrage.

Si vous accédez à une partie où vous possédez déjà un personnage, il vous sera automatiquement attribué, mais il faut que vous utilisiez le même appareil et le même navigateur que lorsque vous avez accédé à la partie la dernière fois. Pour utiliser un autre appareil ou navigateur (par exemple pour rejoindre sur votre téléphone au lieu de votre ordinateur), consultez le wiki pour en savoir plus sur l'import/export de personnage. Pas d'inquiétude, c'est très simple !
   
## Contribuer au développement

Minotaure est un logiciel open source. Nous vous invitons à contribuer à ses futures versions, à travers le code, la traduction, la rédaction ou la documentation.

### Installation des sources
Pour construire le projet, clonez le puis lancez les commandes suivantes (la commande npm doit être disponible) :
 `npm ci`

Ensuite, vous pouvez créer une build pour, au choix :
- un environnement local avec `npm run build -- --mode=offline` (le fichier index.html pourra être trouvé dans le dossier /dist/offline)
- un environnement hébergé avec `npm run build` (le fichier index.html pourra être trouvé dans le dossier /dist/online)

### Icônes de l'application
Les icônes utilisés dans ce projet sont injectés dans une webfont produite grâce à IcoMoon : https://icomoon.io/#faq
Si un de vos développements nécessite un nouvel icône, importez le fichier icomoon_minotaure.json, effectuez vos modifications puis exportez le projet et la police avant de soumettre vos modifications sur le dépôt. Assurez-vous de ne proposer que des icônes libres de droit.
