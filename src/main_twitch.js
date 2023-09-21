import {createApp, watch} from 'vue'
import { createPinia, defineStore } from 'pinia'

import { createWebHashHistory, createRouter } from 'vue-router'
import Player from './components/PlayerTwitch.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/player', component: Player },
    ],
})

const app = createApp(Player)
app.use(createPinia())
app.use(router)

export const usePlayerStore = defineStore('playerStore', {
    state: () => ({
        _user_peer: null,
        _player_connection: null,
        _current_game: null,
        _leaving: false,
        _temp_peer: null,
        _message: '',
        _temp_connections: [],
    }),
    getters: {
        peer: (state) => state._user_peer,
        connection : (state) => state._player_connection,
        current_game: (state) => state._current_game,
        characters: (state) => state._current_game.characters,
        tag_groups: (state) => state._current_game.tag_groups,
        stats: (state) => state._current_game.stats,
        gauges: (state) => state._current_game.gauges,
        leaving: (state) => state._leaving,
        temp_peer: (state) => state._temp_peer,
        temp_connections: (state) => state._temp_connections,
        message: (state) => state._message,
        tags(state) {
            let flatten_tags = [];
            state._current_game.tag_groups.forEach(function(tag_group) {
                flatten_tags = [...flatten_tags, ...tag_group.tags]
            })
            return flatten_tags;
        },
    },
    actions: {
        getStatbyCode(code) {
            let found = this.stats.find(function(stat) {
                if (stat.code === code) {
                    return true;
                }
            })
            return found;
        },
        setMessage(value) {
            this._message = value;
            setTimeout(() => {
                this._message = '';
            }, 2000);
        },
        setTempPeer(value) {
            this._temp_peer = value;
        },
        getStartTags() {
            return this.tag_groups.filter((group) => group.start && group.tags.length > 0);
        },
        getTagFromCode(code) {
            return this.tags.find((tag) => tag.code === code);
        },
        setConnections(connections) {
            this._connections = connections;
        },
        disconnectAll() {
            this.characters.forEach(function(character) {
                if (character.connection != null) {
                    character.connection.close()
                }
            });
            this.peer.disconnect();
        },
        // removeConnection(conn) {
        //     let foundIndex = this.connections.findIndex((connection) => connection.id === conn.id);
        //     if (foundIndex) {
        //         this._connections.splice(foundIndex, 1);
        //     }
        //     let character = this.characters.find((character) => character.connection === conn.id);
        //     if (character !== undefined) {
        //         character.connection = null;
        //         this.editCharacter(character);
        //     }
        // },
        setPeer(peer) {
            this._user_peer = peer;
        },
        setConnection(conn) {
            this._player_connection = conn;
        },
        setCurrentGame(game) {
            this._current_game = game;
        },
        startGame() {
            let vm = this;
            this.current_game.game_started = true;
            this.temp_connections.forEach(function(connection) {
                connection.send({
                    handshake:'gameStart',
                    game_token: vm.current_game.id
                });
            })
            this._temp_connections = [];
        },
        addCharacter(new_character) {
            let vm = this;
            let index = this.characters.push(new_character);
            watch(this.characters[index-1], function() {
                if (new_character.connection != null && new_character.connection.open) {
                    new_character.connection.send({
                        handshake:'displayCharacter',
                        game_token: vm.current_game.id,
                        character: vm.prepareCharacter(new_character)
                    });
                }
            });
        },
        editCharacter(character) {
            var foundIndex = this._current_game.characters.findIndex((element) => element.token === character.token)
            this._current_game.characters[foundIndex] = character;
        },
        retrieveCharacter(token) {
            if (this._current_game.characters.length == undefined) {
                return null;
            }
            else {
                return this._current_game.characters.find((element) => element.token === token);
            }
        },
        updateCharacters(characters = false) {
            let game = this._current_game;
            characters.forEach(function(character) {
                if (character.connection != null) {
                    character.connection.send({
                        handshake:'refresh',
                        game_token: game.id,
                    });
                }
            })
        },
        prepareCharacter(character) {
            let prepared_character = {...character};
            if (character.tags.length > 0 && character.tags.length > 0) {
                prepared_character.tags = character.tags.map(item => item.label);
            }
            delete prepared_character.connection;
            return prepared_character;
        },
        removeTagFromAll(deleted_tag) {
            this.characters.forEach(function(character) {
                let foundIndex = character.tags.findIndex(function(tag) {
                    if (tag.code === deleted_tag.code) {
                        return true;
                    }
                });
                if (foundIndex > -1) {
                    character.tags.splice(foundIndex, 1);
                }
            })
        },
        saveQuit() {
            let games = localStorage.getItem('games');
            if (games !== undefined) {
                games = JSON.parse(games);
                let found = games.findIndex((element) => element.id === this._current_game.id);
                if (found > -1) {
                    games[found] = this._current_game;
                }
            }
            else {
                games = {};
                games.push(this._current_game);
            }

            function replacer(key, value){
                if(key === 'characters') {
                    value.forEach(function(character) {
                        character.connection = null;
                    });
                    return value;
                }
                return value;
            }
            localStorage.setItem('games', JSON.stringify(games, replacer));
        },
        join(id) {
            let vm = this;
            let peer_client;
            let join_id = Math.floor(Math.random() * (10000000) + 1)

            peer_client = new Peer(join_id);
            localStorage.setItem('gm_id', id);

            peer_client.on('open', function () {
                let conn = peer_client.connect(id);

                conn.on('open', function() {
                    console.log('connection opened');
                    vm.setPeer(peer_client);
                    vm.setConnection(conn);
                    vm.setTempPeer(true);
                    router.push('/player');
                });

                conn.on('error', function(err) {
                    alert('error 1 :' + err.type + ' ' + err.message);
                });
            })

            peer_client.on('error', function(err) {
                if (err.type === 'unavailable-id') {
                    vm.setMessage('Identifiant déjà pris');
                }
                else if (err.type === 'peer-unavailable') {
                    peer_client.disconnect();
                    if (router.currentRoute.value.path === '/player') {
                        router.push('/join');
                        vm.setMessage('MJ déconnecté');
                    }
                    else {
                        vm.setMessage('MJ indisponible');
                    }
                }
                else if (err.type === 'network') {
                    if (router.currentRoute.value.path === '/player') {
                        router.push('/join');
                        vm.setMessage('Déconnexion imprévue');
                    }
                }
                else {
                    alert('erreur :' + err.type);
                }
            })
        }
    },
})

router.beforeEach((to, from, next) => {
    const store = usePlayerStore()
    console.log('route change');

    if (from.path === '/player' && to !== from && to.path !== '/join') {
        if (window.confirm("Si vous quittez cet onglet, votre connexion au MJ sera interrompue mais vous pourrez revenir dans la partie.")) {
            store._leaving = true;
            store.connection.close();
            next();
        }
        next(false)
        return ''
    }

    else if (from.path === '/admin' && to !== from) {
        if (window.confirm("Si vous quittez cet onglet, la partie sera interrompue après avoir été sauvegardée. " +
            "Souhaitez-vous vraiment quitter ?")) {
            localStorage.removeItem('temp_game');
            store.disconnectAll();
            store.saveQuit();
            next();
        }
        next(false)
        return ''
    }
    next();
})

export default router;

window.vm = app.mount('#app')