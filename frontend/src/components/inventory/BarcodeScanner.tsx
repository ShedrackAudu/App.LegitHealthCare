import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        // Removing qrbox allows scanning the entire video frame, which is much better for wide 1D barcodes
        aspectRatio: 1.777778,
        showTorchButtonIfSupported: true,
        rememberLastUsedCamera: true,
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: false
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ]
      },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
      },
      (error) => {
        // console.warn(error);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl border">
        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
          <h3 className="font-semibold">Scan Barcode / QR Code</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">
          <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-primary/20"></div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Position the barcode or QR code within the frame to scan automatically.
          </p>
        </div>
        <div className="p-4 bg-muted/30 border-t flex justify-center">
          <Button variant="outline" onClick={onClose}>Cancel Scan</Button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
