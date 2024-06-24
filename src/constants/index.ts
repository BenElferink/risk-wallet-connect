export const ADA_TOKEN_ID = '2274b1699f5398170e0497598de7877ebb370ba7b5d25a1d0b2fea075249534b'
export const ADA_TOKEN_DECIMALS = 0
export const ADA_CIRCULATING = 100000000000

export const SOL_TOKEN_ID = ''
export const SOL_TOKEN_DECIMALS = 1
export const SOL_CIRCULATING = 1

export const SOL_NET = 'mainnet-beta'
export const SOL_APP_ADDRESS = ''
export const SOL_APP_SECRET_KEY = (
  Array.isArray(process.env.SOL_APP_SECRET_KEY) ? process.env.SOL_APP_SECRET_KEY : process.env.SOL_APP_SECRET_KEY?.split(',') || []
).map((n) => Number(n))

export const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || ''
export const FIREBASE_APP_ID = process.env.FIREBASE_APP_ID || ''
export const FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN || ''
export const FIREBASE_MESSAGING_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID || ''
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || ''
export const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || ''
