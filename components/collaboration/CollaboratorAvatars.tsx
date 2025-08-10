"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCollaboration } from "./CollaborationProvider";
import {
  Users,
  Eye,
  Edit3,
  Crown,
  Clock,
  MapPin,
  UserPlus,
  Settings,
  LogOut,
} from "lucide-react";
import { CollaboratorPresence } from "@/lib/collaboration/real-time-engine";

interface CollaboratorAvatarsProps {
  maxVisible?: number;
  showInviteButton?: boolean;
  compact?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function CollaboratorAvatars({
  maxVisible = 5,
  showInviteButton = true,
  compact = false,
  position = "top",
  className = "",
}: CollaboratorAvatarsProps) {
  const {
    activeUsers,
    currentUser,
    permissions,
    getUserCursor,
    inviteCollaborator,
    removeCollaborator,
  } = useCollaboration();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [isInviting, setIsInviting] = useState(false);

  // Sort users: current user first, then by activity
  const sortedUsers = [...activeUsers].sort((a, b) => {
    if (a.userId === currentUser?.userId) return -1;
    if (b.userId === currentUser?.userId) return 1;
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  const visibleUsers = sortedUsers.slice(0, maxVisible);
  const hiddenUsers = sortedUsers.slice(maxVisible);

  const handleInviteCollaborator = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      await inviteCollaborator(inviteEmail, inviteRole);
      setInviteEmail("");
      setShowInviteDialog(false);
    } catch (error) {
      console.error("Failed to invite collaborator:", error);
    } finally {
      setIsInviting(false);
    }
  };

  const getRoleIcon = (role: CollaboratorPresence["role"]) => {
    switch (role) {
      case "owner":
        return (
          <Crown className="w-3 h-3 text-warning-600 dark:text-warning-400" />
        );
      case "editor":
        return <Edit3 className="w-3 h-3 text-primary-action" />;
      case "viewer":
        return <Eye className="w-3 h-3 text-text-secondary" />;
      default:
        return null;
    }
  };

  const getActivityStatus = (user: CollaboratorPresence) => {
    const lastSeenTime = new Date(user.lastSeen).getTime();
    const now = Date.now();
    const diffMinutes = (now - lastSeenTime) / (1000 * 60);

    if (diffMinutes < 1) return "active";
    if (diffMinutes < 5) return "recent";
    return "away";
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success-500";
      case "recent":
        return "bg-warning-500";
      case "away":
        return "bg-text-muted";
      default:
        return "bg-text-muted";
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => {
            const activityStatus = getActivityStatus(user);
            const isCurrentUser = user.userId === currentUser?.userId;

            return (
              <TooltipProvider key={user.userId}>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="relative">
                      <Avatar
                        className={`w-6 h-6 border-2 ${isCurrentUser ? "border-primary-action" : "border-bg-base"}`}
                      >
                        <AvatarImage src={user.avatar} alt={user.userName} />
                        <AvatarFallback className="text-xs">
                          {user.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-bg-base ${getActivityColor(activityStatus)}`}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side={position}>
                    <div className="text-center">
                      <div className="font-medium">{user.userName}</div>
                      <div className="text-xs text-text-muted">
                        {user.userEmail}
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        {getRoleIcon(user.role)}
                        <span className="text-xs capitalize">{user.role}</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {hiddenUsers.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="w-6 h-6 rounded-full bg-bg-subtle border-2 border-bg-base flex items-center justify-center text-xs font-medium text-text-secondary">
                  +{hiddenUsers.length}
                </div>
              </TooltipTrigger>
              <TooltipContent side={position}>
                <div className="space-y-1">
                  {hiddenUsers.map((user) => (
                    <div key={user.userId} className="text-xs">
                      {user.userName}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showInviteButton && permissions?.canShare && (
          <Popover open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                <UserPlus className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" side={position}>
              <div className="space-y-4">
                <h4 className="font-medium">Invite Collaborator</h4>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-md text-sm"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "editor" | "viewer")
                    }
                    className="w-full px-3 py-2 border border-border-primary rounded-md text-sm"
                  >
                    <option value="editor">
                      Editor - Can edit and comment
                    </option>
                    <option value="viewer">
                      Viewer - Can view and comment
                    </option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleInviteCollaborator}
                    disabled={!inviteEmail.trim() || isInviting}
                    className="flex-1"
                    size="sm"
                  >
                    {isInviting ? "Inviting..." : "Invite"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteDialog(false)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-text-secondary" />
            <h3 className="font-medium">
              Collaborators ({activeUsers.length})
            </h3>
          </div>
          {showInviteButton && permissions?.canShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteDialog(true)}
              className="flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {activeUsers.map((user) => {
            const activityStatus = getActivityStatus(user);
            const isCurrentUser = user.userId === currentUser?.userId;
            const cursor = getUserCursor(user.userId);

            return (
              <div
                key={user.userId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      className={`w-8 h-8 ${isCurrentUser ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <AvatarImage src={user.avatar} alt={user.userName} />
                      <AvatarFallback>
                        {user.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-base ${getActivityColor(activityStatus)}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {user.userName}
                        {isCurrentUser && (
                          <span className="text-text-muted"> (you)</span>
                        )}
                      </span>
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {user.userEmail}
                    </div>

                    {/* Current activity */}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Step {user.currentStep}
                      </Badge>

                      {cursor?.fieldId && (
                        <Badge
                          variant="outline"
                          className="text-xs flex items-center gap-1"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          Editing {cursor.fieldId}
                        </Badge>
                      )}

                      {activityStatus === "active" && (
                        <Badge className="text-xs bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400">
                          Online
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {!isCurrentUser && permissions?.canShare && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48" side="left">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {user.userName}
                        </div>
                        <div className="text-xs text-text-muted">
                          Role: {user.role}
                        </div>
                        <div className="border-t pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCollaborator(user.userId)}
                            className="w-full justify-start text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-900/20"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Remove Access
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite Dialog */}
        {showInviteDialog && (
          <div className="border-t pt-4">
            <div className="space-y-3">
              <h4 className="font-medium">Invite New Collaborator</h4>
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary rounded-md"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleInviteCollaborator();
                    }
                  }}
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "editor" | "viewer")
                  }
                  className="w-full px-3 py-2 border border-border-primary rounded-md"
                >
                  <option value="editor">Editor - Can edit and comment</option>
                  <option value="viewer">Viewer - Can view and comment</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleInviteCollaborator}
                  disabled={!inviteEmail.trim() || isInviting}
                  className="flex-1"
                >
                  {isInviting ? "Sending Invite..." : "Send Invite"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteEmail("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default CollaboratorAvatars;
