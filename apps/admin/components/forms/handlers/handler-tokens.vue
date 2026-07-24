<template>
  <div class="relative block w-full">
    <button-secondary class="my-1" label="Ajouter un token" @click="_openModalForm" />
    <list-table
      :headers="TABLE_HEADERS"
      :items="tokens"
      :actions="['remove']"
      @remove="_removeToken($event)"
    />
  </div>
</template>

<script setup>
import listTable from '~/components/data/lists/data-lists-table'
import buttonSecondary from '~/components/elements/buttons/secondary'
import { useModalStore } from '~/store/layout/modal'

const { Token } = useModels()
const { open } = useModalStore()

// Prepare constants
const TABLE_HEADERS = [
  {
    title: 'Nom',
    property: 'name',
    component: 'data-text'
  },
  {
    title: 'Token',
    property: 'token',
    component: 'data-text'
  },
  {
    title: '',
    component: 'actions'
  }
]

// Prepare computed data
const tokens = computed(() => Token.repo.all())

// Prepare methods
const _createToken = async (data) => {
  await Token.create(data)
}

const _removeToken = async ({ _id }) => {
  await Token.remove(_id)
}

const _openModalForm = (action, record) => {
  open({
    onSubmit: _createToken,
    details: {
      title: 'Créer un token',
      subTitle: 'Entrez un nom pour votre token afin de l\'identifier facilement.',
      acceptButton: 'Créer',
      closeButton: 'Annuler'
    },
    attributes: [
      {
        property: 'name',
        componentOptions: {
          placeHolder: 'ex: landing pages, mobile app, ... ',
          name: 'name'
        },
        component: 'input-text'
      }
    ]
  })
}

// Prepare lifecle hooks
onMounted(async () => {
  if (!tokens.value.length) {
    await Token.list()
  }
})
</script>
