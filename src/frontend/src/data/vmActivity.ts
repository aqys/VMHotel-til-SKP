import { reactive } from 'vue'

export interface VmActivityEntry {
  id: string
  timestampLabel: string
  text: string
  actor?: string
  failed?: boolean
  detail?: string
}

export const vmActivity = reactive<Record<string, VmActivityEntry[]>>({
  Ubuntu_Dev_Server: [
    { id: 'a1', timestampLabel: '11.08.2026 14:32', text: 'VM startet', actor: 'Mikkel Larsen' },
    { id: 'a2', timestampLabel: '11.08.2026 13:54', text: 'RAM ændret fra 2 GB til 4 GB', actor: 'Mikkel Larsen' },
    {
      id: 'a3',
      timestampLabel: '11.08.2026 12:41',
      text: 'Genstart mislykkedes',
      actor: 'Mikkel Larsen',
      failed: true,
      detail: 'Proxmox task returned an error',
    },
    { id: 'a4', timestampLabel: '10.08.2026 16:12', text: 'Snapshot "before-update" oprettet', actor: 'Mikkel Larsen' },
    { id: 'a5', timestampLabel: '08.08.2026 13:42', text: 'VM oprettet' },
  ],
  Debian_Web_Server: [
    { id: 'b1', timestampLabel: '10.08.2026 09:20', text: 'VM startet', actor: 'Mikkel Larsen' },
    { id: 'b2', timestampLabel: '10.08.2026 09:15', text: 'VM oprettet' },
  ],
  Windows11_Lab_Test: [
    { id: 'c1', timestampLabel: '10.08.2026 18:47', text: 'VM stoppet', actor: 'Mikkel Larsen' },
    { id: 'c2', timestampLabel: '06.08.2026 10:05', text: 'VM oprettet' },
  ],
})

export function formatNowLabel(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function logVmActivity(
  vmName: string,
  text: string,
  opts: { failed?: boolean; detail?: string; actor?: string } = {},
) {
  if (!vmActivity[vmName]) vmActivity[vmName] = []
  vmActivity[vmName]!.unshift({
    id: `${vmName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestampLabel: formatNowLabel(),
    text,
    actor: 'Mikkel Larsen',
    ...opts,
  })
}
