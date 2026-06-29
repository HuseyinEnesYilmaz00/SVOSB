 import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Siyer Vakfı</h1>
        <p className="text-gray-500 mb-8">Öğrenci Bilgi Sistemi</p>
        <Link 
          href="/giris"
          className="bg-green-700 text-white px-6 py-3 rounded-lg hover:bg-green-800 transition"
        >
          Giriş Yap
        </Link>
      </div>
    </main>
  )
}

