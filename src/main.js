import {createApp, watch} from 'vue'
import { createPinia, defineStore } from 'pinia'
import { createWebHashHistory, createRouter } from 'vue-router'
import { createI18n } from "vue-i18n";

import messages from '@intlify/unplugin-vue-i18n/messages'

import Main from './components/Main.vue'
import Home from './components/Home.vue'
import Create from './components/Create.vue'
import Join from './components/Join.vue'
import Admin from './components/Admin.vue'
import Player from './components/Player.vue'
import Continue from './components/Continue.vue'
import Characters from './components/Characters.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', redirect: '/home'},
        { path: '/home', component: Home },
        { path: '/create', component: Create },
        { path: '/join', component: Join },
        { path: '/admin', component: Admin },
        { path: '/player', component: Player },
        { path: '/continue', component: Continue },
        { path: '/characters', component: Characters },
    ],
})

const i18n = createI18n({
    legacy: false,
    locale: (Intl.DateTimeFormat().resolvedOptions().locale !== undefined ? Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2) : 'fr'),
    fallbackLocale: 'en', // fallback locale
    messages
})

const app = createApp(Main)
app.use(i18n)
app.use(createPinia())
app.use(router)

window.vm = app.mount('#app')

export const usePlayerStore = defineStore('playerStore', {
    state: () => ({
        _user_peer: null,
        _player_connection: null,
        _current_game: null,
        _leaving: false,
        _temp_peer: null,
        _connections: {},
        _message: '',
        _temp_connections: [],
        _last_challenge: {
            date: 0,
            nb_bonus: 0,
            nb_malus: 0,
            nb_target: 0
        }
    }),
    getters: {
        peer: (state) => state._user_peer,
        connection : (state) => state._player_connection,
        connections : (state) => state._connections,
        current_game: (state) => state._current_game,
        characters: (state) => state._current_game.characters,
        alive_characters: (state) => state._current_game.characters.filter((character) => character.alive),
        tag_groups: (state) => state._current_game.tag_groups,
        stats: (state) => state._current_game.stats,
        gauges: (state) => state._current_game.gauges,
        leaving: (state) => state._leaving,
        temp_peer: (state) => state._temp_peer,
        temp_connections: (state) => state._temp_connections,
        message: (state) => state._message,
        last_challenge: (state) => state._last_challenge,
        tags(state) {
            let flatten_tags = [];
            if (state._current_game.tag_groups !== undefined) {
                state._current_game.tag_groups.forEach(function(tag_group) {
                    flatten_tags = [...flatten_tags, ...tag_group.tags];
                });
            }
            return flatten_tags;
        },
        polls: (state) => state._current_game.polls,
        active_polls: (state) => state._current_game.polls !== undefined ?
            Object.entries(state._current_game.polls)
            .filter((poll) => poll[1].active)
            .sort(function(a, b) {
                return b[0] - a[0];
            }) : [],
        past_polls: (state) => state._current_game.polls !== undefined ?
            Object.entries(state._current_game.polls)
            .filter((poll) => !poll[1].active)
            .sort(function(a, b) {
                return b[0] - a[0];
            }) : []
    },
    actions: {
        connected_characters(alive = false) {
            const temp = this;
            return this.current_game.characters.filter(function(character) {
                return (
                    (alive ? character.alive : true) &&
                    character.connection !== null &&
                    temp.connections[character.connection] !== undefined &&
                    temp.connections[character.connection].open
                )
            })
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
        addTag: function(tag_label, group) {
            if (this.current_game.current_basic_color === undefined) {
                this.current_game.current_basic_color = 0;
                this.current_game.basic_color = 0;
            }
            this.current_game.current_basic_color += 40;

            if (this.current_game.current_basic_color > 360) {
                this.current_game.basic_color += 15;
                this.current_game.current_basic_color = this.current_game.basic_color;
            }

            const tag = {
                label: tag_label,
                code: tag_label.substring(0, 2) + Math.floor((Math.random() * 10000000)),
                color: [this.current_game.current_basic_color, 100, 40 + Math.floor(Math.random() * 40)],
                group: group.code
            }
            // Todo recherche si code déjà existant.
            group.tags.push(tag);
            this.generateCss();
            return tag;
        },
        generateCss() {
            let game_css = document.getElementById('game_css');
            let css_str = '';
            this.tags.forEach((tag) => css_str += '.tag-' + tag.code + ' .label-name:before { background-color:hsl(' + tag.color[0] + ',' + tag.color[1] + '%' + ',' + tag.color[2] + '%)' + ' !important} ');
            game_css.innerHTML = css_str;
        },
        getStartTags() {
            return this.tag_groups.filter((group) => group.start === 'start' && group.tags.length > 0);
        },
        getRandomTags() {
            return this.tag_groups.filter((group) => group.start === 'random' && group.tags.length > 0);
        },
        getTagFromCode(code) {
            return this.tags.find((tag) => tag.code === code);
        },
        setConnections(connections) {
            this._connections = connections;
        },
        disconnectAll() {
            Object.values(this.connections).forEach(function(connection) {
                if (connection != null) {
                    console.log('trigger deco');
                    connection.close();
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
        addCharacter(new_character) {
            this.characters.push(new_character);
        },
        characterWatch(new_character) {
            console.log('characterWatch');
            let vm = this;
            for (const [key, gauge] of Object.entries(new_character.gauges)) {
                if (vm.gauges[key].deadly && gauge.value <= 0) {
                    new_character.gauges[key].value = 0;
                    new_character.alive = false;
                }
            }
            if (new_character.connection !== undefined && new_character.connection != null) {
                if (
                    vm.connections[new_character.connection] !== undefined &&
                    vm.connections[new_character.connection].open
                ) {
                    vm.connections[new_character.connection].send({
                        handshake: 'displayCharacter',
                        game_token: vm.current_game.id,
                        character: vm.prepareCharacter(new_character)
                    });
                }
            }
        },
        editCharacter(character) {
            var foundIndex = this.current_game.characters.findIndex((element) => element.token === character.token)
            this.current_game.characters[foundIndex] = character;
        },
        retrieveCharacter(token) {
            if (this.current_game.characters.length === undefined) {
                return null;
            }
            else {
                return this.current_game.characters.find((element) => element.token === token);
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
        generateCharacter(data = null, conn = null) {
            const vm = this;
            let token = Math.random() + Math.random();
            let tags = [];
            let ranking_stat = [];
            if (data != null) {
                data.choices.forEach(function(code) {
                    let found_tag = vm.getTagFromCode(code);
                    if (found_tag) {
                        tags.push(found_tag);
                        if (found_tag.stat1) {
                            ranking_stat[0] = found_tag.stat1;
                        }
                        if (found_tag.stat2) {
                            ranking_stat[1] = found_tag.stat2;
                        }
                        // TODO modifiers
                    }
                });
            }

            this.getRandomTags().forEach(function(group_tags) {
                let choice = group_tags.tags[Math.floor(Math.random() * group_tags.tags.length)];
                tags.push(choice);
            })

            let character = {
                game_name: this.current_game.name,
                token: token,
                tags: tags,
                stats: {},
                name: data != null ? data.name : 'Perso ' + Math.floor(Math.random() * Math.random() * 100000),
                pseudo: data.pseudo,
                gauges: {},
                alive: true,
                challenge: {},
                polls: {},
                connection: conn != null ? conn : false,
                watched: false,
            }

            // Lancés de dés équilibrés de manière à faire un total de 10 x nombre de caracs.
            let dice_throws = [];
            let pool_max = 9;
            for(let i = 0; i < Object.keys(this.stats).length; ++i) {
                if (i === 0) {
                    let pool_throw = Math.floor(Math.random() * pool_max);
                    pool_max = - pool_throw;
                    dice_throws.push(10 + pool_throw);
                }
                else if (i === Object.keys(this.stats).length - 1) {
                    dice_throws.push(10 + pool_max);
                }
                else {
                    let pool_throw = Math.floor(Math.random() * pool_max);
                    pool_max = pool_max - pool_throw;
                    dice_throws.push(10 + pool_throw);
                }
            }

            // Stockage des 2 meilleurs lancers pour les tags qui privilégient des caracs.
            dice_throws.sort(function(a, b){return a - b})
            let max_throws = [];
            if (ranking_stat[0] !== undefined) {
                max_throws.push(dice_throws.pop());
            }
            if (ranking_stat[1] !== undefined) {
                max_throws.push(dice_throws.pop());
            }

            // Répartition des lancers dans les caractéristiques.
            for (const [key, stat] of Object.entries(this.stats)) {
                let die_choice;
                if (max_throws[0] !== undefined && ranking_stat[0] === key) {
                    die_choice = max_throws[0];
                }
                else if (max_throws[1] !== undefined && ranking_stat[1] === key) {
                    die_choice = max_throws[1];
                }
                else {
                    let choice = Math.floor(dice_throws.length * Math.random());
                    die_choice = dice_throws.splice(choice, 1)[0]
                }
                character.stats[key] = {label: stat.name, value: die_choice}
            }

            for (const [key, gauge] of Object.entries(this.gauges)) {
                character.gauges[key] = {label: gauge.name, value: gauge.value}
            }
            this.addCharacter(character);
            return character;
        },
        generateCharacters(nb) {
            for (let i = 0 ; i < nb ; i++) {
                this.generateCharacter();
            }
        },
        prepareCharacter(character) {
            // Future manipulation of character.
            return character;
        },
        filterCharacterByTags(character, chosen_tags) {
            return(
                character.tags.find(
                    (tag) => chosen_tags.find((chosen_tag) => chosen_tag.code === tag.code)
                )
            )
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
        pollAddAnswer(code, answer) {
            if (this.polls[code] !== undefined && this.polls[code].options[answer] !== undefined && this.polls[code].active) {
                this.polls[code].options[answer].count += 1;
            }
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

            localStorage.setItem('games', JSON.stringify(games));
        },
        join(id, set_temp_peer = false) {
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

                    if (set_temp_peer) {
                        console.log('temp peer is set');
                        vm.setTempPeer(true);
                    }
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

    if (to.path === '/admin') {
        document.getElementsByClassName('main-wrapper')[0].classList.add('wide');
    }
    else {
        document.getElementsByClassName('main-wrapper')[0].classList.remove('wide');
    }

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
        if (store.current_game !== null) {
            if (window.confirm("Si vous quittez cet onglet, la partie sera interrompue après avoir été sauvegardée. " +
                "Souhaitez-vous vraiment quitter ?")) {
                localStorage.removeItem('temp_game');
                store.disconnectAll();
                store.saveQuit();
                next();
            }
        }
        else {
            localStorage.removeItem('temp_game');
            next();
        }

        next(false)
        return ''
    }
    next();
})

export default router;