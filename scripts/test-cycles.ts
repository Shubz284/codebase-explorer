import { findCircularEdges } from "../lib/detect-cycles";

const edges = [
  {
    sourceFileId: "A",
    targetFileId: "B",
  },
  {
    sourceFileId: "B",
    targetFileId: "C",
  },
  {
    sourceFileId: "C",
    targetFileId: "A",
  },
];

const circularEdges = findCircularEdges(edges);

console.log(circularEdges);