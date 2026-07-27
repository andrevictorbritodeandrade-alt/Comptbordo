import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isAppStandalone);

    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // Listen for Chrome/Android/Desktop PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowModal(false);
      }
    } else {
      // If prompt isn't directly triggerable, open helper modal with instructions
      setShowModal(true);
    }
  };

  if (isStandalone) {
    return null; // App is already installed and running as standalone PWA
  }

  return (
    <>
      {/* Top Header Quick Install Badge */}
      <button
        onClick={handleInstallClick}
        className="px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/50 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        title="Instalar Aplicativo na Tela Inicial"
      >
        <Download size={13} className="text-amber-400 animate-pulse" />
        <span className="hidden sm:inline">INSTALAR APLICATIVO</span>
        <span className="sm:hidden">INSTALAR</span>
      </button>

      {/* Helper Modal for Safari, Chrome, Firefox & Edge Instructions */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e16] border border-[#2e2e44] rounded-3xl p-5 w-full max-w-md shadow-2xl relative text-white animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#222236] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">Adicionar à Tela Inicial</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Instale como aplicativo nativo no celular ou PC</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 bg-[#1c1c2e] hover:bg-[#282840] text-zinc-400 hover:text-white rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {isIos ? (
              /* iOS Safari Instructions */
              <div className="space-y-3">
                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  No Safari do iPhone/iPad, siga estes 2 passos simples para instalar o aplicativo:
                </p>
                <div className="bg-[#141422] border border-[#28283e] p-3 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl font-bold text-sm shrink-0">1</div>
                  <div className="text-xs text-zinc-200">
                    Toque no botão <span className="font-bold text-blue-400 inline-flex items-center gap-1">Compartilhar <Share size={13} /></span> na barra inferior do Safari.
                  </div>
                </div>
                <div className="bg-[#141422] border border-[#28283e] p-3 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl font-bold text-sm shrink-0">2</div>
                  <div className="text-xs text-zinc-200">
                    Role a lista e selecione <span className="font-bold text-amber-400 inline-flex items-center gap-1">Adicionar à Tela de Início <PlusSquare size={13} /></span>.
                  </div>
                </div>
              </div>
            ) : (
              /* Chrome / Android / Firefox / Desktop Instructions */
              <div className="space-y-3">
                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  Para instalar no Google Chrome, Firefox, Edge ou Android:
                </p>
                <div className="bg-[#141422] border border-[#28283e] p-3 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl font-bold text-sm shrink-0">1</div>
                  <div className="text-xs text-zinc-200">
                    Toque nos <span className="font-bold text-amber-400">três pontinhos (⋮)</span> no canto superior direito do navegador.
                  </div>
                </div>
                <div className="bg-[#141422] border border-[#28283e] p-3 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl font-bold text-sm shrink-0">2</div>
                  <div className="text-xs text-zinc-200">
                    Clique em <span className="font-bold text-emerald-400">"Instalar aplicativo"</span> ou <span className="font-bold text-emerald-400">"Adicionar à tela inicial"</span>.
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[#222236] flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black uppercase text-xs rounded-xl tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={15} /> Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
