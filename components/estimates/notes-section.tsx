"use client";

import { FileText, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import DOMPurify from "isomorphic-dompurify";

interface NotesSectionProps {
  notesContent: string;
  isEditing: boolean;
  onNotesChange: (notes: string) => void;
}

// Safe HTML sanitization
const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html);
};

export function NotesSection({
  notesContent,
  isEditing,
  onNotesChange,
}: NotesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-text-primary" />
            <span>Notes</span>
          </div>
          {!isEditing && notesContent && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-70 hover:opacity-100"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notesContent}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any additional notes or comments about this estimate..."
              className="min-h-[150px] transition-colors focus:ring-2 focus:ring-primary/20"
              rows={6}
            />
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <p>Markdown formatting is supported</p>
              <p>{notesContent.length} characters</p>
            </div>
          </div>
        ) : (
          <div className="prose max-w-none prose-sm">
            {notesContent ? (
              <div className="bg-bg-subtle/30 rounded-lg p-4 border border-border-primary">
                <div
                  className="text-text-primary leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(notesContent.replace(/\n/g, "<br />")),
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-text-secondary mx-auto mb-4 opacity-50" />
                <p className="text-text-secondary">
                  No notes added yet.
                  {isEditing &&
                    " Start typing to add notes about this estimate."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Helpful tips for editing */}
        {isEditing && (
          <div className="mt-4 p-3 bg-bg-subtle/50 rounded-lg border border-border-primary">
            <h4 className="text-sm font-medium text-text-primary mb-2">
              Formatting Tips:
            </h4>
            <div className="text-xs text-text-secondary space-y-1">
              <p>• Use **bold** or *italic* for emphasis</p>
              <p>• Add bullet points with • or - for lists</p>
              <p>• Separate paragraphs with blank lines</p>
              <p>
                • Include special instructions, safety notes, or client
                requirements
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
