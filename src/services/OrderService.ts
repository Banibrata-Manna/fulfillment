import { api, hasError } from '@/adapter';
import { getProductIdentificationValue, translate, useUserStore } from '@hotwax/dxp-components'
import logger from '@/logger';
import { showToast, formatPhoneNumber, getFeatures, jsonToCsv } from '@/utils';
import store from '@/store';
import { cogOutline } from 'ionicons/icons';
import { prepareSolrQuery } from '@/utils/solrHelper';
import { ZebraPrinterService } from './ZebraPrinterService';

const fetchOrderHeader = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchOrderAttribute = async (params: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchOrderItems = async (orderId: string): Promise<any> => {
  let viewIndex = 0;
  let orderItems = [] as any, resp;

  try {
    do {
      resp = await api({
        url: "performFind",
        method: "get",
        params : {
          "entityName": "OrderItemAndProduct",
          "inputFields": {
            "orderId": orderId,
          },
          "fieldList": ["orderId", "orderItemSeqId", "statusId", "shipGroupSeqId", "productId", "productName", "internalName", "quantity"],
          "viewIndex": viewIndex,
          "viewSize": 250,  // maximum records we could have
          "distinct": "Y",
          "noConditionFind": "Y"
        }
      }) as any;

      if (!hasError(resp) && resp.data.count) {
        orderItems = orderItems.concat(resp.data.docs)
        viewIndex++;
      } else {
        throw resp.data;
      }
    }
    while (resp.data.docs.length >= 250);
  } catch (error) {
    logger.error(error);
  }
  return orderItems
}

const fetchShippedQuantity = async (orderId: string): Promise<any> => {
  let docCount = 0;
  let shippedItemQuantitySum = [] as any
  let viewIndex = 0;

  do {
    const params = {
      "entityName": "ShippedItemQuantitySum",
      "inputFields": {
        "orderId": orderId,
      },
      "fieldList": ["orderId", "orderItemSeqId", "productId", "shippedQuantity"],
      "viewSize": 250,  // maximum records we could have
      "distinct": "Y",
      viewIndex
    } as any;

    const resp = await api({
      url: "performFind",
      method: "get",
      params
    }) as any

    if (!hasError(resp) && resp.data.count) {
      shippedItemQuantitySum = [...shippedItemQuantitySum, ...resp.data.docs]
      docCount = resp.data.docs.length;
      viewIndex++;
    } else {
      docCount = 0
    }
  } while(docCount >= 250);

  return shippedItemQuantitySum;
}

const fetchShipmentItems = async (orderId: string, shipmentId: string): Promise<any> => {
  let viewIndex = 0;
  let shipmentItems = [] as any, resp;

  try {
    const inputFields = {} as any;
    if (orderId) {
      inputFields['orderId'] = orderId;
    }
    if (shipmentId) {
      inputFields['shipmentId'] = shipmentId;
    }

    do {
      resp = await api({
        url: "performFind",
        method: "get",
        params: {
          "entityName": "ShipmentItemDetail",
          inputFields,
          "fieldList": ["shipmentId", "shipmentStatusId", "shipmentItemSeqId", "orderId", "orderItemSeqId", "productId", "productName", "internalName", "quantity", "orderedQuantity"],
          "viewIndex": viewIndex,
          "viewSize": 250,
          "distinct": "Y"
        }
      }) as any;

      if (!hasError(resp) && resp.data.count) {
        shipmentItems = shipmentItems.concat(resp.data.docs)
        viewIndex++;
      } else {
        throw resp.data;
      }
    }
    while (resp.data.docs.length >= 250);
  } catch (error) {
    logger.error(error);
  }
  return shipmentItems
}

const createOutboundTransferShipment = async (query: any): Promise<any> => {
  return api({
    url: "createSalesShipment",
    method: "post",
    data: query
  });
}

const updateShipment = async (payload: any): Promise<any> => {
  return api({
    url: "updateShipment",
    method: "POST",
    data: payload
  })
}

const updateShipmentRouteSegment = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateShipmentRouteSegment",
    method: "POST",
    data: payload
  })
}
const updateShipmentPackageRouteSeg = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateShipmentPackageRouteSeg",
    method: "POST",
    data: payload
  })
}

const voidShipmentLabel = async (payload: any): Promise<any> => {
  return api({
    url: "service/voidShipmentLabel",
    method: "POST",
    data: payload
  })
}

const updateOrderItemShipGroup = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateOrderItemShipGroup",
    method: "POST",
    data: payload
  })
}

const addTrackingCode = async (payload: any): Promise<any> => {
  try {
    let resp = await updateShipmentPackageRouteSeg({
      "shipmentId": payload.shipmentId,
      "shipmentRouteSegmentId": payload.shipmentRouteSegmentId,
      "shipmentPackageSeqId": payload.shipmentPackageSeqId,
      "trackingCode": payload.trackingCode,
      "labelImage": "",
      "labelIntlSignImage": "",
      "labelHtml": "",
      "labelImageUrl": "",
      "internationalInvoiceUrl": ""
    });
    if (!hasError(resp)) {
      resp = await updateShipmentRouteSegment({
        "shipmentId": payload.shipmentId,
        "shipmentRouteSegmentId": payload.shipmentRouteSegmentId,
        "trackingIdNumber": payload.trackingCode,
        "carrierServiceStatusId": "SHRSCS_ACCEPTED"
      });
      if (hasError(resp)) {
        throw resp.data;
      }
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to add tracking code', err)
    return Promise.reject(err)
  }
}

const findOpenOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const findCompletedOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const findOrderInvoicingInfo = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query
  });
}

const findInProgressOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const findTransferOrders = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const packOrder = async (payload: any): Promise<any> => {
  return api({
    url: "/service/packStoreFulfillmentOrder",
    method: "post",
    data: payload
  })
}

const packOrders = async (payload: any): Promise<any> => {
  return api({
    url: "/service/bulkPackStoreFulfillmentOrders",
    method: "post",
    data: payload
  })
}

const bulkShipOrders = async (payload: any): Promise<any> => {
  return api({
    url: "service/bulkShipOrders",
    method: "post",
    data: payload
  })
}

const unpackOrder = async (payload: any): Promise<any> => {
  return api({
    url: "service/unlockStoreFulfillmentOrder",
    method: "post",
    data: payload
  })
}

const rejectOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: "rejectOrderItem",
    method: "post",
    data: payload
  });
}

const addShipmentBox = async (payload: any): Promise<any> => {
  return api({
    url: "addShipmentPackage",
    method: "post",
    data: payload
  });
}
const shipOrder = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  return api({
    url: 'shipOrder',
    method: 'POST',
    data: payload,
    baseURL,
    headers: { "Content-Type": "multipart/form-data" },
  })
}

const updateOrder = async (payload: any): Promise<any> => {
  return api({
    url: "updateOrder",
    method: "post",
    data: payload.data,
    headers: payload.headers
  })
}

const rejectFulfillmentReadyOrderItem = async (payload: any): Promise<any> => {
  return api({
    url: "service/rejectFulfillmentReadyOrderItem",
    method: "post",
    data: payload.data,
  })
}

const fetchShipments = async (picklistBinIds: Array<string>, orderIds: Array<string>, originFacilityId: string, statusId = ["SHIPMENT_SHIPPED", "SHIPMENT_PACKED"]): Promise<any> => {
  let shipments = [];

  const params = {
    "entityName": "Shipment",
    "inputFields": {
      "primaryOrderId": orderIds,
      "primaryOrderId_op": "in",
      "picklistBinId": picklistBinIds,
      "picklistBinId_op": "in",
      "originFacilityId": originFacilityId,
      "statusId": statusId,
      "statusId_op": "in"
    },
    "fieldList": ["primaryOrderId", "picklistBinId", "shipmentId", "shipmentMethodTypeId", "statusId", "shipmentTypeId"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    // TODO: handle case when viewSize is more than 250 as performFind api does not return more than 250 records at once
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipments = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipments for orders', err)
  }

  return shipments;
}

const fetchShipmentPackages = async (shipmentIds: Array<string>, isTrackingRequired = false): Promise<any> => {
  let shipmentPackages = [];
  let trackingCodeFilters = {};

  if(!isTrackingRequired) {
    trackingCodeFilters = {
      "trackingCode_op": "empty",
      "trackingCode_grp": "1",
      "carrierServiceStatusId": "SHRSCS_VOIDED",
      "carrierServiceStatusId_grp": "2"
    }
  }

  const params = {
    "entityName": "ShipmentPackageRouteSegDetail",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "shipmentItemSeqId_op": "not-empty",
      ...trackingCodeFilters
    },
    "fieldList": ["shipmentId", "shipmentRouteSegmentId", "shipmentPackageSeqId", "shipmentBoxTypeId", "packageName", "primaryOrderId", "carrierPartyId", "isTrackingRequired", "primaryShipGroupSeqId", "labelImageUrl", "carrierServiceStatusId"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipmentPackages = resp?.data.docs;
      shipmentPackages.map((shipmentPackage: any) => {
        if(shipmentPackage.carrierServiceStatusId === "SHRSCS_VOIDED") {
          shipmentPackage.trackingCode = ""
          shipmentPackage.labelImageUrl = ""
          shipmentPackage.internationalInvoiceUrl = ""
        }
      })
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipment packages information', err)
  }

  return shipmentPackages;
}

const fetchTrackingCodes = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentTrackingCodes = [];
  const params = {
    "entityName": "ShipmentPackageRouteSeg",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "shipmentItemSeqId_op": "not-empty"
    },
    "fieldList": ["shipmentId", "shipmentPackageSeqId", "trackingCode"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipmentTrackingCodes = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch tracking codes for shipments', err)
  }

  return shipmentTrackingCodes;
}
const fetchShipmentCarrierDetail = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentCarriers = [];
  const params = {
    "entityName": "ShipmentRouteSegment",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
    },
    "fieldList": ["shipmentId", "carrierPartyId", "carrierServiceStatusId", "shipmentMethodTypeId", "trackingIdNumber"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipmentCarriers = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch carrier details for shipments', err)
  }

  return shipmentCarriers;
}

const fetchShipmentShippedStatusHistory = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentStatuses = [];
  const params = {
    "entityName": "ShipmentStatus",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "statusId": "SHIPMENT_SHIPPED"
    },
    "fieldList": ["shipmentId", "statusId", "statusDate", "changeByUserLoginId"],
    "viewSize": 250,
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipmentStatuses = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipment status history for shipments', err)
  }

  return shipmentStatuses;
}

const printPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'PackingSlip.pdf',
      params: {
        shipmentId: shipmentIds
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'packing slip'}), { icon: cogOutline });
    }

  } catch (err) {
    showToast(translate('Failed to print packing slip'))
    logger.error("Failed to load packing slip", err)
  }
}

const printShippingLabel = async (shipmentIds: Array<string>, shippingLabelPdfUrls?: Array<string>, shipmentPackages?: Array<any>, imageType?: string): Promise<any> => {
  try {
    let pdfUrls = shippingLabelPdfUrls?.filter((pdfUrl: any) => pdfUrl);
    if (!pdfUrls || pdfUrls.length == 0) {
      let labelImageType = imageType || "PNG";

      if(!imageType && shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
        labelImageType = await store.dispatch("util/fetchLabelImageType", shipmentPackages[0].carrierPartyId);
      }

      const labelImages = [] as Array<string>
      if (labelImageType === "ZPLII") {
        shipmentPackages?.map((shipmentPackage: any) => {
          shipmentPackage.labelImage && labelImages.push(shipmentPackage.labelImage)
        })
        await ZebraPrinterService.printZplLabels(labelImages);
        return;
      }
      // Get packing slip from the server
      const resp: any = await api({
        method: 'get',
        url: 'ShippingLabel.pdf',
        params: {
          shipmentId: shipmentIds[0]
        },
        responseType: "blob"
      })

      if (!resp || resp.status !== 200 || hasError(resp)) {
        throw resp.data;
      }

      // Generate local file URL for the blob received
      const pdfUrl = window.URL.createObjectURL(resp.data);
      pdfUrls = [pdfUrl];
    }
    // Open the file in new tab
    pdfUrls.forEach((pdfUrl: string) => {
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'shipping label'}), { icon: cogOutline });
    }
    })

  } catch (err) {
    showToast(translate('Failed to print shipping label'))
    logger.error("Failed to load shipping label", err)
  }
}

const printCustomDocuments = async (internationalInvoiceUrls: Array<string>): Promise<any> => {
  if (!internationalInvoiceUrls || internationalInvoiceUrls.length === 0) {
    return;
  }
  try {
    internationalInvoiceUrls.forEach((url: string) => {
      try {
        (window as any).open(url, "_blank").focus();
      } catch {
        showToast(translate('Unable to open as the browser is blocking pop-ups.', { documentName: 'custom document' }), { icon: cogOutline });
      }
    });
  } catch (err) {
    showToast(translate('Failed to print custom document'));
    logger.error("Failed to load custom document", err);
  }
}

const printShippingLabelAndPackingSlip = async (shipmentIds: Array<string>, shipmentPackages: any): Promise<any> => {

  let labelImageType = "PNG";
  if(shipmentPackages?.length && shipmentPackages[0]?.carrierPartyId) {
    labelImageType = await store.dispatch("util/fetchLabelImageType", shipmentPackages[0].carrierPartyId); 
  }

  if (labelImageType === "ZPLII") {
    await printShippingLabel(shipmentIds, [], shipmentPackages, labelImageType)
    await printPackingSlip(shipmentIds)
    return;
  }

  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'LabelAndPackingSlip.pdf',
      params: {
        shipmentIds
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'shipping label and packing slip'}), { icon: cogOutline });
    }

  } catch (err) {
    showToast(translate('Failed to print shipping label and packing slip'))
    logger.error("Failed to load shipping label and packing slip", err)
  }
}

const getPicklistData = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "GET",
    params: payload
  })
}

const downloadPicklist = async (picklistId: string): Promise<any> => {
  let viewIndex = 0;
  let docCount = 0;
  let picklistDate = "";
  const picklistData: Array<Record<string, string | number>> = []
  const orderIdentifier: Record<string, Record<string, string>> = {}

  do {
    const payload = {
      inputFields: {
        picklistId
      },
      entityName: "PicklistItemsQuantityCountView",
      orderBy: "idValue DESC | name",
      viewSize: 50,
      viewIndex
    }

    try {
      const resp = await OrderService.getPicklistData(payload)

      if(!hasError(resp) && resp.data.docs?.length) {
        const productIds: Array<string> = []
        const orderIds: Array<string> = []
        const party: Record<string, string> = {}

        docCount = resp.data.docs.length;
        viewIndex++;
        picklistDate = resp.data.docs[0].picklistDate

        resp.data.docs.map((data: any) => {
          productIds.push(data.inventoryItemProductId)
          orderIds.push(data.orderId)
        })

        await store.dispatch("product/fetchProducts", { productIds })

        try {
          const orderHeaderResp = await fetchOrderHeader({
            inputFields: {
              orderId: [...new Set(orderIds)],
              orderId_op: "in"
            },
            entityName: "OrderHeader",
            fieldList: ["orderId", "orderName"],
            viewSize: orderIds.length,
          })

          if(!hasError(orderHeaderResp) && orderHeaderResp.data.docs?.length) {
            const orderContactMechAndAddress = await getOrderContactMechAndAddress([...new Set(orderIds)]);
            orderHeaderResp.data.docs?.map((order: any) => orderIdentifier[order.orderId] = order.orderName)

            orderHeaderResp.data.docs?.map((order: any) => {
              orderIdentifier[order.orderId] = {
                orderName: order.orderName,
                partyName: orderContactMechAndAddress.orderContactMechIds[order.orderId] ? orderContactMechAndAddress.shippingAddress[orderContactMechAndAddress.orderContactMechIds[order.orderId]]?.toName ? orderContactMechAndAddress.shippingAddress[orderContactMechAndAddress.orderContactMechIds[order.orderId]].toName : "" : ""
              }
            })
          } else {
            throw resp.data;
          }
        } catch(err) {
          logger.error("Failed to fetch order info", err)
        }

        resp.data.docs.map((data: any) => {
          const product = store.getters["product/getProduct"](data.inventoryItemProductId)
          if(!product) {
            return;
          }

          const facility = useUserStore().getCurrentFacility as any

          // Preparing data to download as CSV
          const productName = product.parentProductName || product.productName
          picklistData.push({
            "shopify-order-id": orderIdentifier[data.orderId]?.orderName,
            "hc-order-id": data.orderId,
            "customer-name": orderIdentifier[data.orderId]?.partyName,
            "facility-name": facility?.facilityName || facility?.facilityId,
            "product-identifier": getProductIdentificationValue(store.getters["util/getPicklistItemIdentificationPref"] || "internalName", product),
            "product-code": `'${data.idValue}`,
            "product-name": productName,
            "product-features": getFeatures(product.productFeatures),
            "to-pick": data.itemQuantity
          })
        })
      } else {
        docCount = 0;
      }
    } catch(err) {
      docCount = 0;
      logger.error("Failed to fetch picklist data", err)
    }
  } while(docCount >= 50)

  if(picklistData.length) {
    const fileName = `Picklist-${picklistDate}.csv`
    await jsonToCsv(picklistData, { download: true, name: fileName });
  } else {
    showToast(translate("No items to print"))
  }
}

const printPicklist = async (picklistId: any): Promise<any> => {
  const isPicklistDownloadEnabled = store.getters["util/isPicklistDownloadEnabled"]
  if(isPicklistDownloadEnabled) {
    await downloadPicklist(picklistId)
    return;
  }

  try {
    // Get picklist from the server
    const resp: any = await api({
      method: 'get',
      url: 'PrintPicklist.pdf',
      params: {
        picklistId
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'picklist'}), { icon: cogOutline });
    }
  } catch (err) {
    showToast(translate('Failed to print picklist'))
    logger.error("Failed to print picklist", err)
  }
}

const printTransferOrder = async (orderId: string): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'TransferOrder.pdf',
      params: {
        orderId: orderId
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'picklist'}), { icon: cogOutline });
    }

  } catch (err) {
    showToast(translate('Failed to print picklist'))
    logger.error("Failed to load picklist", err)
  }
}

const retryShippingLabel = async (shipmentIds: Array<string>, forceRateShop = false): Promise<any> => {
  try {
    const resp = await api({
      method: 'POST',
      url: 'retryShippingLabel',  // TODO: update the api
      data: {
        shipmentIds,
        forceRateShop: forceRateShop ? 'Y' : 'N',
        generateLabel: "Y" // This is needed to generate label after the new changes in backend related to auto generation of label.
      }
    })
    if(hasError(resp)) {
      throw resp?.data;
    }
  } catch(error) {
    logger.error(error)
  }
}

const fetchShipmentLabelError = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentLabelError = [];
  const params = {
    "entityName": "ShipmentPackageRouteSeg",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "gatewayMessage": null,
      "gatewayMessage_op": "notEqual",
      "gatewayStatus": "error", 
      "gatewayStatus_op": "equals"
    },
    "fieldList": ["shipmentId", "gatewayMessage"],
    "viewSize": 20,
  }

  try {
    const resp: any = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }
    shipmentLabelError = resp.data.docs.map((doc: any) => doc.gatewayMessage);
  } catch (err) {
    logger.error('Failed to fetch shipment label error', err)
  }
  return shipmentLabelError;
}

const findOrderShipGroup = async (query: any): Promise<any> => {
  return api({
    // TODO: We can replace this with any API
    url: "solr-query",
    method: "post",
    data: query
  });
}

const fetchAdditionalShipGroupForOrder = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}

const fetchOrderItemShipGroup = async (order: any): Promise<any> => {
  let shipGroup = {};

  const params = {
    "entityName": "OrderItemShipGroup",
    "inputFields": {
      "orderId": order.orderId,
      "shipGroupSeqId": order.shipGroupSeqId,
    },
    "fieldList": ["orderId", "shipGroupSeqId", "facilityId", "shipmentMethodTypeId", "contactMechId"],
    "distinct": "Y"
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shipGroup = resp?.data.docs[0];
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipments for orders', err)
  }

  return shipGroup;
}

const fetchOrderPaymentPreferences = async (orderId: any): Promise<any> => {
  const params = {
    "entityName": "OrderPaymentPreference",
    "inputFields": {
      "orderId": orderId,
    },
    "fieldList": ["orderId", "paymentMethodTypeId", "statusId"],
    "orderBy": "createdDate DESC",
    "distinct": "Y"
  }

  return await api({
    url: "performFind",
    method: "get",
    params
  });
}

const fetchShippingAddress = async (contactMechId: string): Promise<any> => {
  let shippingAddress = {};

  const params = {
    "entityName": "PostalAddressAndGeo",
    "inputFields": {
      "contactMechId": contactMechId,
    },
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
    })

    if (!hasError(resp)) {
      shippingAddress = resp?.data.docs[0];
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    logger.error('Failed to fetch shipments for orders', err)
  }
  return shippingAddress;
}

const getOrderContactMechAndAddress = async (orderIds: Array<string>): Promise<any> => {
  const shippingAddress = {} as any
  const orderContactMechIds = {} as Record<string, string>
  try {
    const resp: any = await api({
      url: "performFind",
      method: "get",
      params: {
        "entityName": "OrderItemShipGroup",
        "inputFields": {
          orderId: orderIds,
          orderId_op: "in",
        },
        "fieldList": ["orderId", "contactMechId"],
        "distinct": "Y",
        "viewSize": orderIds.length
      }
    })

    if (!hasError(resp) && resp.data.docs?.length) {
      resp.data.docs.map((contactMech: any) => orderContactMechIds[contactMech.orderId] = contactMech.contactMechId)

      try {
        const postalAddressResp = await api({
          url: "performFind",
          method: "get",
          params: {
            entityName: "PostalAddressAndGeo",
            inputFields: {
              contactMechId: Object.values(orderContactMechIds),
              contactMechId_op: "in"
            },
            viewSize: Object.values(orderContactMechIds).length
          }
        })

        if (!hasError(postalAddressResp) && postalAddressResp?.data.docs?.length) {
          postalAddressResp?.data.docs.map((postalAddress: any) => shippingAddress[postalAddress.contactMechId] = postalAddress);
        } else {
          throw resp?.data;
        }
      } catch (err) {
        logger.error("Failed to fetch postal address info", err)
      }
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error("Failed to fetch customer shipping address", err)
  }
  return {
    orderContactMechIds,
    shippingAddress
  }
}

const getShippingPhoneNumber = async (orderId: string): Promise<any> => {
  let phoneNumber = '' as any
  try {
    let resp: any = await api({
      url: "performFind",
      method: "get",
      params: {
        "entityName": "OrderContactMech",
        "inputFields": {
          orderId,
          "contactMechPurposeTypeId": "PHONE_SHIPPING"
        },
        "fieldList": ["orderId", "contactMechPurposeTypeId", "contactMechId"],
        "viewSize": 1
      }
    })

    if (!hasError(resp)) {
      const contactMechId = resp.data.docs[0].contactMechId
      resp = await api({
        url: "performFind",
        method: "get",
        params: {
          "entityName": "TelecomNumber",
          "inputFields": {
            contactMechId,
          },
          "fieldList": ["contactNumber", "countryCode", "areaCode", "contactMechId"],
          "viewSize": 1
        }
      })
      
      if (!hasError(resp)) {
        const { contactNumber, countryCode, areaCode } =  resp.data.docs[0]
        phoneNumber = formatPhoneNumber(countryCode, areaCode, contactNumber)
      } else {
        throw resp.data
      }
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error('Failed to fetch customer phone number', err)
  }
  return phoneNumber
}

const fetchRejectReasons = async(query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get", // TODO: cache this api request
    params: query,
    cache: true
  })
}

const rejectOrderItems = async (payload: any): Promise <any> => {
  return api({
    url: "rejectOrderItems",
    method: "post",
    data: payload
  });
}

const createOrder = async (payload: any): Promise<any> => {
  return api({
    url: "service/createSalesOrder",
    method: "post",
    data: payload
  });
}

const approveOrder = async (payload: any): Promise<any> => {
  try {
    const resp = await api({
      url: "service/approveSalesOrder",
      method: "POST",
      data: payload
    })
    if(!hasError(resp)) {
      return true;
    } else {
      throw resp?.data;
    }
  } catch(error) {
    logger.error(error)
    return false;
  }
}

export const OrderService = {
  addShipmentBox,
  addTrackingCode,
  approveOrder,
  bulkShipOrders,
  createOrder,
  createOutboundTransferShipment,
  downloadPicklist,
  fetchAdditionalShipGroupForOrder,
  fetchOrderAttribute,
  fetchOrderHeader,
  fetchOrderItems,
  fetchRejectReasons,
  fetchShipmentCarrierDetail,
  fetchShipmentItems,
  fetchShipments,
  fetchShipmentPackages,
  fetchShipmentShippedStatusHistory,
  fetchShippedQuantity,
  fetchTrackingCodes,
  findCompletedOrders,
  findOrderInvoicingInfo,
  findInProgressOrders,
  findTransferOrders,
  findOpenOrders,
  findOrderShipGroup,
  getPicklistData,
  packOrder,
  packOrders,
  printCustomDocuments,
  printPackingSlip,
  printPicklist,
  printShippingLabel,
  printShippingLabelAndPackingSlip,
  printTransferOrder,
  rejectFulfillmentReadyOrderItem,
  rejectOrderItem,
  rejectOrderItems,
  retryShippingLabel,
  shipOrder,
  unpackOrder,
  updateOrder,
  updateOrderItemShipGroup,
  updateShipment,
  updateShipmentPackageRouteSeg,
  updateShipmentRouteSegment,
  fetchShipmentLabelError,
  fetchOrderItemShipGroup,
  fetchShippingAddress,
  fetchOrderPaymentPreferences,
  getShippingPhoneNumber,
  voidShipmentLabel
}
