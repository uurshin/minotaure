[![en](https://img.shields.io/badge/lang-fr-red.svg)](https://github.com/uurshin/minotaure/blob/main/README.md)

# How to use Minotaure

This project is designed to be used in 2 different ways:

1. by launching the index.html file in your browser
2. by hosting the index.html file on a server, then navigating to the file's address.

# Contribute to development
## Installing sources
To build the project, clone it, then run the following commands (the npm command must be available):
 `npm ci`

Next, you can create a build for either :
- a local environment with `npm run build -- --mode=offline` (the index.html file can be found in the /dist/offline folder)
- a hosted environment with `npm run build` (the index.html file can be found in the /dist/online folder)

## Repository contribution
### Icons are generated using the Icomoon application
The icons used in this project are injected into a webfont produced by IcoMoon: https://icomoon.io/#faq
If one of your developments requires a new icon, import the icomoon_minotaure.json file, make your modifications, then export the project and font before submitting your changes to the repository.
