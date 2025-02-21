import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import type { DatastoreEntry } from "@/types/api"; // Removed unused EntryListProps

interface ExtendedEntryListProps {
  universeId: string;
  apiToken: string;
  datastoreName: string;
  selectedEntryKey: string;
  onSelectEntry: (key: string) => void;
}

export default function EntryList({
  universeId,
  apiToken,
  datastoreName,
  selectedEntryKey,
  onSelectEntry,
}: ExtendedEntryListProps) {
  const [entries, setEntries] = useState<DatastoreEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cursor, setCursor] = useState<string>("");
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const fetchEntries = useCallback(
    async (searchValue: string, newSearch: boolean = false) => {
      try {
        setIsLoading(true);
        const currentCursor = newSearch ? "" : cursor;
        const params = new URLSearchParams({
          universeId,
          apiToken,
          prefix: searchValue,
          ...(currentCursor && { cursor: currentCursor }),
        });

        const response = await fetch(
          `/api/datastores/${encodeURIComponent(datastoreName)}?${params}`
        );
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const formattedEntries = (data.keys || []).map((k: { key: string }) => ({
          key: k.key
        }));

        setEntries((prev: DatastoreEntry[]) =>
          newSearch ? formattedEntries : [...prev, ...formattedEntries]
        );
        setCursor(data.nextPageCursor || "");
        setHasMore(!!data.nextPageCursor);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        toast("Error: " + errorMessage, "error", { duration: 3000 });
      } finally {
        setIsLoading(false);
      }
    },
    [cursor, toast, datastoreName, universeId, apiToken]
  );

  useEffect(() => {
    if (datastoreName) {
      fetchEntries("", true);
    }
  }, [datastoreName, fetchEntries]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (datastoreName) {
        fetchEntries(searchQuery, true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchEntries, datastoreName]);

  const observerTarget = useCallback(
    (node: HTMLDivElement) => {
      if (!node || isLoading || !hasMore) return;

      const observer = new IntersectionObserver(
        (entriesObs) => {
          if (entriesObs[0].isIntersecting) {
            fetchEntries(searchQuery);
          }
        },
        { threshold: 1.0 }
      );

      observer.observe(node);
      return () => observer.disconnect();
    },
    [fetchEntries, isLoading, hasMore, searchQuery]
  );

  const handleEntrySelect = (key: string) => {
    console.log('Selected entry:', key);
    onSelectEntry(key);
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500">
        <CardTitle className="text-white">Entries</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchEntries(e.target.value, true);
            }}
          />
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-2">
              {entries.map((entry) => (
                <Button
                  key={entry.key}
                  onClick={() => handleEntrySelect(entry.key)}
                  variant={selectedEntryKey === entry.key ? "secondary" : "outline"}
                  className="w-full justify-start text-left"
                >
                  {entry.key}
                </Button>
              ))}
              {hasMore && (
                <div ref={observerTarget} className="py-4 text-center">
                  {isLoading && (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
