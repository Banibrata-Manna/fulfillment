import { MutationTree } from 'vuex'
import UserState from './UserState'
import * as types from './mutation-types'

const mutations: MutationTree <UserState> = {
    [types.USER_TOKEN_CHANGED] (state, payload) {
        state.token = payload.newToken
    },
    [types.USER_END_SESSION] (state) {
      state.token = ''
      state.current = {},
      state.currentFacility = {}
      state.currentEComStore = {}
      state.permissions = [],
      state.allNotificationPrefs = []
    },
    [types.USER_INFO_UPDATED] (state, payload) {
        state.current = { ...state.current,  ...payload}
    },
    [types.USER_CURRENT_FACILITY_UPDATED] (state, payload) {
        state.currentFacility = payload;
    },
    [types.USER_INSTANCE_URL_UPDATED] (state, payload) {
        state.instanceUrl = payload;
    },
    [types.USER_CURRENT_ECOM_STORE_UPDATED](state, payload) {
        state.currentEComStore = payload;
    },
    [types.USER_PREFERENCE_UPDATED] (state, payload) {
        state.preference = {...state.preference, ...payload};
    },
    [types.USER_PERMISSIONS_UPDATED] (state, payload) {
        state.permissions = payload
    },
    [types.USER_FIELD_MAPPINGS_UPDATED] (state, payload) {
        state.fieldMappings = payload;
    },  
    [types.USER_CURRENT_FIELD_MAPPING_UPDATED] (state, payload) {
        state.currentMapping = payload
    },
    [types.USER_FIELD_MAPPING_CREATED] (state, payload) {
        (state.fieldMappings as any)[payload.type][payload.id] = {
            name: payload.name,
            value: payload.value
        };
    },
    [types.USER_PWA_STATE_UPDATED](state, payload) {
        state.pwaState.registration = payload.registration;
        state.pwaState.updateExists = payload.updateExists;
    },
    [types.USER_NOTIFICATIONS_UPDATED] (state, payload) {
        state.notifications = payload
    },
    [types.USER_NOTIFICATIONS_PREFERENCES_UPDATED] (state, payload) {
        state.notificationPrefs = payload
    },
    [types.USER_FIREBASE_DEVICEID_UPDATED] (state, payload) {
        state.firebaseDeviceId = payload
    },
    [types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED] (state, payload) {
        state.hasUnreadNotifications = payload
    },
    [types.USER_ALL_NOTIFICATION_PREFS_UPDATED] (state, payload) {
        state.allNotificationPrefs = payload
    },
    [types.USER_NEW_REJECTION_API_CONFIG_UPDATED] (state, payload) {
        state.newRejectionApiConfig = payload
    },
    [types.USER_PARTIAL_ORDER_REJECTION_CONFIG_UPDATED] (state, payload) {
        state.partialOrderRejectionConfig = payload
    },
    [types.USER_COLLATERAL_REJECTION_CONFIG_UPDATED] (state, payload) {
        state.collateralRejectionConfig = payload
    },
    [types.USER_DISABLE_SHIP_NOW_CONFIG_UPDATED] (state, payload) {
        state.isShipNowDisabled = payload
    },
    [types.USER_DISABLE_UNPACK_CONFIG_UPDATED] (state, payload) {
        state.isUnpackDisabled = payload
    }
}
export default mutations;