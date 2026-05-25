"use client";

import React, { useState } from 'react';
import { Button } from '@/components/shared/button';
import { Heading } from '@/components/shared/heading';
import { TextInput } from '@/components/ui/TextInput';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Server, ShieldCheck, Mail, Key, Globe, Hash, Terminal } from 'lucide-react';

export default function MailSettings() {
  const [provider, setProvider] = useState('mailgun');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('RELAY_PROTOCOL_SYNC_COMPLETE');
  };

  return (
    <div className="space-y-8">
      <section className="space-y-10">
        <Heading 
          title="Relay Protocol" 
          description="Communication node specifications" 
          className="mb-0" 
        />

        <form onSubmit={handleSave} className="space-y-16">
          <RadioGroup value={provider} onValueChange={setProvider} className="grid grid-cols-1 md:grid-cols-2 border border-white/5 bg-white/[0.01] backdrop-blur-sm relative group/grid">
            {[
              { id: 'mailgun', label: 'API_DIRECT', desc: 'MAILGUN_CLOUD_NODE', icon: ShieldCheck },
              { id: 'smtp', label: 'SMTP_RELAY', desc: 'STANDARD_TRANSMISSION', icon: Server },
            ].map((p, idx) => {
              const isActive = provider === p.id;
              const Icon = p.icon;
              return (
                <label
                  key={p.id}
                  htmlFor={p.id}
                  className={cn(
                    "flex flex-col p-10 transition-all cursor-pointer relative group text-left",
                    isActive 
                      ? "bg-primary/[0.03]" 
                      : "hover:bg-white/[0.01]",
                    idx !== 0 && "md:border-l border-white/5"
                  )}
                >
                  <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
                  <div className={cn(
                    "p-3 mb-8 transition-all duration-500 w-fit relative",
                    isActive 
                      ? "text-primary bg-primary/10 shadow-[inset_0_0_15px_rgba(var(--primary),0.1)]" 
                      : "text-muted-foreground/10 bg-muted/5 group-hover:text-primary/40 group-hover:bg-primary/[0.02]"
                  )}>
                    <Icon className="h-5 w-5" />
                    {isActive && <div className="absolute inset-0 border border-primary/20 animate-pulse" />}
                  </div>
                  <span className={cn("text-[13px] font-black uppercase tracking-tight transition-colors", isActive ? "text-primary" : "text-foreground")}>
                    {p.label}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/20 mt-1.5 uppercase tracking-[0.2em] italic group-hover:text-muted-foreground/40 transition-colors">
                    {p.desc}
                  </span>
                  {isActive && (
                    <div className="absolute top-0 right-0 h-1 w-12 bg-primary shadow-[0_0_12px_rgba(var(--primary),0.8)]" />
                  )}
                </label>
              );
            })}
          </RadioGroup>

          {/* Industrial Divider */}
          <div className="h-px bg-gradient-to-r from-white/[0.08] via-white/[0.02] to-transparent w-full" />

          <div className="space-y-12">
            {provider === 'mailgun' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <TextInput 
                  label="ENDPOINT_URI"
                  placeholder="api.mailgun.net" 
                  className="bg-transparent border-0 border-b border-white/10 rounded-none px-0" 
                  icon={<Globe className="h-4 w-4" />}
                />
                <TextInput 
                  type="password" 
                  label="SECRET_API_KEY"
                  placeholder="key-********************" 
                  className="bg-transparent border-0 border-b border-white/10 rounded-none px-0" 
                  icon={<Key className="h-4 w-4" />}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <TextInput 
                  label="RELAY_HOST"
                  placeholder="smtp.nerve.core" 
                  className="bg-transparent border-0 border-b border-white/10 rounded-none px-0" 
                  icon={<Server className="h-4 w-4" />}
                />
                <TextInput 
                  label="SECURE_PORT"
                  placeholder="587" 
                  className="bg-transparent border-0 border-b border-white/10 rounded-none px-0" 
                  icon={<Hash className="h-4 w-4" />}
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-12 border-t border-white/5 relative group/footer">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover/footer:translate-x-[100%] transition-transform duration-1000" />
            <div className="flex items-center gap-3 opacity-20 transition-opacity group-hover:opacity-40">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">HANDSHAKE_PROTOCOL_LOCKED</span>
            </div>
            <Button 
              type="submit" 
              size="lg"
              icon={ShieldCheck}
              className="px-10"
            >
              COMMIT_RELAY_STATE
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}


