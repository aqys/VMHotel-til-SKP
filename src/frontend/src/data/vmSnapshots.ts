import { reactive } from 'vue'

export interface VmSnapshot {
  id: string
  name: string
  createdLabel: string
  description?: string
}

export const vmSnapshots = reactive<Record<string, VmSnapshot[]>>({
  Ubuntu_Dev_Server: [
    { id: 's1', name: 'before-update', createdLabel: '11.08.2026 13:24' },
    { id: 's2', name: 'clean-install', createdLabel: '08.08.2026 14:02' },
  ],
  Debian_Web_Server: [{ id: 's3', name: 'initial-setup', createdLabel: '10.08.2026 09:30' }],
  Windows11_Lab_Test: [],
})
