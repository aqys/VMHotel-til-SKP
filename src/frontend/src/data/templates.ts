import { IconBrandUbuntu, IconBrandDebian, IconBrandWindows } from '@tabler/icons-vue'
import type { Component } from 'vue'

export interface VmTemplate {
  id: string
  name: string
  osFamily: 'linux' | 'windows'
  osLabel: string
  description: string
  icon: Component
  vcpu: number
  ram: number
  disk: number
}

export const templates: VmTemplate[] = [
  {
    id: 'ubuntu-server-24-04',
    name: 'Ubuntu Server 24.04',
    osFamily: 'linux',
    osLabel: 'Linux',
    description: 'Stabil server-template til udvikling og services.',
    icon: IconBrandUbuntu,
    vcpu: 2,
    ram: 2,
    disk: 20,
  },
  {
    id: 'debian-12',
    name: 'Debian 12',
    osFamily: 'linux',
    osLabel: 'Linux',
    description: 'Minimal server-template til web, services og test.',
    icon: IconBrandDebian,
    vcpu: 1,
    ram: 1,
    disk: 10,
  },
  {
    id: 'windows-11-education',
    name: 'Windows 11 Education',
    osFamily: 'windows',
    osLabel: 'Windows',
    description: 'Windows-miljø til undervisning, test og programmer.',
    icon: IconBrandWindows,
    vcpu: 2,
    ram: 4,
    disk: 30,
  },
]
