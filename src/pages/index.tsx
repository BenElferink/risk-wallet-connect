import Image from 'next/image'
import Link from 'next/link'
import { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import { useEffect, useState } from 'react'
import { firestore } from '@/utils/firebase'
import ConnectWallets from '@/components/ConnectWallets'
import type { DBWalletPayload } from '@/@types'

export const getServerSideProps = (async ({ query }) => {
  const id = (query.id || '') as string

  if (!!id) {
    const collection = firestore.collection('linked-wallets')
    const doc = await collection.doc(id).get()

    if (doc.exists) {
      return { props: { ...(doc.data() as DBWalletPayload), docId: id } }
    }
  }

  return { props: { docId: id, cardano: '', solana: '' } }
}) satisfies GetServerSideProps<DBWalletPayload & { docId: string }>

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>

const Page = ({ docId, cardano: cardanoAddress, solana: solanaAddress }: PageProps) => {
  const [submitted, setSubmitted] = useState({ id: docId, cardano: cardanoAddress, solana: solanaAddress })

  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(!!cardanoAddress && !!solanaAddress)

  useEffect(() => setReady(true), [])

  return (
    <div className='w-screen h-screen flex flex-col items-center justify-between'>
      <header className='p-4 text-center'>
        <Image src='/media/logo_white.png' alt='logo' className='mx-auto w-[270px] sm:w-[420px]' width={2100} height={800} priority unoptimized />
        <p className='text-sm sm:text-xl'>Link your wallets for cross-chain airdrops!</p>
      </header>

      <main>
        <ConnectWallets ready={ready} done={done} setDone={setDone} submitted={submitted} setSubmitted={setSubmitted} />
      </main>

      <footer className='p-4 text-center'>
        <Link href='https://labs.badfoxmc.com' target='_blank' rel='noopener noreferrer' className='mb-4 flex items-center justify-center'>
          <Image src='https://labs.badfoxmc.com/media/logo/badlabs.png' alt='logo' width={50} height={50} />
          <h5 className='ml-2 text-sm text-start whitespace-nowrap'>
            <span className='text-xs'>Powered by:</span>
            <br />
            Bad Labs
          </h5>
        </Link>
      </footer>
    </div>
  )
}

export default Page
