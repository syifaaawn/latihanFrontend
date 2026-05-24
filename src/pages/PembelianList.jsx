import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const formatRupiah = (number) =>
new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
}).format(number || 0);

const STATUS_LABEL = {
  pending: { text: 'Pending', cls: 'bg-yellow-100 text-yellow-700' },
  diterima: { text: 'Diterima', cls: 'bg-green-100 text-green-700' },
  dibatalkan: { text: 'Dibatalkan', cls: 'bg-red-100 text-red-700' },
};

// —- Modal: Tambah Pembelian ———————————————————————————————————————————
function TambahPembelianModal({ onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([]);
  const [produks, setProduks] = useState([]);
  const [form, setForm] = useState({
    supplier_id: '',
    tanggal_pembelian: new Date().toISOString().split('T')[0],
    keterangan: '',
  });
  const [items, setItems] = useState([{ produk_id: '', quantity: 1, harga_beli: '' }]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // State untuk modal tambah supplier baru
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ nama: '', no_hp: '', email: '', alamat: '' });
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/suppliers'), api.get('/produks')]).then(([sRes, pRes]) => {
      setSuppliers(sRes.data.data || []);
      let pData = pRes.data;
      if (pData.data) pData = pData.data;
      setProduks(Array.isArray(pData) ? pData : []);
    });
  }, []);

  // PERBAIKAN 1: Menghapus double arrow function
  const addItem = () =>
    setItems([...items, { produk_id: '', quantity: 1, harga_beli: '' }]);

  const removeItem = (idx) =>
    setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };

    // Auto-fill harga dari data produk jika pilih produk
    if (field === 'produk_id' && value) {
      const produk = produks.find((p) => String(p.id) === String(value));
      if (produk) updated[idx].harga_beli = produk.harga;
    }

    setItems(updated);
  };

  const totalHarga = items.reduce(
    (sum, i) => sum + (parseInt(i.quantity) || 0) * (parseFloat(i.harga_beli) || 0),
    0
  );

  const handleSaveSupplier = async () => {
    if (!supplierForm.nama.trim()) {
      toast.error('Nama supplier wajib diisi');
      return;
    }
    setSavingSupplier(true);
    try {
      const res = await api.post('/suppliers', supplierForm);
      const newSupplier = res.data.data;
      setSuppliers((prev) => [...prev, newSupplier]);
      setForm((prev) => ({ ...prev, supplier_id: newSupplier.id }));
      setShowAddSupplier(false);
      setSupplierForm({ nama: '', no_hp: '', email: '', alamat: '' });
      toast.success('Supplier berhasil ditambahkan!');
    } catch (err) {
      toast.error('Gagal menambah supplier');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleSubmit = async () => {
    setErrors({});
    if (!form.supplier_id) {
      setErrors({ supplier_id: ['Supplier wajib dipilih'] });
      return;
    }
    const validItems = items.filter((i) => i.produk_id && i.quantity > 0 && i.harga_beli >= 0);
    if (validItems.length === 0) {
      toast.error('Tambahkan minimal 1 produk');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/pembelians', {
        ...form,
        items: validItems.map((i) => ({
          produk_id: parseInt(i.produk_id),
          quantity: parseInt(i.quantity),
          harga_beli: parseFloat(i.harga_beli),
        })),
      });
      toast.success('Pembelian berhasil dibuat!');
      onSuccess(res.data.data);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        const firstErr = Object.values(err.response.data.errors).flat()[0];
        toast.error(firstErr || 'Validasi gagal');
      } else {
        toast.error(err.response?.data?.message || 'Gagal membuat pembelian');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-6">📦 Tambah Pembelian</h2>

          {/* Supplier */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Supplier *</label>
              <button
                onClick={() => setShowAddSupplier(!showAddSupplier)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showAddSupplier ? 'Batal tambah' : '+ Supplier baru'}
              </button>
            </div>

            {showAddSupplier ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 mb-2">
                <p className="text-sm font-semibold text-blue-700">Tambah Supplier Baru</p>
                <input
                  type="text"
                  placeholder="Nama supplier *"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  value={supplierForm.nama}
                  onChange={(e) => setSupplierForm({ ...supplierForm, nama: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="tel"
                    placeholder="No. HP"
                    className="border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={supplierForm.no_hp}
                    onChange={(e) => setSupplierForm({ ...supplierForm, no_hp: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Alamat"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  value={supplierForm.alamat}
                  onChange={(e) => setSupplierForm({ ...supplierForm, alamat: e.target.value })}
                />
                <button
                  onClick={handleSaveSupplier}
                  disabled={savingSupplier}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
                >
                  {savingSupplier ? 'Menyimpan...' : 'Simpan Supplier'}
                </button>
              </div>
            ) : (
              <select
                value={form.supplier_id}
                onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.supplier_id ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            )}
            {errors.supplier_id && (
              <p className="text-red-500 text-xs mt-1">{errors.supplier_id[0]}</p>
            )}
          </div>

          {/* Tanggal */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">Tanggal Pembelian *</label>
            <input
              type="date"
              value={form.tanggal_pembelian}
              onChange={(e) => setForm({ ...form, tanggal_pembelian: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Items */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Daftar Produk *</label>
              <button
                onClick={addItem}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                + Tambah Produk
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={item.produk_id}
                      onChange={(e) => updateItem(idx, 'produk_id', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    >
                      <option value="">-- Pilih Produk --</option>
                      {produks.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama_barang} (Stok: {p.stok ?? p.quantity ?? 0})
                        </option>
                      ))}
                    </select>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Harga Beli (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.harga_beli}
                        onChange={(e) => updateItem(idx, 'harga_beli', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {item.produk_id && item.quantity && item.harga_beli && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      Subtotal: {formatRupiah(item.quantity * item.harga_beli)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 rounded-xl p-4 mb-5 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total Pembelian</span>
            <span className="text-xl font-bold text-blue-600">{formatRupiah(totalHarga)}</span>
          </div>

          {/* Keterangan */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Keterangan (opsional)</label>
            <textarea
              rows={2}
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Catatan pembelian..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-medium transition disabled:opacity-40"
            >
              {loading ? 'Menyimpan...' : '💾 Simpan Pembelian'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 py-3.5 rounded-2xl font-medium transition"
            >
              Batal
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// —- Modal: Detail Pembelian ———————————————————————————————————————————
function DetailPembelianModal({ pembelian, onClose, onStatusChange }) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleUpdateStatus = async (status) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/pembelians/${pembelian.id}/status`, { status });
      toast.success(`Status diubah ke "${STATUS_LABEL[status].text}"`);
      onStatusChange();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const s = STATUS_LABEL[pembelian.status] || {};

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">Detail Pembelian</h2>
              <p className="font-mono text-blue-600 text-sm mt-1">{pembelian.no_pembelian}</p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${s.cls}`}>
              {s.text}
            </span>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Supplier</p>
              <p className="font-semibold">{pembelian.supplier?.nama || '-'}</p>
              {pembelian.supplier?.no_hp && (
                <p className="text-sm text-gray-500">📞 {pembelian.supplier.no_hp}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Tanggal</p>
              <p className="font-semibold">
                {new Date(pembelian.tanggal_pembelian).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-500">Oleh: {pembelian.user?.name || '-'}</p>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Daftar Produk</h3>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Produk</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Harga Beli</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(pembelian.items || []).map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.produk?.nama_barang || '-'}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.produk?.kode_barang}</p>
                      </td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatRupiah(item.harga_beli)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* PERBAIKAN 2: Mengubah </footer > menjadi </tfoot> */}
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-bold">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                      {formatRupiah(pembelian.total_harga)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {pembelian.keterangan && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-1">Keterangan</p>
              <p className="text-sm">{pembelian.keterangan}</p>
            </div>
          )}

          {/* Actions */}
          {pembelian.status === 'pending' && (
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => handleUpdateStatus('diterima')}
                disabled={updatingStatus}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-2xl font-medium transition disabled:opacity-40"
              >
                {updatingStatus ? 'Memproses...' : '✓ Tandai Diterima'}
              </button>
              <button
                onClick={() => handleUpdateStatus('dibatalkan')}
                disabled={updatingStatus}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 py-3 rounded-2xl font-medium transition disabled:opacity-40"
              >
                Batalkan
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 py-3 rounded-2xl font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// —- Main Component: PembelianList ———————————————————————————————————————————
function PembelianList() {
  const [pembelians, setPembelians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showTambah, setShowTambah] = useState(false);
  const [selectedPembelian, setSelectedPembelian] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/user');
        setUser(res.data);
      } catch (err) {
        toast.error('Sesi habis, silakan login lagi');
        localStorage.removeItem('token');
        navigate('/login');
      }
    };

    fetchUser();
    fetchPembelians();
  }, [navigate]);

  const fetchPembelians = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pembelians');
      let data = res.data;
      if (data.data) data = data.data;
      setPembelians(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Gagal mengambil data pembelian');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {}
    localStorage.removeItem('token');
    toast.success('Berhasil logout');
    navigate('/login');
  };

  const filteredPembelians = pembelians.filter((p) => {
    const matchSearch =
      p.no_pembelian?.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier?.nama?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalNilai = filteredPembelians.reduce((sum, p) => sum + (p.total_harga || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">Loading...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Laravel POS
          </h1>
          <div className="flex items-center gap-6">
            <span className="text-gray-600">
              Halo, <span className="font-semibold">{user?.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-5 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Pembelian</h1>
            <p className="text-gray-600 mt-1">
              {filteredPembelians.length} transaksi • Total: {formatRupiah(totalNilai)}
            </p>
          </div>
          <button
            onClick={() => setShowTambah(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
          >
            + Tambah Pembelian
          </button>
        </div>

        {/* Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Cari no. pembelian atau supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="diterima">Diterima</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
        </div>

        {/* Tabel */}
        {filteredPembelians.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum ada pembelian</h3>
            <p className="text-gray-500 mb-6">Mulai catat pembelian barang dari supplier</p>
            <button
              onClick={() => setShowTambah(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
            >
              Tambah Pembelian Pertama
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-gray-600 text-sm">No. Pembelian</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-600 text-sm">Supplier</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-600 text-sm">Tanggal</th>
                  <th className="text-center px-6 py-4 font-semibold text-gray-600 text-sm">Items</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-600 text-sm">Total</th>
                  <th className="text-center px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPembelians.map((p) => {
                  const s = STATUS_LABEL[p.status] || {};
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPembelian(p)}
                      className="border-t hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-blue-600 text-sm font-semibold">
                          {p.no_pembelian}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{p.supplier?.nama || '-'}</p>
                        {p.supplier?.no_hp && (
                          <p className="text-xs text-gray-400">{p.supplier.no_hp}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(p.tanggal_pembelian).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {p.items?.length || 0} produk
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800">
                        {formatRupiah(p.total_harga)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${s.cls}`}>
                          {s.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showTambah && (
        <TambahPembelianModal
          onClose={() => setShowTambah(false)}
          onSuccess={() => {
            setShowTambah(false);
            fetchPembelians();
          }}
        />
      )}

      {selectedPembelian && (
        <DetailPembelianModal
          pembelian={selectedPembelian}
          onClose={() => setSelectedPembelian(null)}
          onStatusChange={fetchPembelians}
        />
      )}
    </div>
  );
}

export default PembelianList;