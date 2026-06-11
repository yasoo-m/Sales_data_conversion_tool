'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MallType, BrandType, UnifiedRow, ConversionWarning, ConversionError } from '@/lib/types';

const MALL_OPTIONS: { value: MallType; label: string; logo: string }[] = [
  { value: 'amazon', label: 'Amazon', logo: 'https://www.google.com/s2/favicons?domain=amazon.co.jp&sz=32' },
  { value: 'rakuten', label: '楽天市場', logo: 'https://www.google.com/s2/favicons?domain=rakuten.co.jp&sz=32' },
  { value: 'yahoo', label: 'ヤフーショッピング', logo: 'https://www.google.com/s2/favicons?domain=shopping.yahoo.co.jp&sz=32' },
  { value: 'makeshop', label: 'メイクショップ', logo: 'https://www.google.com/s2/favicons?domain=makeshop.jp&sz=32' },
  { value: 'mercari', label: 'メルカリショップス', logo: 'https://www.google.com/s2/favicons?domain=mercari.com&sz=32' },
  { value: 'aupay', label: 'au PAYマーケット', logo: 'https://www.google.com/s2/favicons?domain=wowma.jp&sz=32' },
];

const BRAND_OPTIONS: { value: BrandType; label: string }[] = [
  { value: 'cllink', label: 'シーエルリンク (C.L.LINK)' },
  { value: 'maqs', label: 'MAQs' },
];

const HEADERS = [
  '出荷日', '出荷月', '郵便番号', '都道府県', '市町村',
  '受注番号', '会員番号', '店舗名称', '商品コード', '原価',
  '原価計', '小計', '受注数', '合計', '配送料',
  '総売上', '粗利', '支払方法',
];

export default function Home() {
  const [mall, setMall] = useState<MallType | ''>('');
  const [brand, setBrand] = useState<BrandType | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<UnifiedRow[]>([]);
  const [warnings, setWarnings] = useState<ConversionWarning[]>([]);
  const [errors, setErrors] = useState<ConversionError[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }, []);

  const handleConvert = async () => {
    if (!mall || !brand || !file) return;
    setLoading(true);
    setErrorMessage('');
    setRows([]);
    setWarnings([]);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mall', mall);
      formData.append('brand', brand);

      const res = await fetch('/api/convert', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || '変換に失敗しました');
        return;
      }

      setRows(data.rows || []);
      setWarnings(data.warnings || []);
      setErrors(data.errors || []);
    } catch (err) {
      setErrorMessage(`エラー: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (rows.length === 0) return;

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (!res.ok) throw new Error('ダウンロードに失敗しました');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_data_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(`ダウンロードエラー: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const rowToArray = (row: UnifiedRow) => [
    row.shippingDate, row.shippingMonth, row.postalCode, row.prefecture, row.city,
    row.orderNumber, row.memberNumber, row.storeName, row.productCode,
    row.costPrice ?? '', row.costTotal ?? '', row.subtotal, row.quantity,
    row.total, row.shippingFee, row.totalSales, row.grossProfit ?? '', row.paymentMethod,
  ];

  const canConvert = mall && brand && file && !loading;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="gradient-header text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
              📊
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">売上データ変換ツール</h1>
              <p className="text-blue-100 text-xs">ECモール売上CSVを統一フォーマットに変換</p>
            </div>
          </div>
          <Link href="/master">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
              ⚙️ マスタデータ管理
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Step indicators */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${mall ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold">1</span>
            モール
          </span>
          <span className="text-gray-300">→</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${brand ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold">2</span>
            ブランド
          </span>
          <span className="text-gray-300">→</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${file ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold">3</span>
            ファイル
          </span>
          <span className="text-gray-300">→</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${rows.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold">4</span>
            変換
          </span>
        </div>

        {/* Input Card */}
        <Card className="shadow-sm border-0 shadow-gray-200/50">
          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">モール選択</Label>
                <Select value={mall} onValueChange={(v) => setMall(v as MallType)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="モールを選択してください" /></SelectTrigger>
                  <SelectContent>
                    {MALL_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <img src={o.logo} alt={o.label} width={16} height={16} className="rounded-sm" />
                          {o.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">ブランド選択</Label>
                <Select value={brand} onValueChange={(v) => setBrand(v as BrandType)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="ブランドを選択してください" /></SelectTrigger>
                  <SelectContent>
                    {BRAND_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">ファイルアップロード</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50 scale-[1.01]'
                    : file
                    ? 'border-green-300 bg-green-50/50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg">📄</div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB - クリックで変更</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl">📁</div>
                    <p className="text-gray-600 font-medium">ここにファイルをドラッグ&ドロップ</p>
                    <p className="text-sm text-gray-400">またはクリックして選択 (.csv, .xlsx, .xls, .tsv)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleConvert}
                disabled={!canConvert}
                className="h-11 px-8 font-semibold shadow-sm"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    変換中...
                  </span>
                ) : '🔄 変換実行'}
              </Button>
              {rows.length > 0 && (
                <Button onClick={handleDownload} variant="outline" className="h-11 px-6 font-semibold border-green-300 text-green-700 hover:bg-green-50" size="lg">
                  📥 Excelダウンロード ({rows.length}行)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {errorMessage && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription className="font-medium">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Warnings & Errors */}
        {(warnings.length > 0 || errors.length > 0) && (
          <Card className="shadow-sm border-0 shadow-gray-200/50 border-l-4 border-l-yellow-400">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                ⚠️ エラー・警告
                <Badge variant="secondary" className="text-xs">{errors.length + warnings.length}件</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-48 overflow-y-auto">
              {errors.map((e, i) => (
                <div key={`err-${i}`} className="flex items-start gap-2 text-sm bg-red-50 rounded-lg px-3 py-2">
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 mt-0.5">ERR</Badge>
                  <span>行{e.row} {e.column && `${e.column}列`}: {e.message}</span>
                </div>
              ))}
              {warnings.map((w, i) => (
                <div key={`warn-${i}`} className="flex items-start gap-2 text-sm bg-yellow-50 rounded-lg px-3 py-2">
                  <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 text-[10px] px-1.5 py-0 mt-0.5">WARN</Badge>
                  <span>行{w.row} {w.column}列: {w.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {rows.length > 0 && (
          <Card className="shadow-sm border-0 shadow-gray-200/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  📋 プレビュー
                  <Badge className="bg-blue-100 text-blue-700 text-xs">{Math.min(rows.length, 20)} / {rows.length}行</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      {HEADERS.map(h => (
                        <TableHead key={h} className="whitespace-nowrap text-[11px] font-semibold text-gray-600 py-2.5">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map((row, i) => (
                      <TableRow key={i} className="hover:bg-blue-50/30">
                        {rowToArray(row).map((cell, j) => (
                          <TableCell key={j} className="whitespace-nowrap text-xs py-2">
                            {String(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
