'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { getConfig, saveConfig } from '@/actions/configs';
import { Globe, Save, QrCode } from 'lucide-react';

export default function QRCodeSettingsPage() {
    const [url, setUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadConfig = async () => {
            const savedUrl = await getConfig('qrcode_url');
            if (savedUrl) setUrl(savedUrl);
            setIsLoading(false);
        };
        loadConfig();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await saveConfig('qrcode_url', url);
        if (result.success) {
            toast.success('QRコードのURLを保存しました');
        } else {
            toast.error(result.error || '保存に失敗しました');
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[400px]">読み込み中...</div>;
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">QRコード設定</h1>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <QrCode className="mr-2 h-5 w-5 text-blue-600" />
                        印刷用QRコードの設定
                    </CardTitle>
                    <CardDescription>
                        シフトやカレンダーの印刷時、ヘッダー右上に表示されるQRコードのリンク先URLを設定します。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="url" className="text-sm font-medium flex items-center">
                            <Globe className="mr-2 h-4 w-4 text-slate-400" />
                            URL
                        </Label>
                        <Input
                            id="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="border-slate-300 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500">
                            未入力の場合はQRコードが表示されません。
                        </p>
                    </div>

                    {url && (
                        <div className="pt-4 border-t border-slate-100 flex flex-col items-center space-y-3">
                            <span className="text-sm font-medium text-slate-700">プレビュー</span>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <QRCodeSVG value={url} size={150} level="H" />
                            </div>
                            <span className="text-xs text-slate-500 break-all max-w-full text-center">
                                {url}
                            </span>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                            {isSaving ? (
                                '保存中...'
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    設定を保存
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 leading-relaxed">
                    <strong className="font-bold">ヒント:</strong> Googleフォームの回答URLや、シフト共有サイトのマイページなどを設定すると、印刷されたシフトから直接アクセスできるようになり便利です。
                </p>
            </div>
        </div>
    );
}
