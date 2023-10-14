<script>
import {useShepherd} from "vue-shepherd";

export default {
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
      {text: 'Ce didacticiel est en cours de conception.', parent: 'characters', id: 'step1'},
      {text: 'characters', parent: 'characters', id: 'step2'},
      {text: 'bars', parent: 'settings', id: 'step3', finish:true},
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