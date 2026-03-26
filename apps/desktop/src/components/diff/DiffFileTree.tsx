import { useMemo, useState } from "react";
import { ChevronRight, File, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PrFile } from "@forge/shared";

interface DiffFileTreeProps {
  files: PrFile[];
  selectedFile?: string;
  onSelectFile: (path: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  added: "text-green-400",
  removed: "text-red-400",
  modified: "text-yellow-400",
  renamed: "text-blue-400",
};

interface DirNode {
  name: string;
  path: string;
  files: PrFile[];
  children: DirNode[];
}

function buildTree(files: PrFile[]): DirNode {
  const root: DirNode = { name: "", path: "", files: [], children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    const fileName = parts.pop()!;
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const dirName = parts[i];
      const dirPath = parts.slice(0, i + 1).join("/");
      let child = current.children.find((c) => c.name === dirName);
      if (!child) {
        child = { name: dirName, path: dirPath, files: [], children: [] };
        current.children.push(child);
      }
      current = child;
    }

    current.files.push(file);
  }

  // Collapse single-child directories
  function collapse(node: DirNode): DirNode {
    node.children = node.children.map(collapse);
    if (node.children.length === 1 && node.files.length === 0 && node.name) {
      const child = node.children[0];
      return {
        name: `${node.name}/${child.name}`,
        path: child.path,
        files: child.files,
        children: child.children,
      };
    }
    return node;
  }

  return collapse(root);
}

export function DiffFileTree({ files, selectedFile, onSelectFile }: DiffFileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  // If all files are at root level, just render flat list
  const isFlat = tree.children.length === 0;

  return (
    <div className="text-xs">
      {isFlat ? (
        <div className="space-y-px">
          {tree.files.map((file) => (
            <FileRow
              key={file.path}
              file={file}
              isSelected={file.path === selectedFile}
              onClick={() => onSelectFile(file.path)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-px">
          {tree.children.map((dir) => (
            <DirGroup
              key={dir.path}
              node={dir}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
          {tree.files.map((file) => (
            <FileRow
              key={file.path}
              file={file}
              isSelected={file.path === selectedFile}
              onClick={() => onSelectFile(file.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DirGroup({
  node,
  selectedFile,
  onSelectFile,
}: {
  node: DirNode;
  selectedFile?: string;
  onSelectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 transition-transform",
            expanded && "rotate-90",
          )}
        />
        <FolderOpen className="h-3 w-3 shrink-0" />
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {expanded && (
        <div className="ml-3 border-l border-border pl-1">
          {node.children.map((child) => (
            <DirGroup
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
          {node.files.map((file) => (
            <FileRow
              key={file.path}
              file={file}
              isSelected={file.path === selectedFile}
              onClick={() => onSelectFile(file.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  isSelected,
  onClick,
}: {
  file: PrFile;
  isSelected: boolean;
  onClick: () => void;
}) {
  const fileName = file.path.split("/").pop() ?? file.path;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors",
        isSelected
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <File className={cn("h-3 w-3 shrink-0", STATUS_COLORS[file.status])} />
      <span className="truncate">{fileName}</span>
      <span className="ml-auto flex items-center gap-1 tabular-nums">
        {file.additions > 0 && (
          <span className="text-green-400">+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className="text-red-400">-{file.deletions}</span>
        )}
      </span>
    </button>
  );
}
