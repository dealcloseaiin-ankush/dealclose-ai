import React, { useState, useRef } from 'react';
import { 
  Upload, Sparkles, Download, Save, Share2, Type, DollarSign, 
  Image as ImageIcon, RefreshCw, Layers, Check, Palette, 
  ZoomIn, ZoomOut, Move, ShoppingBag, Eye, Trash2, ArrowLeft,
  ChevronRight, ChevronLeft, Zap, Sparkle, Tag, Sliders, Sun, Moon
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import useWorkspaceStore from '../store/workspaceStore';

// Curated Studio Backgrounds
const STUDIO_BACKGROUNDS = [
  {
    id: 'luxury_marble',
    name: 'Luxury Marble & Gold',
    category: 'Luxury',
    icon: '🏛️',
    preview: 'linear-gradient(135deg, #1e1e24 0%, #2b2b36 50%, #d4af37 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 60%, rgba(212,175,55,0.25) 0%, rgba(20,20,28,0.95) 70%), linear-gradient(180deg, #181822 0%, #0d0d14 100%)',
      backdrop: 'marble'
    },
    podiumColor: 'linear-gradient(90deg, #d4af37, #f3e5ab, #aa7c11)',
    shadowColor: 'rgba(0,0,0,0.6)'
  },
  {
    id: 'wooden_podium',
    name: 'Warm Rustic Wood',
    category: 'Studio',
    icon: '🪵',
    preview: 'linear-gradient(135deg, #3e2723 0%, #8d6e63 50%, #d7ccc8 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 40%, rgba(255,204,128,0.3) 0%, rgba(46,30,22,0.95) 70%), linear-gradient(180deg, #3e2723 0%, #1a100c 100%)',
      backdrop: 'wood'
    },
    podiumColor: 'linear-gradient(90deg, #8d6e63, #d7ccc8, #5d4037)',
    shadowColor: 'rgba(0,0,0,0.5)'
  },
  {
    id: 'studio_white',
    name: 'Minimalist White Studio',
    category: 'Clean',
    icon: '💡',
    preview: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, #e2e8f0 70%, #cbd5e1 100%)',
      backdrop: 'white'
    },
    podiumColor: 'linear-gradient(90deg, #e2e8f0, #ffffff, #cbd5e1)',
    shadowColor: 'rgba(0,0,0,0.18)'
  },
  {
    id: 'nature_garden',
    name: 'Botanical Garden Bokeh',
    category: 'Nature',
    icon: '🌿',
    preview: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 30%, rgba(167,243,208,0.4) 0%, rgba(6,78,59,0.9) 75%), linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
      backdrop: 'nature'
    },
    podiumColor: 'linear-gradient(90deg, #059669, #34d399, #047857)',
    shadowColor: 'rgba(0,0,0,0.55)'
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyberpunk Glow',
    category: 'Vibrant',
    icon: '🌌',
    preview: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 50%, rgba(236,72,153,0.3) 0%, rgba(139,92,246,0.2) 50%, #09090f 80%), linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      backdrop: 'neon'
    },
    podiumColor: 'linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6)',
    shadowColor: 'rgba(236,72,153,0.4)'
  },
  {
    id: 'sunset_glow',
    name: 'Golden Hour Sunset',
    category: 'Warm',
    icon: '🌇',
    preview: 'linear-gradient(135deg, #ff4e50 0%, #f9d423 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 30%, rgba(254,240,138,0.45) 0%, rgba(234,88,12,0.85) 60%), linear-gradient(180deg, #7c2d12 0%, #431407 100%)',
      backdrop: 'sunset'
    },
    podiumColor: 'linear-gradient(90deg, #f97316, #fde047, #c2410c)',
    shadowColor: 'rgba(0,0,0,0.5)'
  },
  {
    id: 'festive_gold',
    name: 'Royal Festive Diwali',
    category: 'Festive',
    icon: '🪔',
    preview: 'linear-gradient(135deg, #b91c1c 0%, #fbbf24 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.35) 0%, rgba(153,27,27,0.9) 70%), linear-gradient(180deg, #450a0a 0%, #1f0404 100%)',
      backdrop: 'festive'
    },
    podiumColor: 'linear-gradient(90deg, #fbbf24, #fef08a, #d97706)',
    shadowColor: 'rgba(217,119,6,0.4)'
  },
  {
    id: 'sale_spotlight',
    name: 'Mega Sale Spotlight',
    category: 'E-Commerce',
    icon: '🛍️',
    preview: 'linear-gradient(135deg, #dc2626 0%, #facc15 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 30%, rgba(250,204,21,0.5) 0%, rgba(220,38,38,0.9) 65%), linear-gradient(180deg, #991b1b 0%, #450a0a 100%)',
      backdrop: 'sale'
    },
    podiumColor: 'linear-gradient(90deg, #ef4444, #facc15, #b91c1c)',
    shadowColor: 'rgba(0,0,0,0.6)'
  },
  {
    id: 'dark_onyx',
    name: 'Dark Onyx Metallic',
    category: 'Luxury',
    icon: '💎',
    preview: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 50%, rgba(51,65,85,0.4) 0%, rgba(15,23,42,0.95) 75%), linear-gradient(180deg, #0b0f19 0%, #030712 100%)',
      backdrop: 'onyx'
    },
    podiumColor: 'linear-gradient(90deg, #334155, #64748b, #1e293b)',
    shadowColor: 'rgba(0,0,0,0.8)'
  },
  {
    id: 'pastel_peach',
    name: 'Soft Peach Pastel',
    category: 'Pastel',
    icon: '🍑',
    preview: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 40%, #ffedd5 0%, #fed7aa 60%, #fdba74 100%)',
      backdrop: 'peach'
    },
    podiumColor: 'linear-gradient(90deg, #fed7aa, #ffedd5, #fb923c)',
    shadowColor: 'rgba(0,0,0,0.15)'
  },
  {
    id: 'beach_tropical',
    name: 'Sunny Beach Tropical',
    category: 'Vibrant',
    icon: '🏖️',
    preview: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
    bgStyle: {
      background: 'radial-gradient(circle at 50% 30%, rgba(254,240,138,0.5) 0%, rgba(6,182,212,0.8) 60%), linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
      backdrop: 'tropical'
    },
    podiumColor: 'linear-gradient(90deg, #fde047, #fef08a, #eab308)',
    shadowColor: 'rgba(0,0,0,0.4)'
  }
];

export default function ProductStudio() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();

  // State
  const [productImage, setProductImage] = useState(location.state?.productImage || '/logo.png');
  const [selectedBg, setSelectedBg] = useState(STUDIO_BACKGROUNDS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Custom Overlays & Text
  const [showTextTools, setShowTextTools] = useState(false);
  const [productTitle, setProductTitle] = useState(location.state?.productName || 'Premium Product');
  const [priceText, setPriceText] = useState(location.state?.productPrice ? `₹${location.state.productPrice}` : '₹999');
  const [badgeText, setBadgeText] = useState('✨ 40% OFF');
  const [ctaText, setCtaText] = useState('📲 Order on WhatsApp');
  
  const [showTitle, setShowTitle] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [showCta, setShowCta] = useState(true);
  const [showPodium, setShowPodium] = useState(true);

  // Position & Styling
  const [productScale, setProductScale] = useState(1);
  const [productOffsetY, setProductOffsetY] = useState(0);
  const [badgeColor, setBadgeColor] = useState('#ef4444');
  const [titleColor, setTitleColor] = useState('#ffffff');
  const [priceColor, setPriceColor] = useState('#10b981');

  const canvasContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const bgUploadRef = useRef(null);
  const carouselRef = useRef(null);

  const categories = ['All', 'Luxury', 'Studio', 'Clean', 'Nature', 'Vibrant', 'Festive', 'E-Commerce', 'Pastel'];

  const filteredBgs = activeCategory === 'All' 
    ? STUDIO_BACKGROUNDS 
    : STUDIO_BACKGROUNDS.filter(b => b.category === activeCategory);

  // Handle Upload Image
  const handleProductUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setProductImage(previewUrl);
    toast.success('Product image loaded! Select your favorite background below ✨');
  };

  // Handle Custom BG Upload
  const handleCustomBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const customBgUrl = URL.createObjectURL(file);
    const customBgObj = {
      id: 'custom_' + Date.now(),
      name: 'Custom Upload',
      category: 'Custom',
      icon: '🖼️',
      preview: `url(${customBgUrl})`,
      bgStyle: {
        backgroundImage: `url(${customBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      },
      podiumColor: 'linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.8), rgba(255,255,255,0.4))',
      shadowColor: 'rgba(0,0,0,0.5)'
    };

    setSelectedBg(customBgObj);
    toast.success('Custom background applied! 📸');
  };

  // Scroll Carousel Left/Right
  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Export / Download High-Res Canvas
  const handleDownload = async () => {
    try {
      setIsProcessing(true);
      toast.loading('Rendering High-Definition Studio Image...', { id: 'render-toast' });

      // Create high-res canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const targetSize = 1080;
      canvas.width = targetSize;
      canvas.height = targetSize;

      // 1. Draw Background
      if (selectedBg.bgStyle.backgroundImage) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = selectedBg.bgStyle.backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        ctx.drawImage(bgImg, 0, 0, targetSize, targetSize);
      } else {
        // Draw radial / linear gradient
        const grad = ctx.createRadialGradient(targetSize / 2, targetSize * 0.5, 50, targetSize / 2, targetSize * 0.5, targetSize * 0.7);
        grad.addColorStop(0, '#2d3748');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, targetSize, targetSize);
      }

      // 2. Draw 3D Podium if enabled
      if (showPodium) {
        ctx.save();
        ctx.shadowColor = selectedBg.shadowColor || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;

        // Podium Ellipse Base
        ctx.beginPath();
        ctx.ellipse(targetSize / 2, targetSize * 0.75, targetSize * 0.32, targetSize * 0.08, 0, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
        ctx.restore();
      }

      // 3. Draw Product Image
      const prodImg = new Image();
      prodImg.crossOrigin = 'anonymous';
      prodImg.src = productImage;
      await new Promise((res) => { prodImg.onload = res; prodImg.onerror = res; });

      const prodW = targetSize * 0.55 * productScale;
      const prodH = (prodImg.height / prodImg.width) * prodW;
      const prodX = (targetSize - prodW) / 2;
      const prodY = (targetSize * 0.45) - (prodH / 2) + (productOffsetY * 2);

      // Product Drop Shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 35;
      ctx.shadowOffsetY = 25;
      ctx.drawImage(prodImg, prodX, prodY, prodW, prodH);
      ctx.restore();

      // 4. Draw Header Badge (e.g. 50% OFF)
      if (showBadge && badgeText) {
        ctx.save();
        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        const badgeX = targetSize * 0.08;
        const badgeY = targetSize * 0.08;
        const badgeW = targetSize * 0.28;
        const badgeH = 50;
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 25);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
        ctx.restore();
      }

      // 5. Draw Product Title & Price
      if (showTitle && productTitle) {
        ctx.save();
        ctx.fillStyle = titleColor;
        ctx.font = 'bold 42px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 10;
        ctx.fillText(productTitle, targetSize / 2, targetSize * 0.86);
        ctx.restore();
      }

      if (showPrice && priceText) {
        ctx.save();
        ctx.fillStyle = priceColor;
        ctx.font = 'bold 36px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(priceText, targetSize / 2, targetSize * 0.91);
        ctx.restore();
      }

      // 6. Draw CTA Button at Bottom
      if (showCta && ctaText) {
        ctx.save();
        ctx.fillStyle = '#10b981';
        const ctaW = targetSize * 0.45;
        const ctaH = 55;
        const ctaX = (targetSize - ctaW) / 2;
        const ctaY = targetSize * 0.93;
        ctx.roundRect(ctaX, ctaY, ctaW, ctaH, 20);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ctaText, targetSize / 2, ctaY + ctaH / 2);
        ctx.restore();
      }

      // Convert to Download Link
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${productTitle.replace(/\s+/g, '_')}_studio.png`;
      link.href = dataUrl;
      link.click();

      toast.success('🎉 High-Res Studio Creative Downloaded!', { id: 'render-toast' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export canvas image.', { id: 'render-toast' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save to Catalog & AI Brain
  const handleSaveToCatalog = async () => {
    try {
      setIsProcessing(true);
      toast.loading('Saving product & creative to Catalog...', { id: 'cat-save' });

      await api.post('/catalog', {
        name: productTitle,
        price: priceText.replace(/[^0-9]/g, '') || '0',
        description: `Features studio creative with ${selectedBg.name}. Offer: ${badgeText}`,
        imageUrl: productImage,
        workspaceId: activeWorkspaceId || 'main'
      });

      toast.success('✅ Saved to Catalog & AI Store Brain!', { id: 'cat-save' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save to catalog.', { id: 'cat-save' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col font-sans select-none pb-28 md:pb-10">
      
      {/* ── Top Header Navigation ── */}
      <header className="px-4 py-3 bg-[#0a0a10]/90 backdrop-blur-md border-b border-gray-800/80 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm md:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 flex items-center gap-1.5">
              <Sparkles size={16} className="text-emerald-400 animate-pulse" />
              <span>AI Product Photo Studio</span>
            </h1>
            <p className="text-[10px] text-gray-400">1-Tap Studio Lighting, Background Swap & Text Overlay</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Change Photo</span>
          </button>
          
          <button
            onClick={handleDownload}
            disabled={isProcessing}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            <Download size={14} />
            <span>Download HD</span>
          </button>
        </div>
      </header>

      {/* Hidden File Inputs */}
      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleProductUpload} className="hidden" />
      <input type="file" ref={bgUploadRef} accept="image/*" onChange={handleCustomBgUpload} className="hidden" />

      {/* ── Main Canvas & Editor Area ── */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-3 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        
        {/* 🎨 Live Visual Preview Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md md:max-w-lg">
          
          <div 
            ref={canvasContainerRef}
            className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col justify-between p-5 transition-all duration-500"
            style={{
              ...selectedBg.bgStyle,
              boxShadow: `0 25px 60px -15px ${selectedBg.shadowColor || 'rgba(0,0,0,0.5)'}`
            }}
          >
            {/* Top Bar Overlays: Badge & Brand Tag */}
            <div className="flex items-center justify-between z-20">
              {showBadge && badgeText ? (
                <div 
                  className="px-3 py-1 rounded-full text-white text-xs font-black tracking-wide shadow-lg animate-fade-in flex items-center gap-1"
                  style={{ backgroundColor: badgeColor }}
                >
                  <Tag size={12} />
                  <span>{badgeText}</span>
                </div>
              ) : <div />}

              <div className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-[10px] text-gray-200 font-bold">
                {selectedBg.icon} {selectedBg.name}
              </div>
            </div>

            {/* 📸 Center Product + 3D Podium */}
            <div className="relative flex-1 flex items-center justify-center my-auto z-10">
              
              {/* 3D Glowing Studio Podium Base */}
              {showPodium && (
                <div 
                  className="absolute bottom-4 w-4/5 h-16 rounded-[100%] transition-all duration-500 opacity-90 blur-[1px]"
                  style={{
                    background: selectedBg.podiumColor || 'linear-gradient(90deg, #d4af37, #f3e5ab, #aa7c11)',
                    boxShadow: `0 15px 35px ${selectedBg.shadowColor || 'rgba(0,0,0,0.6)'}`
                  }}
                />
              )}

              {/* Product Image with Smooth Cutout & Shadow */}
              <img
                src={productImage}
                alt="Product"
                className="max-h-[65%] max-w-[75%] object-contain drop-shadow-2xl transition-transform duration-300 pointer-events-none"
                style={{
                  transform: `scale(${productScale}) translateY(${productOffsetY}px)`,
                  filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.65))'
                }}
              />
            </div>

            {/* Bottom Content Overlays: Title, Price & CTA */}
            <div className="space-y-2 text-center z-20">
              {showTitle && productTitle && (
                <h2 
                  className="text-lg md:text-xl font-black drop-shadow-md leading-tight"
                  style={{ color: titleColor }}
                >
                  {productTitle}
                </h2>
              )}

              {showPrice && priceText && (
                <div 
                  className="text-base md:text-lg font-black tracking-tight drop-shadow"
                  style={{ color: priceColor }}
                >
                  {priceText}
                </div>
              )}

              {showCta && ctaText && (
                <div className="inline-block mx-auto px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer">
                  {ctaText}
                </div>
              )}
            </div>

            {/* Subtle Studio Glow Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-white/10" />
          </div>

          {/* Quick Zoom & Adjustment Bar */}
          <div className="flex items-center justify-between w-full mt-3 px-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span>Zoom:</span>
              <button 
                onClick={() => setProductScale(prev => Math.max(0.6, prev - 0.1))}
                className="p-1 rounded bg-gray-900 border border-gray-800 text-gray-300 hover:text-white"
              >
                <ZoomOut size={13} />
              </button>
              <span className="font-mono text-white text-[11px]">{Math.round(productScale * 100)}%</span>
              <button 
                onClick={() => setProductScale(prev => Math.min(1.5, prev + 0.1))}
                className="p-1 rounded bg-gray-900 border border-gray-800 text-gray-300 hover:text-white"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPodium(!showPodium)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                  showPodium ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' : 'bg-gray-900 border-gray-800 text-gray-400'
                }`}
              >
                {showPodium ? 'Podium ON 🏛️' : 'Podium OFF'}
              </button>

              <button
                onClick={() => setShowTextTools(!showTextTools)}
                className="px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-purple-300 hover:text-white text-[10px] font-bold flex items-center gap-1"
              >
                <Type size={11} />
                <span>Text Overlay</span>
              </button>
            </div>
          </div>
        </div>

        {/* 🛠️ Side Text & Creative Customizer (Expandable) */}
        <div className="w-full lg:w-80 bg-[#0e0e14] border border-gray-800 rounded-3xl p-4 space-y-3.5 shadow-xl text-xs">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="font-black text-white flex items-center gap-1.5">
              <Sliders size={14} className="text-emerald-400" />
              <span>Creative Customizer</span>
            </span>
            <span className="text-[10px] text-gray-400">{selectedBg.name}</span>
          </div>

          <div className="space-y-2.5 max-h-[40vh] lg:max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
            
            {/* Product Title Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-gray-400">Product Title:</label>
                <input 
                  type="checkbox" 
                  checked={showTitle} 
                  onChange={(e) => setShowTitle(e.target.checked)} 
                  className="rounded accent-emerald-500" 
                />
              </div>
              <input
                type="text"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="e.g. Luxury Silk Saree"
                className="w-full bg-black border border-gray-800 rounded-xl p-2 text-white font-semibold outline-none focus:border-emerald-500"
              />
            </div>

            {/* Price & Offer Badge */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-400">Price Tag:</label>
                  <input 
                    type="checkbox" 
                    checked={showPrice} 
                    onChange={(e) => setShowPrice(e.target.checked)} 
                    className="rounded accent-emerald-500" 
                  />
                </div>
                <input
                  type="text"
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  placeholder="e.g. ₹999"
                  className="w-full bg-black border border-gray-800 rounded-xl p-2 text-emerald-300 font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-gray-400">Badge Tag:</label>
                  <input 
                    type="checkbox" 
                    checked={showBadge} 
                    onChange={(e) => setShowBadge(e.target.checked)} 
                    className="rounded accent-emerald-500" 
                  />
                </div>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. 50% OFF"
                  className="w-full bg-black border border-gray-800 rounded-xl p-2 text-red-300 font-bold outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* CTA Button Text */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-gray-400">Call-To-Action Button:</label>
                <input 
                  type="checkbox" 
                  checked={showCta} 
                  onChange={(e) => setShowCta(e.target.checked)} 
                  className="rounded accent-emerald-500" 
                />
              </div>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Order on WhatsApp"
                className="w-full bg-black border border-gray-800 rounded-xl p-2 text-amber-300 font-bold outline-none focus:border-amber-500"
              />
            </div>

            {/* Quick Badge Color Picker */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Badge Color:</label>
              <div className="flex items-center gap-1.5">
                {['#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'].map(col => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setBadgeColor(col)}
                    className={`w-6 h-6 rounded-full border-2 transition ${badgeColor === col ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* Quick Action Buttons */}
          <div className="pt-2 border-t border-gray-800 space-y-2">
            <button
              type="button"
              onClick={handleSaveToCatalog}
              disabled={isProcessing}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md transition active:scale-98"
            >
              <ShoppingBag size={14} />
              <span>Save to Product Catalog 🛍️</span>
            </button>
            
            <button
              type="button"
              onClick={() => bgUploadRef.current?.click()}
              className="w-full py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition text-[11px]"
            >
              <Upload size={12} />
              <span>Upload Custom Background Photo</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── 🌟 Fixed Bottom Background Carousel Selector ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a10]/95 backdrop-blur-xl border-t border-gray-800/90 py-2.5 px-3 md:px-6 shadow-2xl">
        
        {/* Category Pills & Navigation */}
        <div className="flex items-center justify-between max-w-7xl mx-auto mb-2 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar py-0.5">
            <span className="text-gray-400 mr-1 hidden sm:inline">Styles:</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                  activeCategory === cat 
                    ? 'bg-emerald-500 text-black font-black shadow-md' 
                    : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <button onClick={() => scrollCarousel('left')} className="p-1 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => scrollCarousel('right')} className="p-1 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Horizontal Background Thumbnails Scroll */}
        <div 
          ref={carouselRef}
          className="flex items-center gap-3 overflow-x-auto custom-scrollbar no-scrollbar max-w-7xl mx-auto pb-1"
        >
          {filteredBgs.map(bg => {
            const isSelected = selectedBg.id === bg.id;
            return (
              <div
                key={bg.id}
                onClick={() => {
                  setSelectedBg(bg);
                  toast.success(`Applied: ${bg.name} ✨`, { duration: 1200 });
                }}
                className={`flex-shrink-0 w-24 md:w-28 p-1.5 rounded-2xl cursor-pointer border-2 transition-all duration-300 relative group active:scale-95 ${
                  isSelected 
                    ? 'border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-500/20 scale-105' 
                    : 'border-gray-800/80 bg-[#12121c] hover:border-gray-600'
                }`}
              >
                {/* Visual Thumbnail Box */}
                <div 
                  className="w-full h-14 md:h-16 rounded-xl relative overflow-hidden flex items-center justify-center shadow-inner"
                  style={{ background: bg.preview }}
                >
                  <span className="text-xl drop-shadow-md group-hover:scale-125 transition-transform duration-300">
                    {bg.icon}
                  </span>

                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-400 text-black flex items-center justify-center text-[10px] font-black shadow">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="text-[10px] font-bold text-center mt-1 truncate text-gray-200">
                  {bg.name}
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
