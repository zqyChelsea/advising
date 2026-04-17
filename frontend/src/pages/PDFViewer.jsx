import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_SCALE = 0.3;
const MAX_SCALE = 4.0;
const SCALE_STEP = 0.1;

const PDFViewer = ({ pdfPath = '/Student_Handbook_2025-26_English.pdf', title }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
        setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const handleScaleChange = (e) => {
    setScale(parseFloat(e.target.value));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(MAX_SCALE, Math.round((prev + SCALE_STEP) * 100) / 100));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(MIN_SCALE, Math.round((prev - SCALE_STEP) * 100) / 100));
  };

  const fitWidth = useCallback(() => {
    setScale(1.0);
  }, []);

  const presetScales = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/resources')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title={t('pdf.back')}
            >
              <span className="iconify text-xl text-slate-600" data-icon="solar:arrow-left-bold"></span>
            </button>
            <div>
              <h1 className="font-bold text-slate-800">{title || t('pdf.title')}</h1>
              <p className="text-xs text-slate-500">
                {numPages ? `${pageNumber} / ${numPages} ${t('pdf.page')}` : t('pdf.loading')}
              </p>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title={t('pdf.zoomOut')}
            >
              <span className="iconify text-lg text-slate-600" data-icon="solar:zoom-out-bold"></span>
            </button>

            <input
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={SCALE_STEP}
              value={scale}
              onChange={handleScaleChange}
              className="w-32 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#6B8E7B]"
            />

            <button
              onClick={zoomIn}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title={t('pdf.zoomIn')}
            >
              <span className="iconify text-lg text-slate-600" data-icon="solar:zoom-in-bold"></span>
            </button>

            <span className="text-sm text-slate-600 w-16 text-center font-medium">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={fitWidth}
              className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title={t('pdf.fitWidth')}
            >
              {t('pdf.fitWidth')}
            </button>
          </div>
        </div>

        {/* Preset Scale Buttons */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-slate-400 mr-1">{t('pdf.quickZoom')}:</span>
          {presetScales.map((preset) => (
            <button
              key={preset}
              onClick={() => setScale(preset)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                Math.abs(scale - preset) < 0.01
                  ? 'bg-[#6B8E7B] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {Math.round(preset * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* PDF Container */}
      <div ref={containerRef} className="flex-1 overflow-auto p-6">
        <div className="flex justify-center">
          <Document
            file={pdfPath}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center h-96 bg-white rounded-lg shadow-lg p-8">
                <span className="iconify text-5xl text-[#8EB19D] animate-spin mb-4" data-icon="solar:loading-bold"></span>
                <p className="text-slate-500">{t('pdf.loading')}</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-96 bg-white rounded-lg shadow-lg p-8 text-slate-500">
                <span className="iconify text-5xl mb-4" data-icon="solar:warning-bold"></span>
                <p>{t('pdf.loadError')}</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
          >
            <span className="iconify" data-icon="solar:arrow-left-bold"></span>
            {t('pdf.prevPage')}
          </button>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= (numPages || 1)) {
                  setPageNumber(val);
                }
              }}
              className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm"
            />
            <span className="text-sm text-slate-500">{t('pdf.of')} {numPages || '?'}</span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 transition-colors"
          >
            {t('pdf.nextPage')}
            <span className="iconify" data-icon="solar:arrow-right-bold"></span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
