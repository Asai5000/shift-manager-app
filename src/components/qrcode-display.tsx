'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getConfig } from '@/actions/configs';

export function QRCodeDisplay() {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadConfig = async () => {
            const savedUrl = await getConfig('qrcode_url');
            setUrl(savedUrl);
        };
        loadConfig();
    }, []);

    if (!url) return null;

    return (
        <div className="hidden print:flex flex-col items-center justify-center shrink-0 print:mr-8 xl:print:mr-12">
            <div className="bg-white p-1 border border-slate-200 rounded">
                <QRCodeSVG value={url} size={64} level="M" />
            </div>
            {/* Optional: label or small text under QR code if needed, but the user asked for右上 */}
        </div>
    );
}
