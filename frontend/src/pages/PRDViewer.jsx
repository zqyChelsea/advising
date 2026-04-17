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

const PRDViewer = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const containerRef = useRef(null);
  const [selectedPRD, setSelectedPRD] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const prdList = [
    { id: 1, year: '2022-23', label: 'Academic Year 2022/23' },
    { id: 2, year: '2023-24', label: 'Academic Year 2023/24' },
    { id: 3, year: '2024-25', label: 'Academic Year 2024/25' },
    { id: 4, year: '2025-26', label: 'Academic Year 2025/26' },
  ];

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
    setPageNumber(1);
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

  const selectPRD = (prd) => {
    setSelectedPRD(prd);
    setPageNumber(1);
    setScale(1.0);
  };

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
              <h1 className="font-bold text-slate-800">Program Requirement Document</h1>
              <p className="text-xs text-slate-500">
                {selectedPRD
                  ? `${selectedPRD.label} - ${numPages ? `${pageNumber} / ${numPages} ${t('pdf.page')}` : t('pdf.loading')}`
                  : 'Select a document to view'}
              </p>
            </div>
          </div>

          {selectedPRD && (
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
          )}
        </div>

        {/* Preset Scale Buttons */}
        {selectedPRD && (
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
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PRD List Sidebar */}
        <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto shrink-0">
          <div className="p-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Available Documents</h3>
            <div className="space-y-2">
              {prdList.map((prd) => (
                <button
                  key={prd.id}
                  onClick={() => selectPRD(prd)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedPRD?.id === prd.id
                      ? 'bg-[#6B8E7B] text-white shadow-md'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedPRD?.id === prd.id ? 'bg-white/20' : 'bg-white shadow-sm'
                    }`}>
                      <span className={`iconify text-xl ${
                        selectedPRD?.id === prd.id ? 'text-white' : 'text-[#6B8E7B]'
                      }`} data-icon="solar:document-bold"></span>
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${selectedPRD?.id === prd.id ? 'text-white' : 'text-slate-800'}`}>
                        {prd.year}
                      </p>
                      <p className={`text-xs ${selectedPRD?.id === prd.id ? 'text-white/80' : 'text-slate-500'}`}>
                        {prd.label}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div ref={containerRef} className="flex-1 overflow-auto p-6">
          {selectedPRD ? (
            <div className="flex justify-center">
              <Document
                file={`/PRD/PRD_Computing & AI_${selectedPRD.year}.pdf`}
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="iconify text-4xl text-slate-300" data-icon="solar:folder-bold"></span>
                </div>
                <p className="text-slate-400">Select a document from the left panel to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {selectedPRD && (
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
      )}
    </div>
  );
};

export default PRDViewer;
