import { defineStore } from 'pinia'

export const useHeadingsStore = defineStore('layout/headings', () => {
  // State
  const headings = ref({
    title: '',
    description: '',
    mainAction: ''
  })

  // Getters
  const hasHeadings = computed(() => Object.values(headings.value).filter(val => !!val).length) 

  // Actions
  function updateHeadings({ title, description, mainAction }) {
    Object.assign(headings.value, { title, description, mainAction })
  }

  return { headings, hasHeadings, updateHeadings }
})

