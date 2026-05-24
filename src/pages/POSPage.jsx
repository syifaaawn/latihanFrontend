import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PaymentModal from '../components/pos/PaymentModal';
import ReceiptModal from '../components/pos/ReceiptModal';

const BASE_URL = 'http://127.0.0.1:8000/api';

const formatRupiah = (number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('Semua');
  const [categories, setCategories] = useState(['Semua']);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentUser();
    fetchProducts();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    } catch (err) {
      console.error('Gagal ambil data user', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/produks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.data || res.data;
      setProducts(Array.isArray(data) ? data : []);
      
      // Ambil kategori unik dari properti p.kategori
      const cats = ['Semua', ...new Set(data.map((p) => p.kategori).filter(Boolean))];
      setCategories(cats);
    } catch (err) {
      console.error('Gagal mengambil produk', err);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Menggunakan nama_barang sesuai dengan database Laravel
  const filteredProducts = products.filter((p) => {
    const matchSearch = (p.nama_barang || p.namaBarang || '').toLowerCase().includes(search.toLowerCase());
    const matchKategori = kategori === 'Semua' || p.kategori === kategori;
    return matchSearch && matchKategori;
  });

  const addToCart = (product) => {
    if (product.stok <= 0) return;
    setCart((prev) => {
      // PERBAIKAN: mencari berdasarkan product_id (pake 'o') agar konsisten
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stok) return prev;
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          // PERBAIKAN UTAMA: Ubah dari produk_id menjadi product_id agar divalidasi sukses oleh Laravel
          product_id: product.id,
          nama: product.nama_barang || product.namaBarang, // Ambil nama yang tersedia
          harga: product.harga,
          quantity: 1,
          stok: product.stok,
        },
      ];
    });
  };

  const updateQty = (product_id, qty) => {
    if (qty < 1) {
      removeFromCart(product_id);
      return;
    }
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== product_id) return i;
        if (qty > i.stok) return i;
        return { ...i, quantity: qty };
      })
    );
  };

  const removeFromCart = (product_id) => {
    setCart((prev) => prev.filter((i) => i.product_id !== product_id));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, i) => sum + i.harga * i.quantity, 0);

  const handleOrderSuccess = (orderData) => {
    setLastOrder(orderData);
    setShowPayment(false);
    setShowReceipt(true);
    clearCart();
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Panel Kiri Produk */}
      <div className="flex flex-col flex-1 p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Kasir Point of Sale</h1>
            <p className="text-sm text-gray-500">
              Kasir: <span className="font-semibold">{currentUser?.name || '...'}</span>
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-200 text-sm"
          >
            Kembali
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Cari produk..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="px-4 py-2 border rounded-lg focus:outline-none"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Grid Produk */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">
            Memuat produk...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 content-start pb-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`bg-white rounded-xl p-3 shadow-sm cursor-pointer border-2 border-transparent transition-all hover:shadow-md hover:border-blue-400 ${
                  product.stok <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="w-full h-28 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                  {product.gambar ? (
                    <img
                      src={`${product.gambar}`}
                      alt={product.nama_barang || product.namaBarang}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={product.gambar ? 'hidden' : 'flex'} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                    📦
                  </div>
                </div>
                {/* FIX: Menggunakan snake_case untuk properti barang */}
                <p className="text-xs text-gray-400">{product.kode_barang || product.kodeBarang}</p>
                <p className="font-semibold text-sm truncate">{product.nama_barang || product.namaBarang}</p>
                <p className="text-blue-600 font-bold text-sm">{formatRupiah(product.harga)}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    {product.kategori}
                  </span>
                  <span className={`text-xs ${product.stok <= 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                    {product.stok <= 0 ? 'Habis' : `Stok: ${product.stok}`}
                  </span>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-4 text-center text-gray-400 py-12">
                Produk tidak ditemukan
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel Kanan Keranjang */}
      <div className="w-96 bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b bg-blue-600 text-white">
          <h2 className="text-lg font-bold">Keranjang Belanja</h2>
          <p className="text-sm opacity-80">{cart?.length || 0} item dipilih</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!cart || cart.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-sm">Klik produk untuk menambah ke keranjang</p>
            </div>
          ) : (
            cart.map((item) => (
              // PERBAIKAN: Menggunakan item.product_id sesuai perubahan state di atas
              <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.nama}</p>
                  <p className="text-blue-600 text-sm">{formatRupiah(item.harga)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQty(item.product_id, item.quantity - 1)}
                    className="w-7 h-7 bg-gray-200 rounded-full text-sm font-bold hover:bg-red-100 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-7 text-center font-bold text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.product_id, item.quantity + 1)}
                    className="w-7 h-7 bg-gray-200 rounded-full text-sm font-bold hover:bg-green-100 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatRupiah(item.harga * item.quantity)}</p>
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="text-red-400 text-xs hover:text-red-600"
                  >
                    hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t space-y-3 bg-gray-50">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total</span>
            <span className="text-blue-600">{formatRupiah(total)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              disabled={!cart || cart.length === 0}
              className="flex-1 py-2 border border-red-400 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40 font-medium"
            >
              Batal
            </button>
            <button
              onClick={() => setShowPayment(true)}
              disabled={!cart || cart.length === 0}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-40"
            >
              Bayar
            </button>
          </div>
        </div>
      </div>

      {/* Modal Pembayaran */}
      {showPayment && (
        <PaymentModal
          cart={cart}
          total={total}
          user={currentUser}
          token={token}
          onClose={() => setShowPayment(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {/* Modal Struk */}
      {showReceipt && lastOrder && (
        <ReceiptModal
          order={lastOrder}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}