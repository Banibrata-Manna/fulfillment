<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Pack order") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item lines="none">
        <ion-label>{{ translate(isTrackingRequired ? "Tracking details are required in order to pack this shipment. Try generating a label from the selected carrier or enter a tracking code manually." : "Tracking details are missing in order to pack this shipment. Try generating a label from the selected carrier or enter a tracking code manually.") }}</ion-label>
      </ion-item>

      <ion-item>
        <ion-select :disabled="!order.missingLabelImage || !hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)" :label="translate('Carrier')" v-model="carrierPartyId" interface="popover" @ionChange="updateCarrier(carrierPartyId)">
          <ion-select-option v-for="carrier in facilityCarriers" :key="carrier.partyId" :value="carrier.partyId">{{ translate(carrier.groupName) }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <template v-if="carrierMethods && carrierMethods.length > 0">
          <ion-select :disabled="!order.missingLabelImage || !hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)" :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover">
            <ion-select-option v-for="method in carrierMethods" :key="carrierMethods.partyId + method.shipmentMethodTypeId" :value="method.shipmentMethodTypeId">{{ translate(method.description) }}</ion-select-option>
          </ion-select>
        </template>
        <template v-else>
          <ion-label>
            {{ translate('No shipment methods linked to', {carrierName: getCarrierName()}) }}
          </ion-label>
          <ion-button @click="openShippingMethodDocumentReference()" fill="clear" color="medium" slot="end">
            <ion-icon slot="icon-only" :icon="informationCircleOutline" />
          </ion-button>
        </template>
      </ion-item>
      <ion-item>
        <ion-input :label="translate('Tracking code')" :placeholder="translate('enter code')" v-model="trackingCode" />
      </ion-item>
      <ion-item>
        <ion-label>{{ generateTrackingUrl() }}</ion-label>
        <ion-button slot="end" fill="clear" size="default" :disabled="!trackingCode.trim() || !getCarrierTrackingUrl()" @click="redirectToTrackingUrl()">
          {{ translate("Test") }}
          <ion-icon :icon="openOutline" slot="end" />
        </ion-button>
      </ion-item>
    </ion-list>

    <div class="empty-state" v-if="isGeneratingShippingLabel">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Generating label") }}</ion-label>
    </div>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="isGeneratingShippingLabel ? true : !shipmentMethodTypeId" @click="confirmSave()">
      <ion-icon :icon="isForceScanEnabled ? barcodeOutline : saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { barcodeOutline, closeOutline, copyOutline, informationCircleOutline, openOutline, saveOutline } from "ionicons/icons";
import { translate } from "@hotwax/dxp-components";
import { mapGetters, useStore } from "vuex";
import { OrderService } from '@/services/OrderService';
import logger from "@/logger";
import { showToast } from "@/utils";
import { hasError } from "@/adapter";
import { retryShippingLabel } from "@/utils/order";
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: "GenerateTrackingCodeModal",
  components: { 
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      facilityCarriers: 'carrier/getFacilityCarriers',
      isForceScanEnabled: 'util/isForceScanEnabled',
      productStoreShipmentMethods: 'carrier/getProductStoreShipmentMethods',
      productStoreShipmentMethCount: 'util/getProductStoreShipmentMethCount',
    })
  },
  data() {
    return {
      isTrackingRequired: false,
      carrierMethods:[] as any,
      carrierPartyId: "",
      shipmentMethodTypeId: "",
      trackingCode: "",
      isGeneratingShippingLabel: false
    }
  },
  props: ["order", "updateCarrierShipmentDetails", "shipmentLabelErrorMessages", "fetchShipmentLabelError"],
  async mounted() {
    this.isTrackingRequired = this.isTrackingRequiredForAnyShipmentPackage()
    if(this.facilityCarriers) {
      const shipmentPackage = this.order.shipmentPackages?.[0];
      this.carrierPartyId = shipmentPackage?.carrierPartyId ? shipmentPackage?.carrierPartyId : this.facilityCarriers[0].partyId;
      this.carrierMethods = await this.getProductStoreShipmentMethods(this.carrierPartyId);
      this.shipmentMethodTypeId = shipmentPackage?.shipmentMethodTypeId;
    }
  },
  methods: {
    closeModal(payload = {}) {
      modalController.dismiss({ dismissed: true, ...payload });
    },
    openShippingMethodDocumentReference() {
      window.open('https://docs.hotwax.co/documents/v/system-admins/fulfillment/shipping-methods/carrier-and-shipment-methods', '_blank');
    },
    isTrackingRequiredForAnyShipmentPackage() {
      return this.order.shipmentPackages?.some((shipmentPackage: any) => shipmentPackage.isTrackingRequired === 'Y')
    },
    async getProductStoreShipmentMethods(carrierPartyId: string) { 
      return this.productStoreShipmentMethods?.filter((method: any) => method.partyId === carrierPartyId) || [];
    },
    async updateCarrier(carrierPartyId: string) {
      this.carrierMethods = await this.getProductStoreShipmentMethods(carrierPartyId);
      this.shipmentMethodTypeId = this.carrierMethods?.[0]?.shipmentMethodTypeId;
    },
    async confirmSave() {
      let order = this.order
      let isRegenerated = false as any;

      this.isGeneratingShippingLabel = true;

      if (hasPermission(Actions.APP_ORDER_SHIPMENT_METHOD_UPDATE)) {
        const isUpdated = await this.updateCarrierAndShippingMethod(this.carrierPartyId, this.shipmentMethodTypeId)
        if(!isUpdated) {
          showToast(translate("Failed to update shipment method detail."));
          return;
        }
      }

      if(this.trackingCode.trim()) {
        isRegenerated = await this.addTrackingCode(order);
        //fetching updated shipment packages
        await this.store.dispatch('order/updateShipmentPackageDetail', order)
      } else if(this.shipmentMethodTypeId) {
        isRegenerated = await this.regenerateShippingLabel(order)
      }

      if(isRegenerated || !this.isTrackingRequired) {
        this.closeModal({ moveToNext: true });
      }

      this.isGeneratingShippingLabel = false;
    },
    async addTrackingCode(order: any) {
      try {
        for (const shipmentPackage of order.shipmentPackages) {
          await OrderService.addTrackingCode({
            "shipmentId": shipmentPackage.shipmentId,
            "shipmentRouteSegmentId": shipmentPackage.shipmentRouteSegmentId,
            "shipmentPackageSeqId": shipmentPackage.shipmentPackageSeqId,
            "trackingCode": this.trackingCode.trim()
          });
        }
      } catch (error: any) {
        logger.error('Failed to add tracking code', error);
        showToast(translate("Failed to add tracking code."));
        return false;
      }
      return true;
    },
    async regenerateShippingLabel(order: any) {
      // If there are no product store shipment method configured, then not generating the label and displaying an error toast
      if(this.productStoreShipmentMethCount <= 0) {
        showToast(translate("Unable to generate shipping label due to missing product store shipping method configuration"))
        return false;
      }

      const response = await this.retryShippingLabel(order, false);
      if(response?.isGenerated) {
        return true;
      } else {
        this.fetchShipmentLabelError && this.fetchShipmentLabelError()
        return false;
      }
    },
    getCarrierTrackingUrl() {
      return this.facilityCarriers.find((carrier: any) => carrier.partyId === this.carrierPartyId)?.trackingUrl
    },
    generateTrackingUrl() {
      if(this.getCarrierTrackingUrl()) {
        return translate("Tracking URL:", { trackingUrl: this.getCarrierTrackingUrl()?.replace("${trackingNumber}", this.trackingCode) })
      }
      return translate("A tracking URL is not configured for", { carrierName: this.getCarrierName() })
    },
    getCarrierName() {
      return this.facilityCarriers.find((carrier: any) => carrier.partyId === this.carrierPartyId)?.groupName
    },
    async updateCarrierAndShippingMethod(carrierPartyId: string, shipmentMethodTypeId: string) {
      let resp;
      try{
        const carrierShipmentMethods = await this.getProductStoreShipmentMethods(carrierPartyId);
        shipmentMethodTypeId = shipmentMethodTypeId ? shipmentMethodTypeId : carrierShipmentMethods?.[0]?.shipmentMethodTypeId;
        const isTrackingRequired = carrierShipmentMethods.find((method: any) => method.shipmentMethodTypeId === shipmentMethodTypeId)?.isTrackingRequired

        for (const shipmentPackage of this.order.shipmentPackages) {
          resp = await OrderService.updateShipmentRouteSegment({
            "shipmentId": shipmentPackage.shipmentId,
            "shipmentRouteSegmentId": shipmentPackage.shipmentRouteSegmentId,
            "carrierPartyId": carrierPartyId,
            "shipmentMethodTypeId" : shipmentMethodTypeId ? shipmentMethodTypeId : "",
            "isTrackingRequired": isTrackingRequired ? isTrackingRequired : "Y"
          }) as any;
          if(!hasError(resp)) {
            //on changing the shipment carrier/method, voiding the gatewayMessage and gatewayStatus
            if (this.shipmentLabelErrorMessages) {
              resp = await OrderService.updateShipmentPackageRouteSeg({
                "shipmentId": shipmentPackage.shipmentId,
                "shipmentRouteSegmentId": shipmentPackage.shipmentRouteSegmentId,
                "shipmentPackageSeqId": shipmentPackage.shipmentPackageSeqId,
                "gatewayMessage": "",
                "gatewayStatus": ""
              }) as any;
              if (hasError(resp)) {
                throw resp.data
              }
            }
          } else {
            throw resp.data
          }
        }

        this.isTrackingRequired = isTrackingRequired === "N" ? false : true
      } catch(error: any) {
        logger.error("Failed to update carrier and method", error);
        return false;
      }

      this.updateCarrierShipmentDetails && this.updateCarrierShipmentDetails(carrierPartyId, shipmentMethodTypeId);
      return true;
    },
    redirectToTrackingUrl() {
      window.open(this.getCarrierTrackingUrl().replace("${trackingNumber}", this.trackingCode), "_blank");
    }
  },
  setup() {
    const store = useStore();
    return {
      Actions,
      barcodeOutline,
      closeOutline,
      copyOutline,
      hasPermission,
      informationCircleOutline,
      openOutline,
      retryShippingLabel,
      saveOutline,
      store,
      translate
    };
  },
});
</script>