/**
 * "Mande seu primeiro material e ganhe 7 dias do Intensivo" while the trial opens on the next material (verified
 * e-mail, prd-planos-lancamento RF-F2), else null. The days and the name come from the catalog.
 */
export function useTrialInvite() {
  const auth = useAuthStore()
  const { plans } = usePlans()
  const proName = useProName()
  return computed(() => {
    const days = offeredTrial(plans.value)?.days
    return auth.opensTrialOnUse && days ? trialInvite(proName.value, days) : null
  })
}
