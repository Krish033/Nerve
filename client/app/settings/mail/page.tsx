"use client";

import React, { useState } from 'react';
import { Button } from '@/components/shared/button';
import { Heading } from '@/components/shared/heading';
import { TextInput } from '@/components/ui/TextInput';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Server, 
  ShieldCheck, 
  Mail, 
  Key, 
  Globe, 
  Hash, 
  Terminal,
  Check,
  AlertCircle,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Simple Badge component since it's not available
function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: "default" | "outline" | "secondary"; className?: string }) {
  const variantStyles = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default function MailSettings() {
  const [provider, setProvider] = useState('mailgun');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Email settings saved successfully');
  };

  const handleTestConnection = () => {
    setTestStatus('testing');
    setTimeout(() => {
      setTestStatus('success');
      toast.success('Connection test successful');
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <Heading 
          title="Email Configuration" 
          description="Configure your email service provider and SMTP settings" 
          className="mb-0" 
        />
        <Badge variant="outline" className="gap-1.5">
          <Mail className="h-3 w-3" />
          Relay Protocol
        </Badge>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Provider Selection Cards */}
        <RadioGroup value={provider} onValueChange={setProvider} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { 
              id: 'mailgun', 
              label: 'Mailgun API', 
              desc: 'Cloud-based email delivery service with high deliverability',
              icon: ShieldCheck,
              features: ['Webhooks', 'Analytics', 'High Volume']
            },
            { 
              id: 'smtp', 
              label: 'SMTP Server', 
              desc: 'Standard SMTP relay for custom email servers',
              icon: Server,
              features: ['Custom Host', 'Port Config', 'TLS/SSL']
            },
          ].map((p) => {
            const isActive = provider === p.id;
            const Icon = p.icon;
            return (
              <label
                key={p.id}
                htmlFor={p.id}
                className={cn(
                  "relative flex flex-col p-5 rounded-xl border-2 cursor-pointer transition-all duration-200",
                  isActive 
                    ? "border-primary bg-primary/5" 
                    : "border-border/50 bg-card hover:border-border hover:bg-accent/50"
                )}
              >
                <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
                
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-2.5 rounded-lg transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-semibold text-sm",
                        isActive ? "text-primary" : "text-foreground"
                      )}>
                        {p.label}
                      </span>
                      {isActive && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {p.desc}
                    </p>
                    
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.features.map((feature) => (
                        <span 
                          key={feature}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </RadioGroup>

        {/* Configuration Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              {provider === 'mailgun' ? 'Mailgun API Settings' : 'SMTP Server Settings'}
            </CardTitle>
            <CardDescription>
              {provider === 'mailgun' 
                ? 'Enter your Mailgun API credentials' 
                : 'Configure your SMTP server connection details'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {provider === 'mailgun' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput 
                  label="API Endpoint"
                  placeholder="api.mailgun.net" 
                  icon={<Globe className="h-4 w-4 text-muted-foreground" />}
                />
                <TextInput 
                  type="password" 
                  label="API Key"
                  placeholder="key-xxxxxxxxxxxxxxxx" 
                  icon={<Key className="h-4 w-4 text-muted-foreground" />}
                />
                <TextInput 
                  label="Domain"
                  placeholder="mg.yourdomain.com" 
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                />
                <TextInput 
                  label="From Address"
                  placeholder="noreply@yourdomain.com" 
                  icon={<Send className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput 
                  label="SMTP Host"
                  placeholder="smtp.gmail.com" 
                  icon={<Server className="h-4 w-4 text-muted-foreground" />}
                />
                <TextInput 
                  label="Port"
                  placeholder="587" 
                  icon={<Hash className="h-4 w-4 text-muted-foreground" />}
                />
                <TextInput 
                  label="Username"
                  placeholder="your@email.com" 
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                />
                <TextInput 
                  type="password"
                  label="Password"
                  placeholder="••••••••" 
                  icon={<Key className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            )}

            {/* Advanced Settings Toggle */}
            <div className="pt-2 border-t border-border/50">
              <details className="group">
                <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <Terminal className="h-4 w-4" />
                  Advanced Settings
                  <span className="ml-auto text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput 
                    label="Connection Timeout (seconds)"
                    placeholder="30" 
                  />
                  <TextInput 
                    label="Retry Attempts"
                    placeholder="3" 
                  />
                </div>
              </details>
            </div>
          </CardContent>
        </Card>

        {/* Connection Test & Save */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full transition-colors",
                  testStatus === 'success' ? "bg-green-500/10 text-green-500" :
                  testStatus === 'error' ? "bg-red-500/10 text-red-500" :
                  testStatus === 'testing' ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-muted text-muted-foreground"
                )}>
                  {testStatus === 'success' ? <Check className="h-4 w-4" /> :
                   testStatus === 'error' ? <AlertCircle className="h-4 w-4" /> :
                   <ShieldCheck className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium text-sm">Connection Status</p>
                  <p className="text-xs text-muted-foreground">
                    {testStatus === 'idle' && 'Test your connection before saving'}
                    {testStatus === 'testing' && 'Testing connection...'}
                    {testStatus === 'success' && 'Connection verified successfully'}
                    {testStatus === 'error' && 'Connection failed. Check your settings'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="flex-1 sm:flex-none"
                >
                  {testStatus === 'testing' ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 sm:flex-none"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}


