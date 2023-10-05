<h1>
 <img style="float:right" src="https://github.com/uurshin/minotaure/blob/main/src/assets/images/minotaure_logo.svg" width="88">
 <span>Minotaure</span>
</h1>

[![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/uurshin/minotaure/blob/main/README-EN.md)
 
## What is it for?

Minotaure is a tool that helps you run an adventure for dozens or hundreds of people. Its mechanics are partly borrowed from classic role-playing games but applied to a larger population. Minotaure is inspired by an older tool created by [FibreTigre](https://www.fibretigre.com/) called ATRPG.

The application is meant to be used in conjunction with a video streaming application and instant messaging system (Twitch, Discord, etc.). Each person joining your game will have a minimalist character sheet.

You can organize these characters into different categories (tags) such as gender, species, class, color, faction, etc. This can influence their characteristics (strength, agility, etc.) and their gauges (health, willpower, etc.).

You will present choices to participants through polls.

You can also make them go through trials (similar to dice rolls).

Trials and polls can have consequences not only on the adventure but also on the character sheets (adding/removing tags, modifying characteristics and/or gauges).

Want to learn more? Looking for examples of game situations? Everything is on the [wiki](https://github.com/uurshin/minotaure/wiki).

## How to use Minotaure?

### Installation

This project is designed to be used in two ways, as you prefer:

1. By hosting the index.html file on a server and then navigating to the address of this file. Very convenient, as you only need to share the link provided at the start of the game with participants.
2. By launching the index.html file in your browser. This method does not require any technical knowledge but may not work on some mobile browsers. Participants will need to have the file to enter your game identifier manually.
   
Check the wiki for suggestions on free hosting for the first method.

### Where are games and characters stored?
Minotaure operates **without a remote server** for data storage. 
If you create a game, its data (including character sheets created by participants) is stored in the local storage of **your browser**. 
If you have joined a game, your character's identifier is stored in the local storage of **your browser**.  
When you join a remote game in which you already have a character, the game will reassign you the same character if you join with the same device and browser.
You can export your games and characters to play from other devices or browsers.

### Creating a Game

1. In the main menu, click on **create a game**.
2. After choosing the name, you will be assigned a unique identifier (which will be used to join your game for your participants). You can change this identifier or keep it. Click **Start the game**.
3. Once in the game, click **Invite to join**. Your clipboard will then contain the link to share with your participants (when using the "offline" version, your clipboard contains the identifier to be pasted for your participants in the **Join a game** page).
4. Click **Start** so that participants can create their characters.
5. You can modify the settings of your games at any time, whether they are started or not. If you don't know how to use Minotaure, you can consult the wiki. You can also click **Help** on your game screen to launch a tutorial.
  
### Continuing a Created Game
If you have created a game, you can continue it from where you left off. 
1. In the main menu, click on **Manage your games**.
2. Choose a game from the list and click **Continue**.
3. You will then be at the first step of the game creation.

### Joining a Game
1. If you have been given a link to join, click on it. If you have been given a game identifier instead of a link, click **Join a game** in the main menu and enter the provided identifier and validate it.
2. If the game has already started, you will be able to create a character. Otherwise, you will be waiting for the start.

If you access a game where you already have a character, it will be automatically assigned to you, but you must use the same device and browser as when you last accessed the game. To use another device or browser (e.g., to join on your phone instead of your computer), check the wiki for more information on importing/exporting characters. Don't worry; it's straightforward!
   
## Contributing to Development

Minotaure is open-source software. We invite you to contribute to its future versions through code, translation, testing, and documentation.
Feel free to report bugs or suggest improvements by opening [issues](https://github.com/uurshin/minotaure/issues).

### Source Installation
To build the project, clone it and then run the following commands (npm command must be available):
 `npm ci`

Afterwards, you can create a build for either:
- A local environment with `npm run build -- --mode=offline` (the index.html file can be found in the /dist/offline folder)
- A hosted environment with `npm run build` (the index.html file can be found in the /dist/online folder)

### Application Icons
The icons used in this project are injected into a web font produced using: [IcoMoon](https://icomoon.io/#faq)
If your development requires a new icon, import the icomoon_minotaure.json file, make your modifications, and then export the project and the font before submitting your changes to the repository. Make sure to only provide icons that are free of rights.
