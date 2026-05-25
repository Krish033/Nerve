import ChatAssistant from "@/components/shared/ChatAssistant";

export default function DerbyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-yellow-500/30">
      {/* Abstract Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-12 md:py-24 flex flex-col items-center">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            Nerve Assistant
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Powered by Derby NN — Your project manager, developer assistant, and health monitor. 
            Ask anything about the Nerve ecosystem.
          </p>
        </div>

        <ChatAssistant />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
          <div className="p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm text-center">
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Knowledge Scan</h4>
            <p className="text-xs text-muted-foreground">Deep analysis of client pages, components, and microservices.</p>
          </div>
          <div className="p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm text-center">
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Health Check</h4>
            <p className="text-xs text-muted-foreground">Real-time status monitoring across the entire service mesh.</p>
          </div>
          <div className="p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm text-center">
            <h4 className="text-sm font-medium text-yellow-500 mb-1">AI Logic</h4>
            <p className="text-xs text-muted-foreground">Transformer-based model trained specifically on Nerve&apos;s codebase.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
