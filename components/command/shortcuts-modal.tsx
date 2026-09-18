"use client";

import * as React from "react";
import { useIssueStore } from "@/store/issue-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

export function ShortcutsModal() {
  const open = useIssueStore((state) => state.shortcutsModalOpen);
  const setOpen = useIssueStore((state) => state.setShortcutsModalOpen);

  const shortcutGroups = [
    {
      name: "Global Controls",
      items: [
        { label: "Open Command Palette", key: "⌘ / Ctrl + K" },
        { label: "Focus Search Box", key: "/" },
        { label: "Keyboard Shortcuts Guide", key: "?" },
        { label: "Collapse / Expand Sidebar", key: "[" },
        { label: "Close Drawer / Dialog", key: "ESC" },
      ],
    },
    {
      name: "Operations & Navigation",
      items: [
        { label: "Report New Campus Issue", key: "n" },
        { label: "Toggle Theme (Light / Dark)", key: "t" },
        { label: "Copy Reference Code", key: "Click / Enter" },
        { label: "Inspect Incident Record", key: "Click Row" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-6 border-border/80 shadow-xl">
        <DialogHeader className="text-left space-y-1 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2 text-foreground font-semibold text-base">
            <Keyboard className="h-4 w-4 text-brand" />
            <DialogTitle className="text-base font-semibold">Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Fast keyboard navigation for power operators and campus staff.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {shortcutGroups.map((group) => (
            <div key={group.name} className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {group.name}
              </span>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-foreground">{item.label}</span>
                    <kbd className="font-mono text-[11px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/60 shadow-2xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
