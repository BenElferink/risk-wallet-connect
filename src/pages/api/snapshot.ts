import type { NextApiRequest, NextApiResponse } from 'next'
import { firestore } from '@/utils/firebase'
import blockfrost from '@/utils/blockfrost'
import formatHex from '@/functions/formatHex'
import formatTokenAmount from '@/functions/formatTokenAmount'
import type { DBWalletPayload } from '@/@types'
import type { components } from '@blockfrost/openapi'

export const config = {
  maxDuration: 300,
  api: {
    responseLimit: false,
  },
}

const RISK_COIN = '2274b1699f5398170e0497598de7877ebb370ba7b5d25a1d0b2fea07'
const ULTIMATE_PASSES = '307b48294240e20b5d74fca33fbd84f19f1fe6ac178b3739e55fe52a'
const BANK_HEROES_AND_VILLAINS = '639fe89bd9619ed415273de2ba5927b5fecccce1f818c5bc01f0411c'
const BANK_CARDS = '1d52a061c0b6daea2cb248d32790fbf32d21b78723fcfde75177f176'

const policies = [RISK_COIN, ULTIMATE_PASSES, BANK_HEROES_AND_VILLAINS, BANK_CARDS]

const supply = 1000000000000
const percentages = {
  risk: 0.04,
  ultimate: 0.01,
  bank: 0.01,
  tax: 0.02,
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req

  try {
    switch (method) {
      case 'GET': {
        if (process.env.NODE_ENV !== 'development') return res.status(406).end()

        const collection = firestore.collection('risk-wallets')
        const { docs } = await collection.get()
        const linkedWallets = docs.map((d) => ({ ...(d.data() as DBWalletPayload), id: d.id })).filter((d) => !!d.cardano && !!d.solana)

        const snapshot: {
          [address: string]: {
            riskCount: number
            bankCount: number
            ultimateCount: number
            ultimateTraits: string[]
          }
        } = {}

        const getMetadata = (asset?: components['schemas']['asset']) => {
          const meta: Record<string, any> = {}

          Object.entries(asset?.onchain_metadata?.attributes || asset?.onchain_metadata || asset?.metadata || {}).forEach(([key, val]) => {
            if (asset?.onchain_metadata_standard === 'CIP68v1') {
              meta[key] = formatHex.fromHex(val?.toString() || 'X').slice(1)
            } else {
              if (typeof val === 'object' && !Array.isArray(val)) {
                Object.entries(val).forEach(([subKey, subVal]) => {
                  meta[subKey] = subVal?.toString()
                })
              } else {
                meta[key] = val?.toString()
              }
            }
          })

          return meta
        }

        for await (const pId of policies) {
          console.log('\n')
          console.log('Policy:', pId)

          const isRisk = [RISK_COIN].includes(pId)
          const isUltimate = [ULTIMATE_PASSES].includes(pId)
          const isBank = [BANK_HEROES_AND_VILLAINS, BANK_CARDS].includes(pId)
          const assets = await blockfrost.assetsPolicyByIdAll(pId)

          for (const { asset: unit } of assets) {
            console.log('Unit:', unit)

            const needToFetchAsset = isRisk || isUltimate
            const asset = needToFetchAsset ? await blockfrost.assetsById(unit) : undefined
            const addresses: components['schemas']['asset_addresses'] = []

            for (let page = 1, loop = true; loop; page++) {
              const fetched = await blockfrost.assetsAddresses(unit, {
                count: 100,
                page,
                order: 'asc',
              })

              if (!fetched.length) loop = false
              else addresses.push(...fetched)
            }

            addresses.forEach(({ address, quantity }) => {
              const num = Number(quantity)

              if (!snapshot[address]) {
                snapshot[address] = {
                  riskCount: 0,
                  bankCount: 0,
                  ultimateCount: 0,
                  ultimateTraits: [],
                }
              }

              if (isRisk) {
                snapshot[address]['riskCount'] += formatTokenAmount.fromChain(num, asset?.metadata?.decimals || 0)
              }

              if (isBank) {
                snapshot[address]['bankCount'] += num
              }

              if (isUltimate) {
                const metadata = getMetadata(asset)

                snapshot[address]['ultimateCount'] += num
                snapshot[address]['ultimateTraits'].push(metadata['type'])
              }
            })
          }
        }

        const totalShares = {
          risk: 0,
          bank: 0,
          ultimate: 0,
        }

        const linkedHolders: {
          cardano: string
          solana: string
          shares: {
            risk: number
            bank: number
            ultimate: number
          }
        }[] = []

        const getSharesForTrait = (str: string) => {
          switch (str) {
            case 'Blue':
              return 1
            case 'Red':
              return 2
            case 'Green':
              return 3
            case 'Purple':
              return 4
            case 'White':
              return 5
            case 'Ultimate Warrior':
              return 20
            default:
              return 0
          }
        }

        const entries = Object.entries(snapshot)

        for await (const [address, obj] of entries) {
          console.log('Address:', address)

          const { script, stake_address } = await blockfrost.addresses(address)
          const addresses = (stake_address ? await blockfrost.accountsAddressesAll(stake_address) : [{ address }]).map(({ address: a }) => a)
          const foundLink = linkedWallets.find(({ cardano }) => addresses.includes(cardano))

          if (foundLink && script) {
            // throw new Error(`address is script & linked! ${address}`)
            console.warn(`address is script & linked! ${address}`)
          }

          if (foundLink) {
            const { riskCount, bankCount, ultimateTraits } = obj

            const riskShares = Math.floor(riskCount / 20000000)
            const bankShares = bankCount
            let ultimateShares = 0
            ultimateTraits.forEach((str) => (ultimateShares += getSharesForTrait(str)))

            totalShares['risk'] += riskShares
            totalShares['bank'] += bankShares
            totalShares['ultimate'] += ultimateShares

            linkedHolders.push({
              cardano: foundLink['cardano'],
              solana: foundLink['solana'],
              shares: {
                risk: riskShares,
                bank: bankShares,
                ultimate: ultimateShares,
              },
            })
          }
        }

        const airdrop = linkedHolders.map(({ cardano, solana, shares }) => ({
          cardano,
          solana,
          coins: Math.floor(
            (((supply * percentages['risk']) / totalShares['risk']) * shares['risk'] +
              ((supply * percentages['bank']) / totalShares['bank']) * shares['bank'] +
              ((supply * percentages['ultimate']) / totalShares['ultimate']) * shares['ultimate']) *
              (1 - percentages['tax'])
          ),
        }))

        console.log('Done!')

        return res.status(200).json({
          totalShares,
          airdrop,
          snapshot,
        })
      }

      default: {
        res.setHeader('Allow', 'GET')
        return res.status(405).end()
      }
    }
  } catch (error) {
    console.error(error)

    return res.status(500).end()
  }
}

export default handler
