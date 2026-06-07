import { computed, ref } from 'vue'

export function useMonths() {
  const months = computed(() => {
    const result = []
    const now = new Date()
    for (let y = now.getFullYear() - 1; y <= now.getFullYear(); y++) {
      for (let m = 1; m <= 12; m++) {
        result.push(y.toString() + String(m).padStart(2, '0'))
      }
    }
    return result.reverse()
  })
  return { months }
}

export function usePagination() {
  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  function reset() { page.value = 1 }
  return { page, pageSize, total, reset }
}
