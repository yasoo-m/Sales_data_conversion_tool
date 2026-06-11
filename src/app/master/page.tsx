'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProductCodeMapping, PaymentMethodMapping } from '@/lib/types';

export default function MasterPage() {
  const [activeTab, setActiveTab] = useState('product-codes');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="gradient-header text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
              ⚙️
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">マスタデータ管理</h1>
              <p className="text-blue-100 text-xs">商品コード・支払方法・原価・郵便番号</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
              📊 データ変換に戻る
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {message && (
          <Alert
            variant={messageType === 'error' ? 'destructive' : 'default'}
            className={`mb-6 ${messageType === 'success' ? 'border-green-200 bg-green-50 text-green-800' : ''}`}
          >
            <AlertDescription className="font-medium">
              {messageType === 'success' ? '✅ ' : '❌ '}{message}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white shadow-sm border p-1 h-auto gap-1">
            <TabsTrigger value="product-codes" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2.5 text-sm font-medium rounded-lg">
              🏷️ 商品コード入替
            </TabsTrigger>
            <TabsTrigger value="payment-methods" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2.5 text-sm font-medium rounded-lg">
              💳 支払方法入替
            </TabsTrigger>
            <TabsTrigger value="cost" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2.5 text-sm font-medium rounded-lg">
              💰 原価データ
            </TabsTrigger>
            <TabsTrigger value="postal" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2.5 text-sm font-medium rounded-lg">
              📮 郵便番号データ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="product-codes">
            <ProductCodesTab showMessage={showMessage} />
          </TabsContent>
          <TabsContent value="payment-methods">
            <PaymentMethodsTab showMessage={showMessage} />
          </TabsContent>
          <TabsContent value="cost">
            <CostTab showMessage={showMessage} />
          </TabsContent>
          <TabsContent value="postal">
            <PostalTab showMessage={showMessage} />
          </TabsContent>
        </Tabs>

        {/* Import History */}
        <ImportHistorySection />
      </main>
    </div>
  );
}

/* ── Action Button Bar Component ── */
function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 flex-wrap items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
      {children}
    </div>
  );
}

/* ── Product Codes Tab ── */
function ProductCodesTab({ showMessage }: { showMessage: (msg: string, type?: 'success' | 'error') => void }) {
  const [items, setItems] = useState<ProductCodeMapping[]>([]);
  const [search, setSearch] = useState('');
  const [newOld, setNewOld] = useState('');
  const [newNew, setNewNew] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const params = search ? `?q=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/master/product-codes${params}`);
    const data = await res.json();
    setItems(data);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newOld || !newNew) return;
    await fetch('/api/master/product-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldCode: newOld, newCode: newNew, productName: newName }),
    });
    setNewOld(''); setNewNew(''); setNewName('');
    showMessage('商品コードを追加しました');
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/master/product-codes?id=${id}`, { method: 'DELETE' });
    showMessage('削除しました');
    fetchData();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clear', 'true');
    const res = await fetch('/api/master/product-codes', { method: 'POST', body: formData });
    const data = await res.json();
    setLoading(false);
    showMessage(`${data.imported}件インポートしました`);
    fetchData();
    e.target.value = '';
  };

  const handleExport = () => {
    const csv = [
      ['旧コード', '新コード', '商品名'].join(','),
      ...items.map(i => [i.oldCode, i.newCode, i.productName].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_codes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-sm border-0 shadow-gray-200/50">
      <CardHeader className="border-b bg-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🏷️ 商品コード入替マスタ
          </CardTitle>
          <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">{items.length}件</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Search */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">検索</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="コードまたは商品名で検索..." className="h-10" />
          </div>
          <Button variant="outline" onClick={fetchData} className="h-10">🔍 検索</Button>
        </div>

        {/* Add */}
        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">新規追加</p>
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <Label className="text-xs text-gray-500">旧コード</Label>
              <Input value={newOld} onChange={e => setNewOld(e.target.value)} placeholder="旧コード" className="w-40 h-9" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">新コード</Label>
              <Input value={newNew} onChange={e => setNewNew(e.target.value)} placeholder="新コード" className="w-40 h-9" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">商品名</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="商品名（任意）" className="w-48 h-9" />
            </div>
            <Button onClick={handleAdd} disabled={!newOld || !newNew} size="sm" className="h-9">
              ＋ 追加
            </Button>
          </div>
        </div>

        {/* Actions */}
        <ActionBar>
          <input type="file" id="pc-import" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('pc-import')?.click()} disabled={loading}>
            {loading ? '⏳ インポート中...' : '📤 CSVインポート'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            📥 CSVエクスポート
          </Button>
          <div className="h-5 w-px bg-gray-300" />
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => window.open('/api/master/sample?type=product-codes')}>
            💡 サンプルCSV
          </Button>
        </ActionBar>

        {/* Table */}
        <div className="max-h-96 overflow-y-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-xs">旧コード</TableHead>
                <TableHead className="font-semibold text-xs">新コード</TableHead>
                <TableHead className="font-semibold text-xs">商品名</TableHead>
                <TableHead className="w-20 font-semibold text-xs text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                    データがありません。上の「新規追加」またはCSVインポートで追加してください。
                  </TableCell>
                </TableRow>
              ) : items.slice(0, 100).map(item => (
                <TableRow key={item.id} className="hover:bg-blue-50/30">
                  <TableCell className="text-sm font-mono">{item.oldCode}</TableCell>
                  <TableCell className="text-sm font-mono">{item.newCode}</TableCell>
                  <TableCell className="text-sm">{item.productName}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs" onClick={() => handleDelete(item.id!)}>
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {items.length > 100 && (
          <p className="text-sm text-gray-500 text-center bg-gray-50 rounded-lg py-2">
            他 {items.length - 100} 件あります。検索で絞り込んでください。
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Payment Methods Tab ── */
function PaymentMethodsTab({ showMessage }: { showMessage: (msg: string, type?: 'success' | 'error') => void }) {
  const [items, setItems] = useState<PaymentMethodMapping[]>([]);
  const [newOld, setNewOld] = useState('');
  const [newNew, setNewNew] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/master/payment-methods');
    const data = await res.json();
    setItems(data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!newOld || !newNew) return;
    await fetch('/api/master/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: newOld, newName: newNew }),
    });
    setNewOld(''); setNewNew('');
    showMessage('支払方法を追加しました');
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/master/payment-methods?id=${id}`, { method: 'DELETE' });
    showMessage('削除しました');
    fetchData();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clear', 'true');
    const res = await fetch('/api/master/payment-methods', { method: 'POST', body: formData });
    const data = await res.json();
    setLoading(false);
    showMessage(`${data.imported}件インポートしました`);
    fetchData();
    e.target.value = '';
  };

  const handleExport = () => {
    const csv = [
      ['旧', '新'].join(','),
      ...items.map(i => [i.oldName, i.newName].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment_methods.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-sm border-0 shadow-gray-200/50">
      <CardHeader className="border-b bg-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            💳 支払方法入替マスタ
          </CardTitle>
          <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">{items.length}件</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Add */}
        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">新規追加</p>
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <Label className="text-xs text-gray-500">旧名称</Label>
              <Input value={newOld} onChange={e => setNewOld(e.target.value)} placeholder="変換元" className="w-64 h-9" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">新名称</Label>
              <Input value={newNew} onChange={e => setNewNew(e.target.value)} placeholder="変換先" className="w-64 h-9" />
            </div>
            <Button onClick={handleAdd} disabled={!newOld || !newNew} size="sm" className="h-9">
              ＋ 追加
            </Button>
          </div>
        </div>

        {/* Actions */}
        <ActionBar>
          <input type="file" id="pm-import" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('pm-import')?.click()} disabled={loading}>
            {loading ? '⏳ インポート中...' : '📤 CSVインポート'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            📥 CSVエクスポート
          </Button>
          <div className="h-5 w-px bg-gray-300" />
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => window.open('/api/master/sample?type=payment-methods')}>
            💡 サンプルCSV
          </Button>
        </ActionBar>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-xs">旧（変換元）</TableHead>
                <TableHead className="font-semibold text-xs">新（変換先）</TableHead>
                <TableHead className="w-20 font-semibold text-xs text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-400 py-8">
                    データがありません。
                  </TableCell>
                </TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="hover:bg-blue-50/30">
                  <TableCell className="text-sm">{item.oldName}</TableCell>
                  <TableCell className="text-sm">{item.newName}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-xs" onClick={() => handleDelete(item.id!)}>
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Cost Tab ── */
function CostTab({ showMessage }: { showMessage: (msg: string, type?: 'success' | 'error') => void }) {
  const [counts, setCounts] = useState({ parts: 0, maqs: 0, total: 0 });
  const [items, setItems] = useState<{ product_code: string; cost: number }[]>([]);
  const [brandType, setBrandType] = useState<'parts' | 'maqs'>('parts');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ brandType });
    if (search) params.set('q', search);
    const res = await fetch(`/api/master/cost?${params}`);
    const data = await res.json();
    setCounts({ parts: data.parts, maqs: data.maqs, total: data.total });
    setItems(data.items || []);
  }, [brandType, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('brandType', brandType);
    const res = await fetch('/api/master/cost', { method: 'POST', body: formData });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      showMessage(`${data.imported}件の原価データをインポートしました（${brandType === 'parts' ? 'パーツ原価' : 'MAQs原価'}）`);
      fetchData();
    } else {
      showMessage(data.error, 'error');
    }
    e.target.value = '';
  };

  return (
    <Card className="shadow-sm border-0 shadow-gray-200/50">
      <CardHeader className="border-b bg-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            💰 原価データ管理
          </CardTitle>
          <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1">{items.length}件</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">パーツ原価（C.L.LINK）</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{counts.parts.toLocaleString()}<span className="text-base font-normal text-blue-500 ml-1">件</span></p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">MAQs原価</p>
            <p className="text-3xl font-bold text-purple-900 mt-1">{counts.maqs.toLocaleString()}<span className="text-base font-normal text-purple-500 ml-1">件</span></p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">検索</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="商品コードまたは原価で検索..." className="h-10" />
          </div>
          <Button variant="outline" onClick={fetchData} className="h-10">🔍 検索</Button>
        </div>

        {/* Import/Export */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">原価種別</Label>
              <Select value={brandType} onValueChange={v => setBrandType(v as 'parts' | 'maqs')}>
                <SelectTrigger className="w-52 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parts">パーツ原価（C.L.LINK）</SelectItem>
                  <SelectItem value="maqs">MAQs原価</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <input type="file" id="cost-import" accept=".csv,.tsv,.xlsx" className="hidden" onChange={handleImport} />
              <Button onClick={() => document.getElementById('cost-import')?.click()} disabled={loading} className="h-10">
                {loading ? '⏳ インポート中...' : '📤 CSVインポート'}
              </Button>
            </div>
            <Button variant="outline" className="h-10" onClick={() => window.open(`/api/master/cost-export?brandType=${brandType}`)} disabled={counts[brandType] === 0}>
              📥 CSVエクスポート
            </Button>
          </div>
          <p className="text-xs text-gray-400">フォーマット: A列=商品コード, B列=原価（既存データは上書き）</p>
        </div>

        <ActionBar>
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => window.open('/api/master/sample?type=cost')}>
            💡 サンプルCSVダウンロード
          </Button>
        </ActionBar>

        {/* Table */}
        <div className="max-h-96 overflow-y-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-xs">商品コード</TableHead>
                <TableHead className="font-semibold text-xs text-right">原価</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-400 py-8">
                    データがありません。CSVインポートで追加してください。
                  </TableCell>
                </TableRow>
              ) : items.slice(0, 100).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-blue-50/30">
                  <TableCell className="text-sm font-mono">{item.product_code}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{item.cost.toLocaleString()}円</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {items.length > 100 && (
          <p className="text-sm text-gray-500 text-center bg-gray-50 rounded-lg py-2">
            他 {items.length - 100} 件あります。検索で絞り込んでください。
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Import History Section ── */
interface ImportHistoryRow {
  id: number;
  category: string;
  file_name: string;
  record_count: number;
  imported_at: string;
}

function ImportHistorySection() {
  const [history, setHistory] = useState<ImportHistoryRow[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    const res = await fetch('/api/master/import-history');
    const data = await res.json();
    setHistory(data);
  }, []);

  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen, fetchHistory]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const categoryColor = (cat: string) => {
    if (cat.includes('商品コード')) return 'bg-blue-100 text-blue-700';
    if (cat.includes('支払方法')) return 'bg-purple-100 text-purple-700';
    if (cat.includes('原価')) return 'bg-amber-100 text-amber-700';
    if (cat.includes('郵便番号')) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className="mt-8 shadow-sm border-0 shadow-gray-200/50">
      <CardHeader
        className="border-b bg-white rounded-t-xl cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            📋 インポート履歴
          </CardTitle>
          <span className="text-gray-400 text-sm">{isOpen ? '▲ 閉じる' : '▼ 開く'}</span>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-4">
          {history.length === 0 ? (
            <p className="text-center text-gray-400 py-6">まだインポート履歴がありません。</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-xs">日時</TableHead>
                    <TableHead className="font-semibold text-xs">カテゴリ</TableHead>
                    <TableHead className="font-semibold text-xs">ファイル名</TableHead>
                    <TableHead className="font-semibold text-xs text-right">件数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(row => (
                    <TableRow key={row.id} className="hover:bg-blue-50/30">
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">{formatDate(row.imported_at)}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${categoryColor(row.category)}`}>{row.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-gray-700 truncate max-w-xs">{row.file_name}</TableCell>
                      <TableCell className="text-sm text-right font-semibold">{row.record_count.toLocaleString()}件</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ── Postal Tab ── */
function PostalTab({ showMessage }: { showMessage: (msg: string, type?: 'success' | 'error') => void }) {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<{ postal_code: string; prefecture: string; city: string }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ list: 'true' });
    if (search) params.set('q', search);
    const res = await fetch(`/api/master/postal-codes?${params}`);
    const data = await res.json();
    setCount(data.count);
    setItems(data.items || []);
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/master/postal-codes', { method: 'POST', body: formData });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      showMessage(`${data.imported.toLocaleString()}件の郵便番号データをインポートしました`);
      fetchData();
    } else {
      showMessage(data.error, 'error');
    }
    e.target.value = '';
  };

  return (
    <Card className="shadow-sm border-0 shadow-gray-200/50">
      <CardHeader className="border-b bg-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            📮 郵便番号データ
          </CardTitle>
          <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">{count.toLocaleString()}件</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Stats */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">登録件数</p>
          <p className="text-3xl font-bold text-green-900 mt-1">{count.toLocaleString()}<span className="text-base font-normal text-green-500 ml-1">件</span></p>
        </div>

        {/* Search */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">検索</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="郵便番号・都道府県・市区町村で検索..." className="h-10" />
          </div>
          <Button variant="outline" onClick={fetchData} className="h-10">🔍 検索</Button>
        </div>

        {/* Import/Export */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div>
              <input type="file" id="postal-import" accept=".csv" className="hidden" onChange={handleImport} />
              <Button onClick={() => document.getElementById('postal-import')?.click()} disabled={loading} className="h-10">
                {loading ? '⏳ インポート中...' : '📤 KEN_ALL.CSVインポート'}
              </Button>
            </div>
            <Button variant="outline" className="h-10" onClick={() => window.open('/api/master/postal-export')} disabled={count === 0}>
              📥 CSVエクスポート
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            日本郵便のKEN_ALL.CSVをアップロードしてください。
          </p>
        </div>

        <ActionBar>
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => window.open('/api/master/sample?type=postal')}>
            💡 サンプルCSVダウンロード
          </Button>
          <div className="h-5 w-px bg-gray-300" />
          <a href="https://www.post.japanpost.jp/zipcode/dl/kogaki-zip.html" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
            📎 日本郵便ダウンロードページ
          </a>
        </ActionBar>

        {/* Table */}
        <div className="max-h-96 overflow-y-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-xs">郵便番号</TableHead>
                <TableHead className="font-semibold text-xs">都道府県</TableHead>
                <TableHead className="font-semibold text-xs">市区町村</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-400 py-8">
                    データがありません。KEN_ALL.CSVをインポートしてください。
                  </TableCell>
                </TableRow>
              ) : items.slice(0, 100).map((item, idx) => (
                <TableRow key={idx} className="hover:bg-blue-50/30">
                  <TableCell className="text-sm font-mono">{item.postal_code}</TableCell>
                  <TableCell className="text-sm">{item.prefecture}</TableCell>
                  <TableCell className="text-sm">{item.city}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {items.length > 100 && (
          <p className="text-sm text-gray-500 text-center bg-gray-50 rounded-lg py-2">
            他 {items.length - 100} 件あります。検索で絞り込んでください。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
