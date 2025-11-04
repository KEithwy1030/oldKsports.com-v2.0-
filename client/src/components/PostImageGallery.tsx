import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { buildImageUrl } from '../utils/imageUtils';
import '../styles/imageOptimization.css';
import '../styles/modal-fix.css';

interface PostImageGalleryProps {
  images: string[];
  className?: string;
  maxPreviewImages?: number;
}

const PostImageGallery: React.FC<PostImageGalleryProps> = ({
  images,
  className = '',
  maxPreviewImages = 3
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  if (!images || images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, maxPreviewImages);
  const remainingCount = images.length - maxPreviewImages;

  const openModal = (image: string) => {
    setSelectedImage(image);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedImage(null);
  };

  // 列表预览：固定一行三列的紧凑网格
  const getGridLayout = () => 'grid-cols-3';

  const getItemStyle = (): React.CSSProperties => ({
    width: '100%',
    height: '112px',
    borderRadius: '10px',
    overflow: 'hidden'
  });

  return (
    <>
      <div className={`h-full flex flex-col ${className}`} style={{ marginBottom: 12 }}>
        {/* 列表页紧凑预览 */}
        <div className={`grid ${getGridLayout()} gap-3`} style={{ height: '116px', width: '100%' }}>
          {displayImages.map((image, index) => (
            <div
              key={index}
              className={`relative group cursor-pointer`}
              onClick={() => openModal(image)}
            >
              <div className="image-preview w-full h-full bg-gray-800 rounded-md overflow-hidden flex items-center justify-center" style={getItemStyle()}>
                <img
                  src={buildImageUrl(image)}
                  alt={`帖子图片 ${index + 1}`}
                  className="optimized-image w-full h-full object-cover transition-transform group-hover:scale-105"
                  style={{ 
                    imageRendering: 'auto' as any,
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)',
                    willChange: 'transform'
                  }}
                  loading="lazy"
                  decoding="async"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              {/* Show remaining count for last image - 微博风格 */}
              {index === displayImages.length - 1 && remainingCount > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 移除“共X张图片”提示，按需求不显示 */}
      </div>

      {/* Image Modal */}
      {showModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={buildImageUrl(selectedImage)}
              alt="放大查看"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PostImageGallery;
