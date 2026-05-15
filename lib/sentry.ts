import * as Sentry from '@sentry/react-native'

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN
  || 'https://e60cdbc897904add2c127eab55e26fd0@o4511394241380352.ingest.us.sentry.io/4511394259009536'

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  debug: __DEV__,
  sendDefaultPii: false,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
})

export { Sentry }
