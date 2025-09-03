<template>
    {{ pdfSource }}
    {{ show }}
    <ion-content>
        <iframe id="pdfViewerFrame" :src="viewerUrl"></iframe>
    </ion-content>
</template>
<script>
import { IonContent } from '@ionic/vue';
import { defineComponent } from 'vue';
// import * as pdfjsLib from 'pdfjs-dist';


export default defineComponent({
    name: 'PdfViewer',
    components: {
        IonContent
    },
    props: {
        pdfSource: {
            type: String,
            required: true
        },
        show: {
            type: Boolean,
            required: true,
            default: false
        }
    },
});
</script>