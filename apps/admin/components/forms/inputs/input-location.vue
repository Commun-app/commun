<template>
  <div class="relative">
    <div class="relative">
      <input-text
        :auto-complete="'street-address'"
        :label="label"
        :name="name"
        :place-holder="placeHolder"
        :value="search || selection.address"
        @change="search = $event"
      />
      <transition
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="display && places.length"
          ref="dropdown"
          class="absolute mt-1 w-full rounded-md bg-white shadow-lg z-50"
        >
          <ul tabindex="-1" role="listbox" aria-labelledby="listbox-label" aria-activedescendant="listbox-item-3" class="max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            <li
              v-for="({ id, place }, i) in places"
              :id="`listbox-item-${i}`"
              :key="id"
              class="cursor-default select-none relative py-2 pl-4 pr-4 hover:text-white hover:bg-indigo-600 text-gray-900"
              role="option"
              @click="_select(id)"
            >
              <span class="font-normal block truncate">
                {{ place }}
              </span>
            </li>
          </ul>
        </div>
      </transition>
    </div>
    <div class="w-full mt-2 border border-gray-200 rounded-md" style="min-height: 18rem;">
      <div id="map" class="w-full h-full" style="min-height: 18rem;" />
    </div>
  </div>
</template>

<script setup>
import { onClickOutside, useDebounceFn } from '@vueuse/core'
import axios from 'axios'
import mapbox, { Map, Marker } from 'mapbox-gl'
import inputText from '~/components/forms/inputs/input-text'

// Prepare composable
const $config = useRuntimeConfig()

// Prepare $emitters
const $emitters = defineEmits(['change'])

// Prepare props
const $props = defineProps({
  name: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeHolder: {
    type: String,
    default: ''
  },
  value: {
    type: Object,
    default: () => ({})
  }
})

// Prepare constant
const MAPBOX_CLIENT = axios.create({ baseURL: 'https://api.mapbox.com/geocoding/v5/mapbox.places' })

// Prepare data
const dropdown = ref(undefined)
const map = ref(undefined)
const marker = ref(undefined)
const search = ref('')
const list = ref([])
const selection = ref({})
const display = ref(false)
const isLoading = ref(false)

// Prepare computed
const places = computed(() => list.value.map(({ id, place_name_fr: place, center }) => ({ id, place, center })))

// Prepare methods
const _createMap = () => {
  mapbox.accessToken = $config.public.mapBoxToken
  map.value = new Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11?optimized=true',
    zoom: 13,
    center: selection.value?.coordinates,
    attributionControl: false,
    interactive: true
  })
  map.value.on('load', _updateMarker)
}
const _updateMarker = () => {
  if (selection.value?.coordinates?.length) {
    marker.value = new Marker({ color: '#000' })
      .setLngLat(selection.value?.coordinates)
      .addTo(map.value)
    map.value.flyTo({ center: selection.value.coordinates })
  }
}
const _findLocation = useDebounceFn(async () => {
  if (!isLoading.value && search.value) {
    isLoading.value = true
    try {
      const { data: { features } } = await MAPBOX_CLIENT.get(
        `/${search.value}.json?access_token=${$config.public.mapBoxToken}&types=postcode,district,place,locality,neighborhood,address,poi&autocomplete=true&country=fr&language=fr`
      )
      list.value = [...features]
    } catch (err) {
      console.log(err)
    } finally {
      isLoading.value = false
    }
  }
}, 300)
const _select = (id) => {
  const { place_name_fr: address, center: coordinates } = list.value.find(({ id: check }) => check === id) || {}
  if (address && coordinates) {
    selection.value = {
      address,
      coordinates
    }
    _updateMarker()
    _close()
    $emitters('change', selection.value)
  }
}
const _toggle = () => {
  display.value = !display.value
}
const _close = () => {
  search.value = ''
  display.value = false
}

// Prepare watchers
watch(
  search,
  (newValue) => {
    if (newValue && newValue !== selection.value?.address) {
      if (!display.value) {
        _toggle()
      }
      _findLocation(newValue)
    } else {
      _close()
    }
  }
)
watch(
  () => $props.value,
  (newValue) => {
    if (newValue.address && newValue.coordinates) {
      selection.value = {
        address: newValue.address,
        coordinates: newValue.coordinates,
      }
    }
  },
  { immediate: true }
)

// Prepare lifecycle hooks
onMounted(_createMap)
onClickOutside(dropdown, _close)
</script>
