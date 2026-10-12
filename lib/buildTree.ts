export type TreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  fileId?: string;
  children: TreeNode[];
};

export function buildTree<T extends { id: string; path: string }>(
  files: T[]
): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "folder", children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;

    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");

      let child = node.children.find(
        (c) => c.name === part && c.type === (isFile ? "file" : "folder")
      );

      if (!child) {
        child = {
          name: part,
          path,
          type: isFile ? "file" : "folder",
          fileId: isFile ? file.id : undefined,
          children: [],
        };
        node.children.push(child);
      }
      node = child;
    });
  }

  // folders first, then alphabetical
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) =>
      a.type === b.type
        ? a.name.localeCompare(b.name)
        : a.type === "folder"
        ? -1
        : 1
    );
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root.children);

  return root.children;
}