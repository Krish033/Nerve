"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, X, ListTodo, Edit2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/TextInput';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Priority = 'low' | 'medium' | 'high';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
}

export const TodoList = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activePriority, setActivePriority] = useState<Priority>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('nerve_todo_data_v2');
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse todos", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('nerve_todo_data_v2', JSON.stringify(todos));
  }, [todos]);

  const progress = useMemo(() => {
    if (todos.length === 0) return 0;
    const completed = todos.filter(t => t.completed).length;
    return Math.round((completed / todos.length) * 100);
  }, [todos]);

  const addTodo = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    
    const newTodo: Todo = {
      id: Math.random().toString(36).substring(7),
      text: inputValue.trim(),
      completed: false,
      priority: activePriority
    };
    
    setTodos([newTodo, ...todos]);
    setInputValue('');
    toast.success("Task added to your list");
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
    toast.info("Task removed");
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, text: editText } : t));
    setEditingId(null);
    toast.success("Task updated");
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-50 border border-border"
      >
        <ListTodo className="h-6 w-6" />
        {todos.filter(t => !t.completed).length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full border-2 border-background">
            {todos.filter(t => !t.completed).length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[600px] flex flex-col bg-card border border-border rounded-lg shadow-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b bg-muted/50">
        <div className="flex flex-col">
          <span className="text-lg font-bold">Your Tasks</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{progress}% Complete</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground p-2 hover:bg-accent rounded-md">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Input Area */}
      <div className="p-4 space-y-4 border-b">
        <form onSubmit={addTodo} className="flex gap-2">
          <TextInput
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a new task..."
            className="h-10"
          />
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Priority:</span>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => setActivePriority(p)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors",
                  activePriority === p 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background text-muted-foreground border-input hover:bg-accent"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {todos.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-center space-y-2">
            <AlertCircle className="h-8 w-8 opacity-20" />
            <p className="text-sm font-medium">No tasks yet.</p>
          </div>
        ) : (
          todos.map((todo) => (
            <div 
              key={todo.id} 
              className={cn(
                "flex items-center gap-3 p-3 rounded-md border bg-background",
                todo.completed && "opacity-50 grayscale"
              )}
            >
              <button 
                onClick={() => toggleTodo(todo.id)}
                className={cn(
                  "shrink-0",
                  todo.completed ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
              >
                {todo.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </button>
              
              {editingId === todo.id ? (
                <div className="flex-1 flex gap-2">
                  <TextInput 
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(todo.id)}
                    className="h-8"
                  />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => saveEdit(todo.id)}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <span 
                  onClick={() => !todo.completed && startEditing(todo)}
                  className={cn(
                    "flex-1 text-sm font-medium",
                    todo.completed && "line-through"
                  )}
                >
                  {todo.text}
                </span>
              )}

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => deleteTodo(todo.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{todos.length} items</span>
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => setTodos(todos.filter(t => !t.completed))}
          className="text-xs h-8"
        >
          Clear Completed
        </Button>
      </div>
    </div>
  );
};
