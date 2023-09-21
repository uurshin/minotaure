<script>
import {useI18n} from "vue-i18n";
import {useShepherd} from "vue-shepherd";

export default {
  setup() {
    const { t } = useI18n()
    return { t };
  },
  data() {
    const tour = useShepherd({
      useModalOverlay: true,
      defaultStepOptions: {
        scrollTo: true,
        cancelIcon: {
          enabled: true
        }
      }
    });
    const steps = [
      {text: 'Personnages', parent: 'characters', id: 'step1'},
      {text: 'Jauges', parent: 'gauges', id: 'step2', finish:true},
    ];

    return {
      tour, steps
    }
  },
  mounted() {
    const vm = this;
    this.steps.forEach(function(step) {
      vm.tour.addStep({
        attachTo: {
          element: function() {
            vm.$parent.changeTab(step.parent);
            return vm.$parent.$refs['admin_tab_' + step.parent].$refs[step.id];
          },
          on: 'top'
        },
        text: vm.$t(step.text),
        buttons: [
          {
            text: function() {
              return (step.finish ? vm.$t('Terminer la visite') : vm.$t('Suivant'));
            },
            action: vm.tour.next
          }
        ]
      });
    })
  },
  methods: {
    startTour() {
      this.tour.start();
    }
  }
}
</script>

<style scoped lang="scss">

</style>