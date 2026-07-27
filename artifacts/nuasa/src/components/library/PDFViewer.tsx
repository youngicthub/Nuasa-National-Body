import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PDFViewerProps {
  url: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export function PDFViewer({ url, title, isOpen, onClose, onDownload }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  // Reset loading state every time the dialog opens or the URL changes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setLoadFailed(false);
      // Safety net: if onLoad never fires (some browsers don't fire it for PDFs),
      // hide the spinner after 4s so the user isn't stuck on a blank loader.
      const t = window.setTimeout(() => setIsLoading(false), 4000);
      return () => window.clearTimeout(t);
    }
  }, [isOpen, url]);

  const isPdf = /\.pdf($|\?)/i.test(url);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="font-serif text-lg truncate pr-4">
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in new tab
                </a>
              </Button>
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/50 relative">
          {isLoading && !loadFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {loadFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-4">
              <p className="text-muted-foreground max-w-md">
                This document couldn't be previewed in the browser. Try opening it in a new tab or downloading it.
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in new tab
                  </a>
                </Button>
                {onDownload && (
                  <Button variant="outline" onClick={onDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          ) : isPdf ? (
            // Use Google Docs viewer fallback would require external service;
            // native iframe works for public PDFs served with correct headers.
            <object
              data={`${url}#toolbar=1&navpanes=0&scrollbar=1`}
              type="application/pdf"
              className="w-full h-full"
              onLoad={() => setIsLoading(false)}
            >
              <iframe
                src={url}
                title={title}
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
                onError={() => setLoadFailed(true)}
              />
            </object>
          ) : (
            <iframe
              src={url}
              title={title}
              className="w-full h-full border-0 bg-white"
              onLoad={() => setIsLoading(false)}
              onError={() => setLoadFailed(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
