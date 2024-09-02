import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state: {
      token: '',
      permissions: [],
      current: {},
      currentFacility: {},
      instanceUrl: '',
      preference: {
        printShippingLabel: false,
        printPackingSlip: false
      },
      pwaState: {
        updateExists: false,
        registration: null,
      },
      fieldMappings: {},
      currentMapping: {
        id: '',
        mappingType: '',
        name: '',
        value: {}
      },
      notifications: [],
      notificationPrefs: [],
      firebaseDeviceId: '',
      hasUnreadNotifications: true,
      allNotificationPrefs: [],
      partialOrderRejectionConfig: {},
      collateralRejectionConfig: {}
    },
    getters,
    actions,
    mutations,
}

// TODO
// store.registerModule('user', userModule);
export default userModule;