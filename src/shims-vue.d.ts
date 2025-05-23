declare module '*.vue' {
  import { defineComponent } from 'vue'
  const component: ReturnType<typeof defineComponent>
  export default component
}

declare module "vue-barcode-reader";
declare module "fulfillment_extensions/*";
