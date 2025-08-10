"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollaborationProvider } from "./CollaborationProvider";
import { CollaborativeField } from "./CollaborativeField";
import { CollaboratorAvatars } from "./CollaboratorAvatars";
import { RealTimeChangeIndicator } from "./RealTimeChangeIndicator";
import { ConflictResolutionDialog } from "./ConflictResolutionDialog";
import { CollaborativeStepExample } from "./CollaborativeStepExample";
import {
  Users,
  Zap,
  Eye,
  Edit3,
  MessageSquare,
  Shield,
  Clock,
  GitMerge,
  Wifi,
  CheckCircle,
  AlertTriangle,
  Settings,
  Play,
  UserPlus,
} from "lucide-react";

export function CollaborationDemo() {
  const [activeTab, setActiveTab] = useState("overview");
  const [simulationMode, setSimulationMode] = useState<
    "single" | "multi" | "conflict"
  >("single");
  const [sampleData, setSampleData] = useState({
    customerName: "ABC Corporation",
    company: "ABC Corp",
    email: "contact@abccorp.com",
    projectType: "office",
    projectSize: 50000,
    description: "Complete office cleaning service",
  });

  const collaborationFeatures = [
    {
      id: "real-time",
      name: "Real-Time Sync",
      icon: Zap,
      description: "Changes are synchronized instantly across all users",
      color:
        "text-primary-action bg-primary-action/10 border-primary-action/30",
      status: "active",
    },
    {
      id: "presence",
      name: "Presence Awareness",
      icon: Eye,
      description: "See who's online and what they're working on",
      color:
        "text-success-600 bg-success-50 border-success-200 dark:text-success-400 dark:bg-success-900/20 dark:border-success-400/30",
      status: "active",
    },
    {
      id: "conflict-resolution",
      name: "Conflict Resolution",
      icon: GitMerge,
      description: "Intelligent handling of simultaneous edits",
      color:
        "text-primary-action bg-primary-action/10 border-primary-action/30",
      status: "active",
    },
    {
      id: "permissions",
      name: "Role-Based Access",
      icon: Shield,
      description: "Granular permissions for different user roles",
      color:
        "text-warning-600 bg-warning-50 border-warning-200 dark:text-warning-400 dark:bg-warning-900/20 dark:border-warning-400/30",
      status: "active",
    },
    {
      id: "history",
      name: "Change History",
      icon: Clock,
      description: "Complete audit trail of all modifications",
      color:
        "text-primary-action bg-primary-action/10 border-primary-action/30",
      status: "active",
    },
    {
      id: "comments",
      name: "Collaborative Comments",
      icon: MessageSquare,
      description: "Contextual discussions and feedback",
      color:
        "text-secondary-action bg-secondary-action/10 border-secondary-action/30",
      status: "coming-soon",
    },
  ];

  const handleDataUpdate = (newData: any) => {
    setSampleData((prev) => ({ ...prev, ...newData }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Users className="w-10 h-10 text-primary-action" />
          Multi-User Collaboration System
        </h1>
        <p className="text-xl text-text-secondary max-w-3xl mx-auto">
          Experience real-time collaboration with advanced conflict resolution,
          presence awareness, and intelligent permission management.
        </p>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="live-demo">Live Demo</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">System Overview</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-success-600 dark:text-success-400" />
                  <h3 className="font-semibold">Real-Time Connection</h3>
                </div>
                <p className="text-sm text-text-secondary">
                  WebSocket-based real-time communication using Supabase&apos;s
                  real-time infrastructure for instant updates.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-action" />
                  <h3 className="font-semibold">Secure Collaboration</h3>
                </div>
                <p className="text-sm text-text-secondary">
                  Role-based permissions with field-level access control and Row
                  Level Security (RLS) policies.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-primary-action" />
                  <h3 className="font-semibold">Conflict Resolution</h3>
                </div>
                <p className="text-sm text-text-secondary">
                  Intelligent conflict detection with multiple resolution
                  strategies and merge assistance.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5" />
                  <span className="text-sm">
                    Teams can work simultaneously without conflicts
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5" />
                  <span className="text-sm">
                    Real-time visibility into team member activities
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5" />
                  <span className="text-sm">
                    Automatic conflict detection and resolution
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5" />
                  <span className="text-sm">
                    Complete audit trail of all changes
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5" />
                  <span className="text-sm">
                    Mobile-optimized collaborative experience
                  </span>
                </li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                Technical Highlights
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-primary-action mt-0.5" />
                  <span className="text-sm">
                    Sub-second latency for real-time updates
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Settings className="w-5 h-5 text-primary-action mt-0.5" />
                  <span className="text-sm">
                    Optimistic updates with conflict recovery
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-primary-action mt-0.5" />
                  <span className="text-sm">
                    End-to-end encryption for sensitive data
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-primary-action mt-0.5" />
                  <span className="text-sm">
                    Automatic cleanup of old sessions and data
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="w-5 h-5 text-primary-action mt-0.5" />
                  <span className="text-sm">
                    Supports unlimited concurrent users
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collaborationFeatures.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <Card
                  key={feature.id}
                  className={`p-6 border-2 ${feature.color}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-6 h-6" />
                        <h3 className="font-semibold">{feature.name}</h3>
                      </div>
                      <Badge
                        variant={
                          feature.status === "active" ? "default" : "secondary"
                        }
                      >
                        {feature.status === "active" ? "Active" : "Coming Soon"}
                      </Badge>
                    </div>

                    <p className="text-sm text-text-secondary">
                      {feature.description}
                    </p>

                    {feature.status === "active" && (
                      <div className="flex items-center gap-2 text-xs text-success-600 dark:text-success-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Fully Implemented</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">
              Collaboration Workflow
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary-action/10 flex items-center justify-center text-primary-action font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">User Joins Session</h4>
                  <p className="text-sm text-text-secondary">
                    Authentication and permission verification
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center text-success-600 dark:text-success-400 font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Real-Time Sync</h4>
                  <p className="text-sm text-text-secondary">
                    Presence awareness and live data synchronization
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary-action/10 flex items-center justify-center text-primary-action font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Conflict Detection</h4>
                  <p className="text-sm text-text-secondary">
                    Automatic detection of simultaneous edits
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-warning-100 dark:bg-warning-900/20 flex items-center justify-center text-warning-600 dark:text-warning-400 font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium">Smart Resolution</h4>
                  <p className="text-sm text-text-secondary">
                    Intelligent conflict resolution with user assistance
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Live Demo Tab */}
        <TabsContent value="live-demo" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Live Collaboration Demo</h2>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Simulation Mode:</label>
                <select
                  value={simulationMode}
                  onChange={(e) => setSimulationMode(e.target.value as any)}
                  className="px-3 py-2 border border-border-primary rounded-md text-sm"
                >
                  <option value="single">Single User</option>
                  <option value="multi">Multi-User</option>
                  <option value="conflict">Conflict Scenario</option>
                </select>
              </div>
            </div>

            <Alert className="mb-6">
              <Play className="h-4 w-4" />
              <div>
                <h4 className="font-medium">Demo Instructions</h4>
                <p className="text-sm">
                  This demo showcases the collaboration features in action. Try
                  different simulation modes to see how the system handles
                  various scenarios.
                </p>
              </div>
            </Alert>

            <CollaborationProvider
              estimateId="demo-estimate"
              autoConnect={false}
              conflictResolution="manual-review"
            >
              <CollaborativeStepExample
                data={sampleData}
                onUpdate={handleDataUpdate}
                onNext={() => console.log("Next step")}
                onBack={() => console.log("Back step")}
                stepId="demo-step"
              />
            </CollaborationProvider>
          </Card>
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">System Architecture</h2>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Frontend Components
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-action rounded-full"></div>
                      <code>CollaborationProvider</code> - Context management
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                      <code>CollaborativeField</code> - Real-time form fields
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-action rounded-full"></div>
                      <code>CollaboratorAvatars</code> - User presence display
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-warning-500 rounded-full"></div>
                      <code>ConflictResolutionDialog</code> - Conflict UI
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Backend Services
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-error-500 rounded-full"></div>
                      <code>RealTimeCollaborationEngine</code> - Core engine
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-warning-500 rounded-full"></div>
                      <code>Supabase Real-time</code> - WebSocket infrastructure
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-action rounded-full"></div>
                      <code>PostgreSQL</code> - Data persistence
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-secondary-action rounded-full"></div>
                      <code>Row Level Security</code> - Access control
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-bg-subtle p-4 rounded-lg">
                <h4 className="font-medium mb-2">Data Flow</h4>
                <div className="text-sm text-text-secondary space-y-1">
                  <div>
                    1. User makes change → CollaborativeField captures input
                  </div>
                  <div>
                    2. Change broadcasted → RealTimeCollaborationEngine
                    processes
                  </div>
                  <div>
                    3. Conflict detection → Smart algorithms check for conflicts
                  </div>
                  <div>
                    4. Resolution → Automatic or manual conflict resolution
                  </div>
                  <div>
                    5. Sync to all users → Real-time updates via WebSocket
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Database Schema</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 text-primary-action">
                  Core Tables
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <code>estimate_collaborators</code> - User roles and
                    permissions
                  </li>
                  <li>
                    <code>estimate_changes</code> - Change history and audit
                    trail
                  </li>
                  <li>
                    <code>collaboration_sessions</code> - Active user sessions
                  </li>
                  <li>
                    <code>collaboration_conflicts</code> - Conflict tracking
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-3 text-success-600 dark:text-success-400">
                  Security Features
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>Row Level Security (RLS) policies</li>
                  <li>Real-time subscription authorization</li>
                  <li>Field-level access control</li>
                  <li>Audit logging and compliance</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CollaborationDemo;
