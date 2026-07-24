import { defineAbility } from '@casl/ability'

// Prepare abilities array
let _abilities = defineAbility((can) => {
  can('entrance', 'self')
})

export default () => {
  // Prepare reusable methods
  function resetAbilities() {
    return _abilities?.update([])
  }

  function assignAbilities(permissions) {
    resetAbilities()
    _abilities = defineAbility((can) => {
      permissions.forEach((permission) => {
        const [action, subject] = permission.split(':')
        can(action, subject)
      })
    })
  }

  function can(permission) {
    const [action, subject, collection] = permission.split(':')
    if (!_abilities?.can(action, subject)) {
      return false
    }
    return true
  }

  return {
    _abilities,
    resetAbilities,
    assignAbilities,
    can,
  }
}
