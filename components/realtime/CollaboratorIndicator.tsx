/**
 * Collaborator Indicator Component
 * Shows active collaborators and their real-time activities
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  User,
  MessageCircle,
  MousePointer,
  Edit3,
  Eye,
} from "lucide-react";
import { useCollaboration } from "@/hooks/useCollaboration";
import type { Collaborator } from "@/hooks/useCollaboration";

interface CollaboratorIndicatorProps {
  estimateId?: string;
  showDetails?: boolean;
  showCursors?: boolean;
  maxAvatars?: number;
  className?: string;
}

interface CursorProps {
  collaborator: Collaborator;
  show: boolean;
}

function CollaboratorCursor({ collaborator, show }: CursorProps) {
  if (!show || !collaborator.cursor) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: "fixed",
        left: collaborator.cursor.x,
        top: collaborator.cursor.y,
        zIndex: 9999,
        pointerEvents: "none",
      }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div className="flex items-center gap-1">
        <MousePointer
          className="w-4 h-4"
          style={{ color: collaborator.color }}
          fill={collaborator.color}
        />
        <div
          className="px-2 py-1 rounded text-xs text-white shadow-lg whitespace-nowrap"
          style={{ backgroundColor: collaborator.color }}
        >
          {collaborator.name}
        </div>
      </div>
    </motion.div>
  );
}

export function CollaboratorIndicator({
  estimateId,
  showDetails = false,
  showCursors = true,
  maxAvatars = 5,
  className = "",
}: CollaboratorIndicatorProps) {
  const { collaborators, isConnected, joinSession, collaborationState } =
    useCollaboration({
      estimateId,
      autoJoin: !!estimateId,
      trackCursor: showCursors,
      trackTyping: true,
    });

  const [isExpanded, setIsExpanded] = useState(false);

  // Sort collaborators by activity
  const sortedCollaborators = [...collaborators].sort((a, b) => {
    // Active users first
    if (a.isTyping && !b.isTyping) return -1;
    if (!a.isTyping && b.isTyping) return 1;

    // Then by last seen
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  const visibleCollaborators = sortedCollaborators.slice(0, maxAvatars);
  const hiddenCount = Math.max(0, sortedCollaborators.length - maxAvatars);

  const getActivityIcon = (collaborator: Collaborator) => {
    if (collaborator.isTyping) {
      return <Edit3 className="w-3 h-3 text-blue-600" />;
    }
    if (collaborator.activeField) {
      return <Eye className="w-3 h-3 text-green-600" />;
    }
    return null;
  };

  const getActivityLabel = (collaborator: Collaborator) => {
    if (collaborator.isTyping && collaborator.activeField) {
      return `Typing in ${collaborator.activeField}`;
    }
    if (collaborator.activeField) {
      return `Viewing ${collaborator.activeField}`;
    }
    return "Online";
  };

  const formatLastSeen = (lastSeen: string) => {
    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMs = now.getTime() - seen.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  if (!isConnected || collaborators.length === 0) {
    return null;
  }

  return (
    <>
      {/* Main indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          relative bg-white rounded-lg shadow-lg border border-gray-200
          ${className}
        `}
      >
        <div
          className="p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-600" />

            <div className="flex items-center gap-2">
              {/* Collaborator avatars */}
              <div className="flex -space-x-2">
                {visibleCollaborators.map((collaborator) => (
                  <motion.div
                    key={collaborator.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="relative"
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white shadow-sm"
                      style={{ backgroundColor: collaborator.color }}
                      title={`${collaborator.name} - ${getActivityLabel(collaborator)}`}
                    >
                      {collaborator.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={collaborator.avatar}
                          alt={collaborator.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        collaborator.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Activity indicator */}
                    {(collaborator.isTyping || collaborator.activeField) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
                      >
                        {getActivityIcon(collaborator)}
                      </motion.div>
                    )}

                    {/* Typing animation */}
                    {collaborator.isTyping && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    )}
                  </motion.div>
                ))}

                {/* Show overflow count */}
                {hiddenCount > 0 && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                    +{hiddenCount}
                  </div>
                )}
              </div>

              {/* Count and status */}
              <div className="text-sm text-gray-600">
                {collaborators.length === 1
                  ? "1 person"
                  : `${collaborators.length} people`}
              </div>
            </div>

            {/* Real-time activity indicator */}
            <div className="ml-auto">
              {collaborators.some((c) => c.isTyping) && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex items-center gap-1 text-xs text-blue-600"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>typing...</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed view */}
        <AnimatePresence>
          {(isExpanded || showDetails) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 px-3 py-2"
            >
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sortedCollaborators.map((collaborator) => (
                  <motion.div
                    key={collaborator.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3 py-1"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: collaborator.color }}
                    >
                      {collaborator.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={collaborator.avatar}
                          alt={collaborator.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        collaborator.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {collaborator.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getActivityLabel(collaborator)} •{" "}
                        {formatLastSeen(collaborator.lastSeen)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {getActivityIcon(collaborator)}
                      {collaborator.isTyping && (
                        <motion.div
                          className="w-1 h-1 bg-blue-500 rounded-full"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Connection stats */}
              <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Active Sessions:</span>
                  <span>{collaborationState.userActivity.activeUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Sessions:</span>
                  <span>{collaborationState.userActivity.totalSessions}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Render cursors */}
      {showCursors && (
        <AnimatePresence>
          {collaborators.map((collaborator) => (
            <CollaboratorCursor
              key={`cursor-${collaborator.id}`}
              collaborator={collaborator}
              show={!!collaborator.cursor}
            />
          ))}
        </AnimatePresence>
      )}
    </>
  );
}

export default CollaboratorIndicator;
