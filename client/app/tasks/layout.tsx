"use client";

import React from "react";

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
