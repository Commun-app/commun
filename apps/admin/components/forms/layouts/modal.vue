<template>
  <transition
    enter-active-class="ease-out duration-200"
    enter-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-200"
    leave-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="display" class="fixed z-20 inset-0 overflow-y-auto" @keyup.escape="modalStore.close">
      <div class="flex items-end justify-center min-h-screen text-center sm:block">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-600 bg-opacity-50 transition-opacity" aria-hidden="true" />
        </div>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <transition
          enter-active-class="ease-out duration-300"
          enter-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="ease-in duration-200"
          leave-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="display"
            class="inline-block align-bottom bg-white sm:max-w-4xl w-full rounded-lg px-4 pt-5 pb-4 text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
          >
            <div>
              <div class="my-3 text-center sm:mt-5">
                <h3 id="modal-headline" class="text-lg leading-6 font-medium text-gray-900">
                  {{ title }}
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    {{ subTitle }}
                  </p>
                </div>
              </div>
              <form-default 
                v-if="attributes.length"
                :record="record"
                :attributes="attributes"
                @change="modalStore.updateRecord"
              />
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button-secondary
                v-if="closeButton"
                :label="closeButton"
                @click="modalStore.close"
              />
              <button-primary
                v-if="acceptButton"
                :label="acceptButton"
                @click="modalStore.submit"
              />
            </div>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script setup>
import formDefault from '~/components/forms/layouts/form'
import buttonPrimary from '~/components/elements/buttons/primary'
import buttonSecondary from '~/components/elements/buttons/secondary'
import { useModalStore } from '~/store/layout/modal'

const modalStore = useModalStore()

// Prepare emits
defineEmits(['keyup.escape'])

// Prepare computed
const display = computed(() => modalStore.display)
const title = computed(() => modalStore.title)
const subTitle = computed(() => modalStore.subTitle)
const attributes = computed(() => modalStore.attributes)
const record = computed(() => modalStore.record)
const acceptButton = computed(() => modalStore.acceptButton)
const closeButton = computed(() => modalStore.closeButton)
</script>
