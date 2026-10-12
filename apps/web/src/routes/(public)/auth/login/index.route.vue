<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearIdentity, refreshIdentity } from '@/framework/identity'
import Logo from '@/assets/corporate/common/Logo.vue'
import { resolvePostLoginRoute } from '@/router/navigation'
import { consumePostLoginRedirect } from '@/utils/post-login-redirect'
import Card from '@southneuhof/loom/components/base/Card.vue'
import Toast from '@southneuhof/loom/components/base/Toast.vue'
import Button from '@southneuhof/loom/components/base/Button.vue'
import Spinner from '@southneuhof/loom/components/base/Spinner.vue'
import TextInput from '@southneuhof/loom/components/inputs/TextInput.vue'
import PasswordInput from '@southneuhof/loom/components/inputs/PasswordInput.vue'
import { rpc } from '@/framework/rpc'

const loginMessage = ref<{ message: string; type: 'error' | 'warning' | 'info' | 'success' | undefined }>({ message: '', type: undefined })
const router = useRouter()
const loading = ref(false)
const formData = ref({ email: '', password: '' })

const INVALID_CREDENTIALS_MESSAGE = 'Email atau password tidak valid'
const CONNECTION_ERROR_MESSAGE = 'Tidak dapat terhubung ke server. Silakan coba lagi'
const PERMISSION_ERROR_MESSAGE = 'Gagal memuat akses aplikasi. Silakan coba lagi'
const NO_DESTINATION_MESSAGE = 'Tidak ada halaman yang dapat diakses oleh akun ini'

function clearStagedAccess() {
  clearIdentity()
}

async function rejectLogin(message: string, sessionEstablished: boolean, clearAccess = false) {
  if (clearAccess) clearStagedAccess()
  if (sessionEstablished) {
    try {
      await rpc.api.auth['sign-out'].$post()
    } catch (_) {}
  }
  loginMessage.value = { message, type: 'error' }
}

async function login() {
  loading.value = true
  loginMessage.value = { message: '', type: undefined }
  let sessionEstablished = false
  let failureStage: 'sign-in' | 'identity' = 'sign-in'
  try {
    const loginResponse = await rpc.api.auth['sign-in'].email.$post({ json: formData.value })
    if (!loginResponse.ok) {
      await rejectLogin(INVALID_CREDENTIALS_MESSAGE, false)
      return
    }

    const loginData = await loginResponse.json()
    if (!loginData?.user) {
      await rejectLogin(INVALID_CREDENTIALS_MESSAGE, false)
      return
    }

    sessionEstablished = true
    failureStage = 'identity'
    const identity = await refreshIdentity()
    if (!identity) {
      await rejectLogin(PERMISSION_ERROR_MESSAGE, sessionEstablished, true)
      return
    }

    const destination = resolvePostLoginRoute(router, consumePostLoginRedirect())
    if (!destination) {
      await rejectLogin(NO_DESTINATION_MESSAGE, sessionEstablished, true)
      return
    }

    await router.push(destination)
  } catch (_) {
    await rejectLogin(failureStage === 'identity' ? PERMISSION_ERROR_MESSAGE : CONNECTION_ERROR_MESSAGE, sessionEstablished, failureStage === 'identity')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Card class="flex flex-col gap-16 p-8">
    <div class="flex flex-row items-center gap-8"><Logo class="w-16" /></div>
    <div class="flex flex-col gap-4">
      <div class="text-lg">Welcome to</div>
      <div class="text-4xl font-bold">Demo App</div>
    </div>
    <form class="flex flex-col items-center gap-4" @submit.prevent="login">
      <TextInput class="w-full" :model-value="formData.email" @update:model-value="(value) => (formData.email = String(value))" label="Email" required />
      <PasswordInput class="w-full" :model-value="formData.password" @update:model-value="(value) => (formData.password = String(value))" label="Password" required />
      <div v-if="!loading" class="flex w-full flex-row items-center gap-2">
        <Button :disabled="loading" type="submit" class="mt-6 w-full">Login</Button>
      </div>
      <Button v-else disabled variant="tonal" class="mt-6 w-full"><Spinner /></Button>
    </form>
    <div class="flex w-full items-center justify-center">
      <Toast v-if="loginMessage.message" :type="loginMessage.type">{{ loginMessage.message }}</Toast>
    </div>
    <div class="text-center text-muted">Company Ltd.</div>
  </Card>
</template>
