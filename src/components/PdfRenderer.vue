<template>
  <ion-content class="pdf-container" >
    <VuePdfEmbed :source="src" :css-class="'pdf-viewer'" />
  </ion-content>
</template>

<script>
import { defineComponent } from 'vue';
import VuePdfEmbed from 'vue-pdf-embed';
import { IonContent } from '@ionic/vue';

export default defineComponent({
  name: 'PdfRenderer',
  components: { IonContent, VuePdfEmbed },
  props: {
    src: { type: String, required: true }
  }
});
</script>

<style scoped>
.pdf-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.pdf-viewer {
  flex: 1 1 auto;
  width: 50%;
  height: 30%;
  justify-content: center;
  align-items: center;
}
</style>
