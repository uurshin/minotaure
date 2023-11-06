<script>
import {useShepherd} from "vue-shepherd";
import {usePlayerStore} from "../main.js";

export default {
  data() {
    const store = usePlayerStore();
    const vm = this;
    const tour = {};
    const tab_tuto_enabled = false;
    const added_steps = [];

    /**
     * To create a new step, add a new object in the step array with these properties :
     * - id (must match a ref attribute in a component). Required.
     * - parent (must be a working id for the changeTab() method of the Admin component. Required if your element is inside a tab.
     * - goto (must be a working id for the changeTab() method of the Admin component. Required if your element is a tab button.
     * - group_finish (this step ends the tour if a single tab visit was triggered). Optional.
     * - finish (this step ends the whole tour). Optional.
     */
    const steps = [
      {id: 'step_help'},
      {id: 'step_game_name', arrow: false},
      {id: 'step_invite'},
      {id: 'step_start'},
      {id: 'tab_label_settings', goto: 'settings'},
      {parent: 'settings', id: 'step_settings_gauges'},
      {parent: 'settings', id: 'step_settings_add_gauge'},
      {parent: 'settings', id: 'step_settings_gauge', position: 'right'},
      {parent: 'settings', id: 'step_settings_gauge_make_deadly'},
      {parent: 'settings', id: 'step_settings_gauge_delete'},
      {parent: 'settings', id: 'step_settings_stats'},
      {parent: 'settings', id: 'step_settings_add_stat'},
      {parent: 'settings', id: 'step_settings_stat', position: 'right'},
      {parent: 'settings', id: 'step_settings_stat_delete', group_finish: true},
      {id: 'tab_label_tags', goto: 'tags'},
      {parent: 'tags', id: 'step_tags'},
      {
        parent: 'tags', id: 'step_tags_group_add',
        beforeShow: function () {
            return new Promise(function (resolve) {
              let groups = vm.store.getGroupTags();
              if (groups.length === 0) {
                vm.store.addGroupTag();
              }
              resolve();
            });
        }
      },
      {
        parent: 'tags', id: 'step_tags_group',
        beforeShow: function () {
          return new Promise(function (resolve) {
            let groups = vm.store.getGroupTags();
            let group;
            if (groups.length === 0) {
              group = vm.store.addGroupTag();
            } else {
              group = groups[0];
            }
            if (groups[0].tags.length === 0) {
              vm.store.addTag(vm.$t('example'), group);
            }
            resolve();
          });
        }
      },
      {parent: 'tags', id: 'step_tags_tag'},
      {parent: 'tags', id: 'step_tags_group_rename'},
      {parent: 'tags', id: 'step_tags_group_distribution'},
      {parent: 'tags', id: 'step_tags_group_distribute'},
      {parent: 'tags', id: 'step_tags_group_shuffle'},
      {parent: 'tags', id: 'step_tags_group_delete', group_finish: true},
      {id: 'tab_label_characters', goto: 'characters', group_finish: true},
      {id: 'tab_label_poll', goto: 'poll', group_finish: true},
      {id: 'tab_label_challenge', goto: 'challenge', group_finish: true},
      {id: 'tab_label_pick', goto: 'pick', finish:true}
    ];

    return {
      store, vm, tour, steps, tab_tuto_enabled, added_steps
    }
  },
  mounted() {

  },
  methods: {
    startTour() {
      const vm = this;
      this.added_steps = [];
      this.tour = useShepherd({
        useModalOverlay: true,
        defaultStepOptions: {
          scrollTo: true,
          cancelIcon: {
            enabled: true
          }
        }
      });
      this.steps.forEach(function(step) {
        vm.addStep(step);
      })
      this.tour.start();
    },
    getStepButtons(step) {
      const vm = this;
      let buttons = [];
      if (step.id === 'step_help') {
        buttons.push(
          {
            text: function() {
              return vm.$t('see_all_tutorial');
            },
            action: function() {
              vm.tab_tuto_enabled = false;
              return vm.tour.next();
            }
          }
        )
        buttons.push(
            {
              text: function() {
                return vm.$t('see_page_tutorial');
              },
              action: function() {
                let step = vm.steps.findIndex((step) => step.id === 'tab_label_' + vm.$parent.current_tab);
                vm.tab_tuto_enabled = true;
                return vm.tour.show(step);
              },
              disabled: function() {
                return vm.$parent.current_tab === 'intro';
              }
            }
        )
      }
      else {
        buttons.push(
          {
            text: function() {
              if (vm.tab_tuto_enabled && step.group_finish !== undefined) {
                return vm.$t('end_tab_tour');
              }
              return (step.finish ? vm.$t('end_tour') : vm.$t('next'));
            },
            action: function() {
              if (vm.tab_tuto_enabled && step.group_finish !== undefined) {
                return vm.tour.complete();
              }
              return vm.tour.next();
            }
          }
        );
      }
      return buttons;
    },
    addStep(step, index = undefined) {
      const vm = this;

      let new_step = {
        arrow: step.arrow ?? true,
        text: vm.$t(step.id),
        buttons: vm.getStepButtons(step)
      }

      if (typeof step.beforeShow === 'function') {
        new_step.beforeShowPromise = step.beforeShow;
      }

      new_step.attachTo = {
        element: function () {
          if (step.parent !== undefined) {
            vm.$parent.changeTab(step.parent);
          }
          else if (step.goto !== undefined) {
            vm.$parent.changeTab(step.goto);
          }
          let element;
          if (step.parent !== undefined) {
            element = vm.$parent.$refs['admin_tab_' + step.parent].$refs[step.id];
          }
          else {
            element = vm.$parent.$refs[step.id];
          }

          return element.classList ? element : element[0];
        },
        on: step.placement ?? 'top',
        showOn: function() {
          return element !== null;
        },
      }

      vm.tour.addStep(new_step, index);
    }
  }
}
</script>

<style scoped lang="scss">

</style>