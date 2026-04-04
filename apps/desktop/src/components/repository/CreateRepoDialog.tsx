import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateRepo } from "@/queries/useMutations";

const GITIGNORE_TEMPLATES = [
  "",
  "Node",
  "Python",
  "Rust",
  "Go",
  "Java",
  "Ruby",
  "Swift",
  "C",
  "C++",
  "CSharp",
  "Dart",
  "Kotlin",
  "Scala",
  "Haskell",
  "TeX",
  "Unity",
  "UnrealEngine",
  "VisualStudio",
];

const LICENSE_TEMPLATES = [
  { value: "", label: "None" },
  { value: "mit", label: "MIT" },
  { value: "apache-2.0", label: "Apache 2.0" },
  { value: "gpl-3.0", label: "GPL 3.0" },
  { value: "bsd-2-clause", label: "BSD 2-Clause" },
  { value: "bsd-3-clause", label: "BSD 3-Clause" },
  { value: "mpl-2.0", label: "MPL 2.0" },
  { value: "isc", label: "ISC" },
  { value: "unlicense", label: "Unlicense" },
  { value: "agpl-3.0", label: "AGPL 3.0" },
  { value: "lgpl-3.0", label: "LGPL 3.0" },
];

interface CreateRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (repo: {
    githubId: number;
    fullName: string;
    name: string;
    owner: string;
    isPrivate: boolean;
    defaultBranch: string;
    cloneUrl: string;
    htmlUrl: string;
  }) => void;
}

export function CreateRepoDialog({ open, onOpenChange, onCreated }: CreateRepoDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [autoInit, setAutoInit] = useState(true);
  const [gitignoreTemplate, setGitignoreTemplate] = useState("");
  const [licenseTemplate, setLicenseTemplate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createRepo = useCreateRepo();

  function resetForm() {
    setName("");
    setDescription("");
    setIsPrivate(true);
    setAutoInit(true);
    setGitignoreTemplate("");
    setLicenseTemplate("");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);

    try {
      const repo = await createRepo.mutateAsync({
        name: trimmed,
        isPrivate,
        autoInit,
        description: description.trim() || undefined,
        gitignoreTemplate: gitignoreTemplate || undefined,
        licenseTemplate: licenseTemplate || undefined,
      });
      resetForm();
      onOpenChange(false);
      onCreated(repo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("name already exists")) {
        setError("A repository with this name already exists on your account.");
      } else {
        setError(msg);
      }
    }
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Create New Repository</DialogTitle>
          <DialogDescription>
            Create a new GitHub repository and add it to your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-name">Repository name</Label>
            <Input
              id="repo-name"
              placeholder="my-new-project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="repo-description">Description</Label>
            <Input
              id="repo-description"
              placeholder="A short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="repo-private">Private repository</Label>
              <p className="text-xs text-muted-foreground">
                Only you and collaborators can see this repo
              </p>
            </div>
            <Switch
              id="repo-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="repo-auto-init">Initialize with README</Label>
              <p className="text-xs text-muted-foreground">
                Creates an initial commit so the repo can be cloned
              </p>
            </div>
            <Switch
              id="repo-auto-init"
              checked={autoInit}
              onCheckedChange={setAutoInit}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="repo-gitignore">.gitignore template</Label>
              <select
                id="repo-gitignore"
                className={selectClass}
                value={gitignoreTemplate}
                onChange={(e) => setGitignoreTemplate(e.target.value)}
              >
                <option value="">None</option>
                {GITIGNORE_TEMPLATES.filter(Boolean).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repo-license">License</Label>
              <select
                id="repo-license"
                className={selectClass}
                value={licenseTemplate}
                onChange={(e) => setLicenseTemplate(e.target.value)}
              >
                {LICENSE_TEMPLATES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createRepo.isPending}>
              {createRepo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create repository"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
