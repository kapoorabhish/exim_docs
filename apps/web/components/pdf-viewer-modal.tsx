'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal, Spin, Result } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Button } from '@exim/ui';
import api from '../lib/api';

interface PdfViewerModalProps {
  open: boolean;
  title: string;
  /** API path e.g. /pdf/invoices/abc123 */
  pdfUrl: string | null;
  /** Filename for the downloaded file e.g. INV-2526-001.pdf */
  filename: string;
  onClose: () => void;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export default function PdfViewerModal({
  open,
  title,
  pdfUrl,
  filename,
  onClose,
}: PdfViewerModalProps) {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const activeBlobUrl = useRef<string | null>(null);

  // Fetch PDF when modal opens
  useEffect(() => {
    if (!open || !pdfUrl) return;

    let cancelled = false;
    setLoadState('loading');

    const fetchPdf = () => {
      api
        .get(pdfUrl, { responseType: 'blob' })
        .then(({ data }) => {
          if (cancelled) return;
          const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
          activeBlobUrl.current = url;
          setBlobUrl(url);
          setLoadState('ready');
        })
        .catch(() => {
          if (!cancelled) setLoadState('error');
        });
    };

    fetchPdf();
    return () => {
      cancelled = true;
    };
  }, [open, pdfUrl]);

  // Clean up blob URL when modal closes
  useEffect(() => {
    if (!open) {
      if (activeBlobUrl.current) {
        URL.revokeObjectURL(activeBlobUrl.current);
        activeBlobUrl.current = null;
      }
      setBlobUrl(null);
      setLoadState('idle');
    }
  }, [open]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={title}
      width={960}
      style={{ top: 24 }}
      styles={{ body: { padding: 0 } }}
      footer={null}
      destroyOnHidden
    >
      {/* Toolbar: shown only when PDF is ready */}
      {loadState === 'ready' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '8px 16px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
          }}
        >
          <Button intent="default" icon={<DownloadOutlined />} onClick={handleDownload}>
            Download PDF
          </Button>
        </div>
      )}

      {/* Viewer area */}
      <div
        style={{
          height: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#525659',
        }}
      >
        {(loadState === 'idle' || loadState === 'loading') && (
          <Spin size="large" />
        )}

        {loadState === 'error' && (
          <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
            <Result
              status="error"
              title="Failed to load PDF"
              subTitle="Could not fetch the document. Please try again."
              extra={
                <Button intent="default" onClick={() => {
                  setLoadState('loading');
                  api
                    .get(pdfUrl!, { responseType: 'blob' })
                    .then(({ data }) => {
                      const url = URL.createObjectURL(
                        new Blob([data], { type: 'application/pdf' }),
                      );
                      activeBlobUrl.current = url;
                      setBlobUrl(url);
                      setLoadState('ready');
                    })
                    .catch(() => setLoadState('error'));
                }}>
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {loadState === 'ready' && blobUrl && (
          <iframe
            src={blobUrl}
            title={title}
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block' }}
          />
        )}
      </div>
    </Modal>
  );
}