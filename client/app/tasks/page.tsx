"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import {
  CheckCircle2,
  Plus,
  Trash2,
  ListTodo,
  Search,
  Calendar,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/TextInput';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';

type Priority = 'low' | 'medium' | 'high';
interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  category: string;
  createdAt: string;
}

const priorityConfig = {
  high:   { label: 'High',   badge: 'error'   as const },
  medium: { label: 'Medium', badge: 'warning' as const },
  low:    { label: 'Low',    badge: 'info'    as const },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [view, setView] = useState<'list' | 'board'>('list');

  useEffect(() => {
    const saved = localStorage.getItem('nerve_todo_data_v2');
    if (saved) {
      try { setTasks(JSON.parse(saved)); } catch (e) { console.error("Failed to parse tasks", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nerve_todo_data_v2', JSON.stringify(tasks));
  }, [tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, rate };
  }, [tasks]);

  const filteredTasks = tasks.filter(t => {
    const matchesFilter = filter === 'all' || (filter === 'active' ? !t.completed : t.completed);
    const matchesSearch = t.text.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const addTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      text: newTaskText.trim(),
      completed: false,
      priority: newTaskPriority,
      category: 'General',
      createdAt: new Date().toISOString(),
    };
    setTasks([newTask, ...tasks]);
    setNewTaskText('');
    toast.success("Task added");
  };

  const toggleTask = (id: string) =>
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.info("Task removed");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tasks"
          description="Manage and track your work items."
          actions={
            <div className="flex items-center gap-1.5 p-0.5 rounded-lg border border-border bg-muted/40">
              {(['list', 'board'] as const).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? "secondary" : "ghost"}
                  size="xs"
                  onClick={() => setView(v)}
                  className="capitalize"
                >
                  {v}
                </Button>
              ))}
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Completed', value: stats.completed },
            { label: 'Remaining', value: stats.pending },
            { label: 'Completion', value: `${stats.rate}%` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Add task */}
            <SectionCard noPadding>
              <form onSubmit={addTask} className="flex items-center gap-2 p-3">
                <div className="flex-1">
                  <TextInput
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a new task..."
                    className="border-none bg-transparent shadow-none focus-visible:ring-0"
                    icon={<Plus />}
                  />
                </div>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                  className="h-9 rounded-md border border-border bg-background text-sm px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <Button type="submit" size="sm">Add</Button>
              </form>
            </SectionCard>

            {/* Filters */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1">
                {(['all', 'active', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "h-8 px-3 rounded-md text-sm transition-colors capitalize",
                      filter === f
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <TextInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-48"
                icon={<Search />}
              />
            </div>

            {/* Task list */}
            {filteredTasks.length === 0 ? (
              <SectionCard>
                <EmptyState
                  icon={<ListTodo />}
                  title="No tasks found"
                  description={search ? "No tasks match your search." : "Add a task above to get started."}
                />
              </SectionCard>
            ) : view === 'list' ? (
              <div className="space-y-6">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                  const priorityTasks = filteredTasks.filter(t => t.priority === p);
                  if (priorityTasks.length === 0) return null;
                  return (
                    <div key={p}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-xs font-medium text-muted-foreground capitalize">{p} priority</span>
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">{priorityTasks.length}</span>
                      </div>
                      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
                        {priorityTasks.map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "group flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors",
                              task.completed && "opacity-60"
                            )}
                          >
                            <button
                              onClick={() => toggleTask(task.id)}
                              className={cn(
                                "h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors",
                                task.completed
                                  ? "bg-foreground border-foreground text-background"
                                  : "border-border hover:border-foreground/50"
                              )}
                              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                            >
                              {task.completed && <CheckCircle2 className="h-3 w-3" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <span className={cn("text-sm", task.completed && "line-through text-muted-foreground")}>
                                {task.text}
                              </span>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Tag className="h-3 w-3" />
                                  {task.category}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <StatusBadge variant={priorityConfig[task.priority].badge}>
                              {priorityConfig[task.priority].label}
                            </StatusBadge>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <div key={p}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-xs font-medium text-muted-foreground capitalize">{p}</span>
                      <span className="text-xs text-muted-foreground">
                        {filteredTasks.filter(t => t.priority === p).length}
                      </span>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-2 min-h-[120px] space-y-2">
                      {filteredTasks.filter(t => t.priority === p).map(task => (
                        <div key={task.id} className="rounded-lg border border-border bg-card p-3 group">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={cn("text-sm leading-snug", task.completed && "line-through text-muted-foreground")}>
                              {task.text}
                            </span>
                            <button
                              onClick={() => toggleTask(task.id)}
                              className={cn(
                                "h-4 w-4 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                                task.completed ? "bg-foreground border-foreground text-background" : "border-border"
                              )}
                            >
                              {task.completed && <CheckCircle2 className="h-3 w-3" />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <SectionCard title="Priority breakdown">
              <div className="space-y-4">
                {(['high', 'medium', 'low'] as Priority[]).map(p => {
                  const count = tasks.filter(t => t.priority === p).length;
                  const pct = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
                  return (
                    <div key={p} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground capitalize">{p}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            p === 'high' ? "bg-red-500" : p === 'medium' ? "bg-amber-500" : "bg-blue-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Actions">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setTasks(tasks.filter(t => !t.completed))}
                >
                  Clear completed tasks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                  onClick={() => {
                    if (confirm("Delete all tasks?")) setTasks([]);
                  }}
                >
                  Delete all tasks
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
