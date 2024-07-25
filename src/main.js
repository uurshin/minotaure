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

window.vm = app.mount('#app');

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
        _temp_connections: []
    }),
    getters: {
        peer: (state) => state._user_peer,
        connection : (state) => state._player_connection,
        connections : (state) => state._connections,
        should_reconnect: (state) => state._should_reconnect,
        current_game: (state) => state._current_game,
        characters: (state) => state._current_game.characters,
        alive_characters: (state) => state._current_game.characters.filter((character) => character.alive),
        picked_characters: (state) => state._current_game.characters.filter((character) => character.picked),
        tag_groups: (state) => state._current_game.tag_groups,
        tag_groups_plus_targets: function(state) {
            if (this.picked_characters.length) {
                let altered_group = [...state._current_game.tag_groups];
                altered_group.unshift({code: 'targets', label: i18n.global.t('selected'), tags: [{code: 'targets', label: i18n.global.t('selected')}]});
                return altered_group;
            }
            else {
                return state._current_game.tag_groups;
            }
        },
        stats: (state) => state._current_game.stats,
        gauges: (state) => state._current_game.gauges,
        markers: (state) => state._current_game.markers,
        settings: (state) => state._current_game.settings,
        leaving: (state) => state._leaving,
        temp_peer: (state) => state._temp_peer,
        temp_connections: (state) => state._temp_connections,
        message: (state) => state._message,
        last_challenge: (state) => state._current_game.challenges !== undefined ? state.challenges[state.challenges.length - 1] : undefined,
        tags(state) {
            let flatten_tags = [];
            if (state._current_game.tag_groups !== undefined) {
                state._current_game.tag_groups.forEach(function(tag_group) {
                    flatten_tags = [...flatten_tags, ...tag_group.tags];
                });
            }
            return flatten_tags;
        },
        challenges: (state) => state._current_game.challenges,
        polls: (state) => state._current_game.polls,
        active_polls: (state) => state._current_game.polls !== undefined ?
            Object.fromEntries(Object.entries(state._current_game.polls)
            .filter((poll) => poll[1].active === 1)
            .sort(function(a, b) {
                return b[0] - a[0];
            })) : [],
        drafted_polls: (state) => state._current_game.polls !== undefined ?
            Object.fromEntries(Object.entries(state._current_game.polls)
                .filter((poll) => poll[1].active === 0)
                .sort(function(a, b) {
                    return a[0] - b[0];
                })) : [],
        past_polls: (state) => state._current_game.polls !== undefined ?
            Object.fromEntries(Object.entries(state._current_game.polls)
            .filter((poll) => poll[1].active === -1)
            .sort(function(a, b) {
                return b[0] - a[0];
            })) : [],
    },
    actions: {
        getPeerOptions() {
            let self_host = localStorage.getItem('self_host');
            if (self_host !== null) {
                return {
                    host: "localhost",
                    port: 9000,
                    path: "/myapp"
                }
            }
            return {}
        },
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
            group.picking_array.push(tag.code);

            // Refresh the css rules to display the color fo the new tag.
            this.generateCss();
            return tag;
        },
        addGroupTag(freetag = false) {
            let group = {
                tags: [],
                picking_array: [],
                label: freetag ? i18n.global.t('other_tags') : i18n.global.t('group_nb', {nb: this.tag_groups.length + 1})
            }
            group.code = freetag ? 'freetag' : (this.tag_groups.length ? this.tag_groups[this.tag_groups.length - 1].code : 0) + Math.floor(Math.random() * 10000000);
            group.start =  freetag ? 'none' : 'random';
            this.tag_groups.push(group);
            return group;
        },
        generateCss() {
            let game_css = document.getElementById('game_css');
            let css_str = '';
            this.tags.forEach((tag) => css_str += '.tag-' + tag.code + ' .label-name:before { background-color:hsl(' + tag.color[0] + ',' + tag.color[1] + '%' + ',' + tag.color[2] + '%)' + ' !important} ');
            game_css.innerHTML = css_str;
        },
        getGroupTags() {
            return this.tag_groups;
        },
        getStartGroupTags() {
            return this.tag_groups.filter((group) => group.start === 'start' && group.tags.length > 0);
        },
        getRandomGroupTags() {
            return this.tag_groups.filter((group) => (group.start === 'random' || group.start === 'equitable') && group.tags.length > 0);
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
        /**
         * Add a new character to the store.
         * @param {object} character : the character to add.
         */
        addCharacter(character) {
            this.characters.push(character);
        },
        /**
         * Control and send the current version of a character to the connected
         * player.
         * @param {object} character : the character to target.
         */
        characterWatch(character) {
            let vm = this;
            // If the tags, base gauges or base stats of the character have been
            // modified, we need to control and maybe update some data.
            this.limitCharacter(character);
            if (character.connection !== undefined && character.connection != null) {
                if (
                  vm.connections[character.connection] !== undefined &&
                  vm.connections[character.connection].open
                ) {
                    vm.connections[character.connection].send({
                        handshake: 'displayCharacter',
                        game_token: vm.current_game.id,
                        character: character
                    });
                }
            }
        },
        /**
         * Alter the tags, stats and gauges of a character to be valid.
         * This method is called by a watcher and use character.recalculate to
         * avoid infinite loop to the modification of the character's data.
         * @param {object} character : the character to alter.
         * @param {boolean} creation : are we creating the character ?
         */
        limitCharacter(character, creation = false) {
            if (character.recalculate === 1 || creation) {
                let vm = this;
                character.recalculate = 0;
                let modifiers_stats = {};

                // Sort the character's tags by group order.
                character.tags.sort(function(a, b) {
                    if (a.group < b.group) {
                        return -1;
                    }
                    else if (a.group > b.group) {
                        return 1;
                    }
                    return 0;
                });

                // Calculate the bonuses for stats values given by each tag of
                // the character.
                character.tags.forEach(function (tag) {
                    if (tag.stat_modifiers !== undefined) {
                        for (const [key, stat] of Object.entries(tag.stat_modifiers)) {
                            modifiers_stats[key] = (modifiers_stats[key] ?? 0) + stat.value;
                        }
                    }
                });

                // Update the character gauges values.
                for (const [key, gauge] of Object.entries(character.gauges)) {
                    if (vm.gauges[key] !== undefined) {
                        if (gauge.value <= 0) {
                            if (vm.gauges[key].deadly) {
                                // Characters should not die instantly when created.
                                if (creation) {
                                    character.gauges[key].value = 1;
                                }
                                else {
                                    character.gauges[key].value = 0;
                                    character.alive = false;
                                }
                            }
                            else {
                                character.gauges[key].value = 0;
                            }
                        }
                        else if (vm.gauges[key].max !== '' && gauge.value > vm.gauges[key].max) {
                            character.gauges[key].value = vm.gauges[key].max;
                        }
                    }
                }
                // Update the character stats values.
                for (const [key, stat] of Object.entries(character.stats)) {
                    let temp_stat_value = character.base_stats[key];
                    if (modifiers_stats[key] !== undefined) {
                        temp_stat_value += modifiers_stats[key];
                    }

                    if (vm.stats[key] !== undefined) {
                        // Stats values should always be > 1 and <= 20.
                        if (temp_stat_value <= 0) {
                            character.stats[key].value = 1;
                        }
                        else if (temp_stat_value > 20) {
                            character.stats[key].value = 20;
                        }
                        else {
                            character.stats[key].value = temp_stat_value;
                        }
                    }
                }
            }
        },
        /**
         * Retrieve the character associated with a token
         * @param {string} token
         * @return {object | null} the character found, or null if not found.
         */
        retrieveCharacter(token) {
            if (this.current_game.characters.length === undefined) {
                return null;
            }
            else {
                return this.current_game.characters.find((element) => element.token === token);
            }
        },
        /**
         * Generate a character.
         * @param {object} data : data already choosen by the player.
         * If data is null, it creates a npc with a random name.
         * @param {object} conn : a DataConnection from the peerjs library
         * @return {object} a new character.
         */
        generateCharacter(data = null, conn = null) {
            const vm = this;
            let token = Math.random() + Math.random();
            let tags = [];
            let ranking_stat = [];

            let character = {
                game_name: this.current_game.name,
                token: token,
                name: data != null ? data.name : 'Perso ' + Math.floor(Math.random() * Math.random() * 100000),
                pseudo: data != null ? data.pseudo : i18n.global.t('non_player'),
                stats: {},
                gauges: {},
                base_stats: {},
                alive: true,
                challenge: {},
                polls: {},
                picked: false,
                connection: conn != null ? conn : false,
                watched: false,
            }

            // Gather the tags selected by the player.
            if (data !== null) {
                data.choices.forEach(function(code) {
                    let found_tag = vm.getTagFromCode(code);
                    if (found_tag) {
                        tags.push(found_tag);
                    }
                });
            }
            else {
                this.getStartGroupTags().forEach(function(group) {
                    tags.push(vm.getRandomTagFromGroup(group));
                })
                character.npc = true;
            }

            // Choose one tag for each random tag group.
            this.getRandomGroupTags().forEach(function(group) {
                tags.push(vm.getRandomTagFromGroup(group));
            })

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
                character.base_stats[key] = character.stats[key].value;
            }

            for (const [key, gauge] of Object.entries(this.gauges)) {
                character.gauges[key] = {label: gauge.name, value: gauge.value, deadly: this.gauges[key].deadly ?? false}
            }

            // Apply tag modifiers to stats and gauges.
            character.tags = [];
            tags.forEach(function(tag) {
                vm.addTagToCharacter(character, tag);
            })

            // Get the gauges and stats back in the allowed limits.
            this.limitCharacter(character, true);
            this.addCharacter(character);

            return character;
        },
        /**
         * Generate a given number of npc characters.
         * @param {int} nb : the amount to generate.
         */
        generateNpcCharacters(nb) {
            for (let i = 0 ; i < nb ; i++) {
                let character = this.generateCharacter();
                let retrieved_character = this.retrieveCharacter(character.token);
                if (!retrieved_character.watched) {
                    retrieved_character.watched = true;
                    watch(retrieved_character, this.characterWatch);
                }
            }
        },
        /**
         * Retrieve a list of characters filtered by conditions.
         * @param {boolean} alive : the character is alive.
         * @param {boolean} connected : a player is connected to the character.
         * @param {boolean} npc : the character is a npc.
         */
        getCharacters(alive = true, connected = true, npc = true) {
            const vm = this;
            return this.characters.filter(
              function (character) {
                  return (
                    (alive ? character.alive : true) &&
                    (connected ? (
                      character.npc !== undefined ||
                      (character.connection !== null &&
                      vm.connections[character.connection] !== undefined &&
                      vm.connections[character.connection].open === true)
                    ) : true) &&
                    (npc ? character.npc === undefined : true)
                  )
              })
        },
        /**
         * Search all characters for the ones with a specific tag. Update their gauge value.
         * @param {object} target_tag : the searched tag.
         * @param {int} modifier : the modified value.
         */
        updateGaugeModifier(target_tag, key, modifier) {
            this.characters.forEach(function(character) {
                let foundIndex = character.tags.findIndex(function(tag) {
                    if (tag.code === target_tag.code) {
                        return true;
                    }
                });
                if (foundIndex > -1) {
                    character.gauges[key].value += modifier;
                    character.recalculate = 1;
                }
            })
        },
        updateStatModifier(target_tag) {
            this.characters.forEach(function(character) {
                let foundIndex = character.tags.findIndex(function(tag) {
                    if (tag.code === target_tag.code) {
                        return true;
                    }
                });
                if (foundIndex > -1) {
                  character.recalculate = 1;
                }
            })
        },
        /**
         * Delete a specific tag from a character tag list if they already have it.
         * @param {object} character : the character to target.
         * @param {object} target_tag : the tag to delete.
         * @param {boolean} inverse_modifier : if true, the gauges bonuses of
         * the tag will be reversed on the character.
         */
        removeTagFromCharacter(character, target_tag, inverse_modifier= false) {
            let found = character.tags.findIndex((tag) => tag.code === target_tag.code);
            if (found > -1) {
                character.tags.splice(found, 1);
                if (inverse_modifier) {
                    if (target_tag.gauge_modifiers !== undefined) {
                        for (const [key, gauge_modifier] of Object.entries(target_tag.gauge_modifiers)) {
                            character.gauges[key].value -= gauge_modifier.value;
                        }
                    }
                }
                character.recalculate = 1;
            }
            return (found > -1);
        },
        /**
         * Add a specific tag to a character tag list if they already have it.
         * @param {object} character : the character to target.
         * @param {object} target_tag : the tag to add.
         */
        addTagToCharacter(character, target_tag) {
            let found = character.tags.findIndex((tag) => tag.code === target_tag.code);
            if (found === -1) {
                if (target_tag.gauge_modifiers !== undefined) {
                    for (const [key, gauge_modifier] of Object.entries(target_tag.gauge_modifiers)) {
                        character.gauges[key].value += gauge_modifier.value;
                    }
                }
                character.tags.push(target_tag);
                character.recalculate = 1;
            }
            return (found === -1);
        },
        /**
         * Modify a base gauge value of a character.
         * @param {object} character : the character to target.
         * @param {string} key : the gauge's key.
         * @param {int} modifier : the bonus or malus to add.
         */
        modifyGaugeCharacter(character, key, modifier) {
            character.gauges[key].value += modifier;
            character.recalculate = 1;
        },
        /**
         * Modify a base stat value of a character.
         * @param {object} character : the character to target.
         * @param {string} key : the stat's key.
         * @param {int} modifier : the bonus or malus to add.
         */
        modifyStatCharacter(character, key, modifier) {
            character.base_stats[key] += modifier;
            character.recalculate = 1;
        },
        filterCharacterByTagsAndPicked(character, chosen_tags, select_picked = false) {
            let is_picked = false;
            if (select_picked) {
                is_picked = (character.picked !== undefined && character.picked);
            }
            if (!is_picked) {
                return(
                    character.tags.find(
                        (tag) => chosen_tags.find((chosen_tag) => chosen_tag.code === tag.code)
                    )
                )
            }
            else {
                return true;
            }
        },
        getRandomTagFromGroup(group) {
            // Remove an instance of this tag code from the pool so that it's now less probable to pick.
            let random_number = Math.floor(Math.random() * group.picking_array.length);
            let choice_index;
            if (group.start === 'equitable') {
                if (group.picking_array.length === 0) {
                    group.tags.forEach(function(tag) {
                        for (let i = 0; i < (tag.probability ?? 1); i++) {
                            group.picking_array.push(tag.code);
                        }
                    })
                }

                choice_index = group.picking_array.splice(random_number, 1)[0];
            }
            else {
                if (group.picking_array.length < group.tags.length) {
                    group.picking_array = [];
                    group.tags.forEach(function(tag) {
                        for (let i = 0; i < (tag.probability ?? 1); i++) {
                            group.picking_array.push(tag.code);
                        }
                    })
                }
                choice_index = group.picking_array[random_number];
            }

            // Add the tag to the selected array of tags selected for the new characters.
            return group.tags.find((tag) => tag.code === choice_index);
        },
        removeTagFromAll(deleted_tag) {
            const vm = this;
            this.characters.forEach(function(character) {
                let foundIndex = character.tags.findIndex(function(tag) {
                    if (tag.code === deleted_tag.code) {
                        return true;
                    }
                });
                if (foundIndex > -1) {
                    vm.removeTagFromCharacter(character, deleted_tag);
                }
            })
        },
        pollAddAnswer(code, answer) {
            if (this.polls[code] !== undefined && this.polls[code].options[answer] !== undefined && this.polls[code].active === 1) {
                this.polls[code].options[answer].count += 1;
            }
        },
        addChallenge(challenge) {
            challenge.date = Date.now();
            challenge.nb_success = 0;
            challenge.nb_failure = 0;
            challenge.nb_target = 0;
            challenge.active = true;
            challenge.timer = this.current_game.settings.challenge_timer ?? 15;
            this.challenges.push(challenge);
            this.last_challenge.interval = setInterval(
                this.challengeTimerIncrement
              , 1000)
        },
        challengeTimerIncrement() {
            const vm = this;
            if (vm.last_challenge.timer === 0 || (vm.last_challenge.nb_success + vm.last_challenge.nb_failure === vm.last_challenge.nb_targets)) {
                clearInterval(vm.last_challenge.interval);
                vm.rollRemaining();
                vm.groupConsequencesResolve();
            }
            else {
                vm.last_challenge.timer -= 1;
            }
        },
        groupConsequencesResolve() {
            const vm = this;
            let challenge = this.last_challenge;
            let rate = Math.floor(100 / challenge.nb_targets * challenge.nb_success);

            let result = '';
            if (challenge.scale instanceof Array) {
                if (rate > challenge.scale[1]) {
                    result = 'success'
                }
                else if (rate > challenge.scale[0]) {
                    result = 'neutral'
                }
                else {
                    result = 'failure'
                }
            }
            else if (rate >= challenge.scale) {
                result = 'success'
            }
            else {
                result = 'failure';
            }

            if (challenge.marker_group_modifier !== undefined && challenge.marker_group_modifier[result] !== undefined) {
                for (const [key, bonus] of Object.entries(challenge.marker_group_modifier[result])) {
                    if (vm.markers[key] !== undefined) {
                        vm.markers[key].value += bonus;
                    }
                }
            }

            this.alive_characters.forEach(
                function(character) {
                    if (character.challenge !== undefined && character.challenge.roll !== undefined) {
                        if (character.challenge.message === undefined) {
                            character.challenge.message = [];
                        }
                        character.challenge.message.push(i18n.global.t('result_group_' + result));

                        if (challenge.gauge_group_modifier[result] !== undefined) {
                            for (const [key, bonus] of Object.entries(challenge.gauge_group_modifier[result])) {
                                character.challenge.message.push(i18n.global.t('result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: bonus, name: vm.gauges[key].name}));
                                character.gauges[key].value += bonus;
                            }
                        }
                        if (challenge.stat_group_modifier[result] !== undefined) {
                            for (const [key, bonus] of Object.entries(challenge.stat_group_modifier[result])) {
                                character.challenge.message.push(i18n.global.t('result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: bonus, name: vm.stats[key].name}));
                                character.base_stats[key] += bonus;
                            }
                        }
                        if (challenge.marker_group_modifier[result] !== undefined) {
                            for (const [key, bonus] of Object.entries(challenge.marker_group_modifier[result])) {
                                character.challenge.message.push(i18n.global.t('marker_result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: Math.abs(bonus), name: vm.markers[key].name}));
                                vm.markers[key].value += bonus;
                            }
                        }
                        if (challenge.chosen_group_modifier_tags_add[result] !== undefined) {
                            challenge.chosen_group_modifier_tags_add[result].forEach(function(tag) {
                                if (vm.addTagToCharacter(character, tag)) {
                                    character.challenge.message.push(i18n.global.t('added_tag', {tag_label: tag.label}) );
                                }
                            });
                        }
                        if (challenge.chosen_group_modifier_tags_remove[result] !== undefined) {
                            challenge.chosen_group_modifier_tags_remove[result].forEach(function(tag) {
                                if (vm.removeTagFromCharacter(character, tag)) {
                                    character.challenge.message.push(i18n.global.t('removed_tag', {tag_label: tag.label}) );
                                }
                            });
                        }
                        character.recalculate = 1;
                    }
                }
            )
            challenge.result = result;
        },
        finishChallenge() {
            const vm = this;
            this.last_challenge.active = false;
            this.characters.forEach(
                function(character) {
                    if (character.challenge !== undefined) {
                        character.challenge = {};
                    }
                }
            )
        },
        rollRemaining() {
            const vm = this;
            this.alive_characters.forEach(
                function(character) {
                    if (character.challenge.wait_roll !== undefined && character.challenge.wait_roll) {
                        vm.resolveRoll(character);
                    }
                }
            )
        },
        resolveRoll(character) {
            const vm = this;
            let challenge = this.last_challenge;

            character.challenge.wait_roll = false;
            let messages = [];
            let result = 'failure';
            // The "real" die throw is always between 1 and 20.
            let real_die_throw = Math.floor(Math.random() * 20 + 1);
            let die_throw = real_die_throw + character.challenge.difficulty;

            // Used to lock the number to beat of the character sheet.
            character.challenge.locked_difficulty = Math.min(Math.max(character.stats[character.challenge.stat].value - character.challenge.difficulty, 1), 19);

            // There is always a possibility to fail or succeed on any difficulty level.
            if (real_die_throw !== 20 && (real_die_throw === 1 || die_throw <= character.stats[challenge.stat].value)) {
                result = 'success';
                challenge.nb_success += 1;
            }
            else {
                challenge.nb_failure += 1;
            }

            messages.push(i18n.global.t('challenge_' + result, {stat: vm.stats[challenge.stat].name}));

            if (challenge.gauge_modifier[result] !== undefined) {
                for (const [key, bonus] of Object.entries(challenge.gauge_modifier[result])) {
                    messages.push(i18n.global.t('result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: bonus, name: vm.gauges[key].name}));
                    this.modifyGaugeCharacter(character, key, bonus);
                }
            }
            if (challenge.stat_modifier[result] !== undefined) {
                for (const [key, bonus] of Object.entries(challenge.stat_modifier[result])) {
                    messages.push(i18n.global.t('result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: bonus, name: vm.stats[key].name}));
                    this.modifyStatCharacter(character, key, bonus);
                }
            }
            if (challenge.marker_modifier[result] !== undefined) {
                for (const [key, bonus] of Object.entries(challenge.marker_modifier[result])) {
                    messages.push(i18n.global.t('marker_result_' + (bonus >= 0 ? 'bonus' : 'malus'), {points: Math.abs(bonus), name: vm.markers[key].name}));
                    vm.markers[key].value += bonus;
                }
            }
            if (challenge.chosen_modifier_tags_add[result] !== undefined) {
                challenge.chosen_modifier_tags_add[result].forEach(function(tag) {
                    if (vm.addTagToCharacter(character, tag)) {
                        messages.push(i18n.global.t('added_tag', {tag_label: tag.label}) );
                    }
                });
            }
            if (challenge.chosen_modifier_tags_remove[result] !== undefined) {
                challenge.chosen_modifier_tags_remove[result].forEach(function(tag) {
                    if (vm.removeTagFromCharacter(character, tag)) {
                        messages.push(i18n.global.t('removed_tag', {tag_label: tag.label}) );
                    }
                });
            }
            character.challenge.result = result;
            character.challenge.roll = real_die_throw;
            character.challenge.message = messages;
            character.challenge.group = false;
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
            peer_client = new Peer(join_id, this.getPeerOptions());
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
