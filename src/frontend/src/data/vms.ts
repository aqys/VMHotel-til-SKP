import { reactive } from 'vue'
import { logVmActivity } from './vmActivity'

export interface Vm {
  name: string
  os: string
  status: 'running' | 'stopped'
  vcpu: number
  ram: number
  disk: number
  ip: string
  createdLabel: string
  createdTimeLabel: string
  sinceLabel: string
  vmId: number
  node: string
  hostname: string
  template: string
  mac: string
  bridge: string
  nic: string
  cpuUsagePercent: number
  ramUsedGb: number
  diskUsedGb: number
  description?: string
}

export const vms = reactive<Vm[]>([
  {
    name: 'Ubuntu_Dev_Server',
    os: 'Ubuntu 22.04 LTS',
    status: 'running',
    vcpu: 2,
    ram: 4,
    disk: 10,
    ip: '192.168.1.10',
    createdLabel: '08.08.2026',
    createdTimeLabel: '13:42',
    sinceLabel: '3 dage 14 timer',
    vmId: 104,
    node: 'proxmox01',
    hostname: 'ubuntu-dev-server',
    template: 'Ubuntu Server 22.04',
    mac: 'BC:24:11:5A:3C:9F',
    bridge: 'vmbr0',
    nic: 'VirtIO',
    cpuUsagePercent: 37,
    ramUsedGb: 2.7,
    diskUsedGb: 8.4,
  },
  {
    name: 'Debian_Web_Server',
    os: 'Debian 12',
    status: 'running',
    vcpu: 2,
    ram: 2,
    disk: 10,
    ip: '192.168.1.20',
    createdLabel: '10.08.2026',
    createdTimeLabel: '09:15',
    sinceLabel: '1 dag 8 timer',
    vmId: 105,
    node: 'proxmox01',
    hostname: 'debian-web-server',
    template: 'Debian 12 Server',
    mac: 'BC:24:11:7E:1B:22',
    bridge: 'vmbr0',
    nic: 'VirtIO',
    cpuUsagePercent: 22,
    ramUsedGb: 1.1,
    diskUsedGb: 5.2,
  },
  {
    name: 'Windows11_Lab_Test',
    os: 'Windows 11 Education',
    status: 'stopped',
    vcpu: 2,
    ram: 4,
    disk: 9,
    ip: '192.168.1.30',
    createdLabel: '06.08.2026',
    createdTimeLabel: '10:05',
    sinceLabel: 'i går',
    vmId: 106,
    node: 'proxmox02',
    hostname: 'win11-lab-test',
    template: 'Windows 11 Education',
    mac: 'BC:24:11:9C:44:D1',
    bridge: 'vmbr0',
    nic: 'E1000',
    cpuUsagePercent: 0,
    ramUsedGb: 0,
    diskUsedGb: 8,
  },
])

export const statusLabels: Record<Vm['status'], string> = {
  running: 'Kører',
  stopped: 'Stoppet',
}

export function toggleVmStatus(vm: Vm) {
  vm.status = vm.status === 'running' ? 'stopped' : 'running'
  vm.sinceLabel = 'lige nu'
  if (vm.status === 'stopped') {
    vm.cpuUsagePercent = 0
    vm.ramUsedGb = 0
  }
  logVmActivity(vm.name, vm.status === 'running' ? 'VM startet' : 'VM stoppet')
}

export function restartVm(vm: Vm) {
  if (vm.status !== 'running') return
  vm.sinceLabel = 'lige nu'
  logVmActivity(vm.name, 'VM genstartet')
}

export function forceStopVm(vm: Vm) {
  if (vm.status !== 'running') return
  vm.status = 'stopped'
  vm.sinceLabel = 'lige nu'
  vm.cpuUsagePercent = 0
  vm.ramUsedGb = 0
  logVmActivity(vm.name, 'VM tvangsstoppet')
}

const resourceFieldLabels = { vcpu: 'vCPU', ram: 'RAM', disk: 'Disk' } as const

export function updateVmResource(vm: Vm, field: 'vcpu' | 'ram' | 'disk', value: number) {
  const previous = vm[field]
  vm[field] = value
  const unit = field === 'vcpu' ? '' : ' GB'
  logVmActivity(vm.name, `${resourceFieldLabels[field]} ændret fra ${previous}${unit} til ${value}${unit}`)
}

function nextVmId(): number {
  return vms.reduce((max, v) => Math.max(max, v.vmId), 100) + 1
}

function randomMac(): string {
  const segment = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `BC:24:11:${segment()}:${segment()}:${segment()}`
}

function nextIp(): string {
  const used = new Set(vms.map((v) => v.ip))
  let host = 40
  while (used.has(`192.168.1.${host}`)) host++
  return `192.168.1.${host}`
}

function nowLabels() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    createdLabel: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`,
    createdTimeLabel: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  }
}

export function createVm(input: {
  name: string
  hostname: string
  os: string
  template: string
  osFamily: 'linux' | 'windows'
  vcpu: number
  ram: number
  disk: number
}): Vm {
  const { createdLabel, createdTimeLabel } = nowLabels()
  const vm: Vm = {
    name: input.name,
    os: input.os,
    status: 'running',
    vcpu: input.vcpu,
    ram: input.ram,
    disk: input.disk,
    ip: nextIp(),
    createdLabel,
    createdTimeLabel,
    sinceLabel: 'lige nu',
    vmId: nextVmId(),
    node: 'prox01',
    hostname: input.hostname,
    template: input.template,
    mac: randomMac(),
    bridge: 'vmbr0',
    nic: input.osFamily === 'windows' ? 'E1000' : 'VirtIO',
    cpuUsagePercent: Math.floor(Math.random() * 8) + 3,
    ramUsedGb: Math.round(input.ram * 0.15 * 10) / 10,
    diskUsedGb: Math.round(input.disk * 0.2 * 10) / 10,
  }
  vms.push(vm)
  logVmActivity(vm.name, 'VM oprettet')
  return vm
}
