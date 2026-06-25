import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { colors } from '@/lib/theme'
import { AuthProvider } from '@/lib/auth'
import { Sentry } from '@/lib/sentry'

function RootLayout() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgPrimary },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="help" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="refund" />
          <Stack.Screen name="support" />
          <Stack.Screen name="modals/paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="scout" />
          <Stack.Screen name="grade-slip" />
          <Stack.Screen name="game-factors" />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default Sentry.wrap(RootLayout)
