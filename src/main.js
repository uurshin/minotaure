import {createApp, watch} from 'vue'
import { createPinia, defineStore } from 'pinia'
import { createWebHashHistory, createRouter } from 'vue-router'
import { createI18n } from "vue-i18n";
import { Peer } from "peerjs";

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
    messages,
    warnHtmlMessage: false,
    warnHtmlInMessage: 'off',
    globalInjection: true
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
        _should_reconnect: -1,
        _reconnect_interval: null,
        _reconnect_timeout: null,
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
        should_reconnect: (state) => state._should_reconnect,
        current_game: (state) => state._current_game,
        characters: (state) => state._current_game.characters,
        alive_characters: (state) => state._current_game.characters.filter((character) => character.alive),
        picked_characters: (state) => state._current_game.picked_characters.filter((character) => character.picked),
        tag_groups: (state) => state._current_game.tag_groups,
        tag_groups_plus_targets: function(state) {
            if (state._current_game.has_picked) {
                let altered_group = [...state._current_game.tag_groups];
                altered_group.unshift({code: 'targets', label: 'Tirés au sort', tags: [{code: 'targets', label: 'Tirés au sort'}]});
                return altered_group;
            }
            else {
                return state._current_game.tag_groups;
            }
        },
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
            Object.fromEntries(Object.entries(state._current_game.polls)
            .filter((poll) => poll[1].active)
            .sort(function(a, b) {
                return b[0] - a[0];
            })) : [],
        past_polls: (state) => state._current_game.polls !== undefined ?
            Object.fromEntries(Object.entries(state._current_game.polls)
            .filter((poll) => !poll[1].active)
            .sort(function(a, b) {
                return b[0] - a[0];
            })) : []
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

            let code;
            do {
                code = tag_label.substring(0, 2) + Math.floor((Math.random() * 10000000));
            } while (this.tags.findIndex((tag) => tag.code === code) !== -1);

            const tag = {
                label: tag_label,
                code: code,
                color: [this.current_game.current_basic_color, 100, 40 + Math.floor(Math.random() * 40)],
                group: group.code
            }
            group.tags.push(tag);
            // Refresh the css rules to display the color fo the new tag.
            this.generateCss();
            return tag;
        },
        generateCss() {
            let game_css = document.getElementById('game_css');
            let css_str = '';
            this.tags.forEach((tag) => css_str += '.tag-' + tag.code + ' .label-name:before { background-color:hsl(' + tag.color[0] + ',' + tag.color[1] + '%' + ',' + tag.color[2] + '%)' + ' !important} ');
            game_css.innerHTML = css_str;
        },
        getStartGroupTags() {
            return this.tag_groups.filter((group) => group.start === 'start' && group.tags.length > 0);
        },
        getRandomGroupTags() {
            return this.tag_groups.filter((group) => group.start === 'random' && group.tags.length > 0);
        },
        getTagFromCode(code) {
            return this.tags.find((tag) => tag.code === code);
        },
        setShouldReconnect(value) {
            this._should_reconnect = value;
        },
        disconnectAll() {
            console.log('Minotaure : send gracefully disconnect to all connections');
            Object.values(this.connections).forEach(function(connection) {
                if (connection !== null) {
                    connection.send({handshake: 'disconnectGracefully'});
                    connection.close();
                }
            });
            this.peer.disconnect();
            this.peer.destroy();
        },
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
            let vm = this;
            for (const [key, gauge] of Object.entries(new_character.gauges)) {
                if (vm.gauges[key] !== undefined && vm.gauges[key].deadly && gauge.value <= 0) {
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
        retrieveCharacter(token) {
            if (this.current_game.characters.length === undefined) {
                return null;
            }
            else {
                return this.current_game.characters.find((element) => element.token === token);
            }
        },
        generateCharacter(data = null, conn = null) {
            const vm = this;
            let token = Math.random() + Math.random();
            let tags = [];
            let ranking_stat = [];

            // Gather the tags selected by the player.
            if (data != null) {
                data.choices.forEach(function(code) {
                    let found_tag = vm.getTagFromCode(code);
                    if (found_tag) {
                        tags.push(found_tag);
                    }
                });
            }

            this.getRandomGroupTags().forEach(function(group_tags) {
                let choice = group_tags.tags[Math.floor(Math.random() * group_tags.tags.length)];
                tags.push(choice);
            })

            let character = {
                game_name: this.current_game.name,
                token: token,
                name: data != null ? data.name : 'Perso ' + Math.floor(Math.random() * Math.random() * 100000),
                pseudo: data != null ? data.pseudo : null,
                stats: {},
                gauges: {},
                alive: true,
                challenge: {},
                polls: {},
                picked: false,
                connection: conn != null ? conn : false,
                watched: false,
            }

            // Roll the dices to determine the character's stats.
            // The sum of all dice rolls should be (10 * number of stats).
            let dice_rolls = [];
            let pool_max = 9; // Stores the distance between the last roll and 10.
            for(let i = 0; i < Object.keys(this.stats).length; ++i) {
                // The first roll is not corrected and serve has to base for the next roll corrections.
                if (i === 0) {
                    let roll = Math.floor(Math.random() * pool_max);
                    pool_max = - roll;
                    dice_rolls.push(10 + roll);
                }
                // Each roll between the first and the last rolls are corrected.
                // That prevents producing often a single extreme last roll (closer to 1 or 20).
                else if (i < Object.keys(this.stats).length - 1) {
                    let roll = Math.floor(Math.random() * pool_max);
                    pool_max = pool_max - roll;
                    dice_rolls.push(10 + roll);
                }
                // The last roll is corrected to make the sum of all rolls equal to (10 * number of stats).
                else {
                    dice_rolls.push(10 + pool_max);
                }
            }

            // Determine if some tags have stat priorities.
            tags.forEach(function(tag) {
                if (tag.stat1 && ranking_stat[0] === undefined) {
                    ranking_stat[0] = tag.stat1;
                }
                if (tag.stat2 && ranking_stat[1] === undefined) {
                    ranking_stat[1] = tag.stat2;
                }
            });

            // Store the two best dice rolls so they can be assigned to tags that prioritize these stats.
            dice_rolls.sort(function(a, b){return a - b})
            let max_rolls = [];
            if (ranking_stat[0] !== undefined) {
                max_rolls.push(dice_rolls.pop());
            }
            if (ranking_stat[1] !== undefined) {
                max_rolls.push(dice_rolls.pop());
            }

            // Distribution of the rolls for each stat.
            for (const [key, stat] of Object.entries(this.stats)) {
                let die_choice;
                if (max_rolls[0] !== undefined && ranking_stat[0] === key) {
                    die_choice = max_rolls[0];
                }
                else if (max_rolls[1] !== undefined && ranking_stat[1] === key) {
                    die_choice = max_rolls[1];
                }
                else {
                    let choice = Math.floor(dice_rolls.length * Math.random());
                    die_choice = dice_rolls.splice(choice, 1)[0]
                }
                character.stats[key] = {label: stat.name, value: die_choice}
            }

            for (const [key, gauge] of Object.entries(this.gauges)) {
                character.gauges[key] = {label: gauge.name, value: gauge.value}
            }

            // Apply tag modifiers to stats and gauges.
            tags.forEach(function(tag) {
                if (tag.stat_modifiers !== undefined) {
                    for (const [key, stat] of Object.entries(tag.stat_modifiers)) {
                        if (character.stats[key] !== undefined) {
                            character.stats[key].value += stat.value;
                            if (character.stats[key].value <= 0) {
                                character.stats[key].value = 1;
                            }
                        }
                    }
                }
                if (tag.gauge_modifiers !== undefined) {
                    for (const [key, gauge] of Object.entries(tag.gauge_modifiers)) {
                        if (character.gauges[key] !== undefined) {
                            character.gauges[key].value += gauge.value;
                            if (character.gauges[key].value <= 0) {
                                character.gauges[key].value = 1;
                            }
                        }
                    }
                }
            });
            character.tags = tags;

            this.addCharacter(character);
            return character;
        },
        generateCharacters(nb) {
            for (let i = 0 ; i < nb ; i++) {
                let character = this.generateCharacter();
                let retrieved_character = this.retrieveCharacter(character.token);
                if (!retrieved_character.watched) {
                    retrieved_character.watched = true;
                    watch(retrieved_character, this.characterWatch);
                }
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
        filterCharacterByTagsAndPicked(character, chosen_tags) {
            // Todo separate UX
            if (chosen_tags.findIndex((tag) => tag.code === 'targets') > -1) {
                return (character.picked !== undefined && character.picked);
            }
            else {
                return(
                    character.tags.find(
                        (tag) => chosen_tags.find((chosen_tag) => chosen_tag.code === tag.code)
                    )
                )
            }
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
            this.setShouldReconnect(0);
            let vm = this;
            let peer_client;
            let attempting_reconnect = false;
            let join_id = Math.floor(Math.random() * (10000000) + 1)
            peer_client = new Peer(join_id);
            localStorage.setItem('gm_id', id);

            peer_client.on('open', function () {
                let conn = peer_client.connect(id);
                vm.stopReconnect();

                conn.on('open', function() {
                    console.log('Minotaure : connection opened');
                    vm.setShouldReconnect(0);
                    vm.setPeer(peer_client);
                    vm.setConnection(conn);

                    if (set_temp_peer) {
                        vm.setTempPeer(true);
                    }
                    router.push('/player');
                });

                conn.on('error', function(err) {
                    console.log('Minotaure : error - ' + err.type + ' ' + err.message);
                });
            })

            peer_client.once("disconnected", function(){
                vm.stopReconnect();
                console.log('Minotaure : peer client disconnected');
                if (vm.should_reconnect === -1) {
                    console.log('Minotaure : Disconnected but should not reconnect');
                    peer_client.destroy();
                }
                else if (vm.should_reconnect === 0) {
                    vm.setMessage('Minotaure - starting attempts to reconnect after disconnect');
                    attempting_reconnect = true;
                    let interval = setInterval(function() {
                        if (vm.should_reconnect === -1) {
                            console.log('Minotaure : Disconnected but should not reconnect');
                            peer_client.destroy();
                            attempting_reconnect = false;
                        }
                        else {
                            if (peer_client.open === true) {
                                console.log('Minotaure : reconnection attempt successful :) !');
                                router.push('/player');
                                attempting_reconnect = false;
                            }
                            else if (peer_client.destroyed === true) {
                                console.log('Minotaure : reconnection attempt unsuccessful :( !');
                                attempting_reconnect = false;
                            }
                            else if (vm.should_reconnect < 10) {
                                vm.setShouldReconnect(vm.should_reconnect + 1);
                                console.log('Minotaure : reconnection attempt number ' + vm.should_reconnect);
                                peer_client.reconnect();
                            }
                            else if (router.currentRoute.value.path === '/player') {
                                router.push('/join');
                                vm.setMessage('Déconnexion imprévue');
                                attempting_reconnect = false;
                            }

                            if (!attempting_reconnect) {
                                clearInterval(interval);
                                vm.setShouldReconnect(0);
                            }
                        }
                        },
                        3000
                    )
                }
            });

            peer_client.on('error', function(err) {
                console.log('Minotaure : peer received error - ' + err.type);

                if (err.type === 'peer-unavailable') {
                    if (this.should_reconnect > 0) {
                        if (router.currentRoute.value.path === '/player') {
                            router.push('/join');
                            vm.setMessage('MJ déconnecté');
                        }
                        else {
                            vm.setMessage('MJ indisponible');
                        }
                    }
                    else {
                        vm.setMessage('MJ indisponible');
                    }
                }
            })
        },
        setPickedCharacters(picked_characters) {
            picked_characters.forEach((character) => character.picked = true);
        },
        resetPickedCharacters() {
            this.current_game.has_picked = false;
            this.characters.map(function (character) {
                if (character.picked) {
                    character.picked = false;
                }
            });
        },
        getRandom(arr, n) {
            let result = new Array(n);
            let len = arr.length;
            let taken = new Array(len);
            if (n > len) {
                n = len;
            }
            while (n--) {
                var x = Math.floor(Math.random() * len);
                result[n] = arr[x in taken ? taken[x] : x];
                taken[x] = --len in taken ? taken[len] : len;
            }
            return result;
        },
        // Reconnects the player after the connection closed, in 1s if possible, or repeat until 10s.
        startReconnect() {
            const vm = this;
            vm.setMessage('Minotaure - starting attempts to reconnect after connection closed.');
            this._reconnect_timeout = setTimeout(function() {
                console.log('Minotaure : reconnection attempts unsuccessful');
                vm.stopReconnect();
            }, 10000);
            this._reconnect_interval = setInterval(function() {
                console.log('Minotaure : trying to reconnect after connection closed');
                vm.join(vm.connection.peer, true);
            }, 2000);
        },
        // Interrupts reconnection attempts after connection closed (it's not related to peer disconnection).
        stopReconnect() {
            clearInterval(this._reconnect_interval);
            clearInterval(this._reconnect_timeout);
        }
    },
})

router.beforeEach((to, from, next) => {
    const store = usePlayerStore()

    if (to.path === '/admin') {
        document.getElementsByClassName('main-wrapper')[0].classList.add('wide');
    }

    if (from.path === '/player' && to !== from && to.path !== '/join') {
        if (window.confirm("Si vous quittez cet onglet, votre connexion au MJ sera interrompue mais vous pourrez revenir dans la partie.")) {
            store._leaving = true;
            if (store.connection !== null) {
                store.connection.close();
            }
            next();
        }
        next(false);
        return ''
    }

    else if (from.path === '/admin' && to !== from) {
        if (store.current_game !== null) {
            if (window.confirm("Si vous quittez cet onglet, la partie sera interrompue après avoir été sauvegardée. " +
                "Souhaitez-vous vraiment quitter ?")) {
                localStorage.removeItem('temp_game');
                store.disconnectAll();
                store.saveQuit();
                document.getElementsByClassName('main-wrapper')[0].classList.remove('wide');
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