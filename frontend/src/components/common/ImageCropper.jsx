import { useState, useRef, useCallback, useEffect } from 'react';

const ImageCropper = ({ image, onCropComplete, onCancel, aspectRatio = 1 }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageObj, setImageObj] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });

  const cropSize = Math.min(containerSize.width, containerSize.height) * 0.8;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageObj(img);
      setImageLoaded(true);
      const minScale = Math.max(cropSize / img.width, cropSize / img.height);
      setScale(minScale * 1.2);
    };
    img.src = image;
  }, [image, cropSize]);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    if (!imageLoaded || !imageObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = containerSize.width;
    canvas.height = containerSize.height;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaledWidth = imageObj.width * scale;
    const scaledHeight = imageObj.height * scale;
    const x = (canvas.width - scaledWidth) / 2 + position.x;
    const y = (canvas.height - scaledHeight) / 2 + position.y;

    ctx.drawImage(imageObj, x, y, scaledWidth, scaledHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cropX = (canvas.width - cropSize) / 2;
    const cropY = (canvas.height - cropSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cropX + cropSize / 2, cropY + cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imageObj, x, y, scaledWidth, scaledHeight);
    ctx.restore();

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cropX + cropSize / 2, cropY + cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [imageLoaded, imageObj, scale, position, cropSize, containerSize]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => {
      const minScale = imageObj ? Math.max(cropSize / imageObj.width, cropSize / imageObj.height) : 0.5;
      return Math.max(minScale, Math.min(3, prev + delta));
    });
  }, [imageObj, cropSize]);

  const handleScaleChange = (e) => {
    const newScale = parseFloat(e.target.value);
    setScale(newScale);
  };

  const getCroppedImage = useCallback(() => {
    if (!imageObj) return null;

    const outputCanvas = document.createElement('canvas');
    const outputSize = 256;
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext('2d');

    const scaledWidth = imageObj.width * scale;
    const scaledHeight = imageObj.height * scale;
    const imageX = (containerSize.width - scaledWidth) / 2 + position.x;
    const imageY = (containerSize.height - scaledHeight) / 2 + position.y;

    const cropX = (containerSize.width - cropSize) / 2;
    const cropY = (containerSize.height - cropSize) / 2;

    const sourceX = (cropX - imageX) / scale;
    const sourceY = (cropY - imageY) / scale;
    const sourceSize = cropSize / scale;

    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
      imageObj,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, outputSize, outputSize
    );

    return outputCanvas.toDataURL('image/jpeg', 0.9);
  }, [imageObj, scale, position, cropSize, containerSize]);

  const handleConfirm = () => {
    const croppedImage = getCroppedImage();
    if (croppedImage) {
      onCropComplete(croppedImage);
    }
  };

  const minScale = imageObj ? Math.max(cropSize / imageObj.width, cropSize / imageObj.height) : 0.5;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">Edit Avatar</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <span className="iconify text-xl text-slate-500" data-icon="solar:close-bold"></span>
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative bg-slate-900 aspect-square cursor-move touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="iconify text-4xl text-white animate-spin" data-icon="solar:loading-bold"></span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <span className="iconify text-xl text-slate-400" data-icon="solar:minimize-square-bold"></span>
            <input
              type="range"
              min={minScale}
              max={3}
              step={0.01}
              value={scale}
              onChange={handleScaleChange}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#6B8E7B]"
            />
            <span className="iconify text-xl text-slate-400" data-icon="solar:maximize-square-bold"></span>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Drag to reposition, use slider or scroll to zoom
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-all border border-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 rounded-xl bg-[#6B8E7B] text-white font-bold shadow-lg shadow-[#6B8E7B]/20 hover:bg-[#5A7A69] transition-all"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
