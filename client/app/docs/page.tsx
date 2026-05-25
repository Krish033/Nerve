import React from 'react';

export const metadata = {
  title: 'Nerve Documentation',
  description: 'Official Nerve ecosystem documentation.',
};

export default function DocsPage() {
  return (
    <>

      
      <section id="getting-started" className="pt-8 border-t border-neutral-100 dark:border-neutral-800">
        <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Getting Started</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          Nerve is built on top of Next.js 15 (Server Components priority) and NestJS (Microservices gateway). The system enforces 
          strict isolation between modules.
        </p>
        <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border-l-4 border-primary">
          <code className="text-xs font-mono">npm run install:all && npm run dev</code>
        </div>
      </section>

      <section id="authentication" className="pt-8 border-t border-neutral-100 dark:border-neutral-800">
        <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Authentication (JWT / SSR)</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          Authentication tokens are distributed directly via HttpOnly cookies from the NestJS gateway. They are verified 
          transparently via middleware to allow static and dynamic caching to continue functioning unimpeded.
        </p>
      </section>

      <section id="caching" className="pt-8 border-t border-neutral-100 dark:border-neutral-800">
        <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Caching Infrastructure</h2>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
          The frontend optimizes data consumption through two layers:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/80">
          <li><strong>Server-Side:</strong> Next.js App Router static caches.</li>
          <li><strong>Client-Side:</strong> React Query integration strictly for real-time mutations.</li>
        </ul>
      </section>
    </>
  );
}


