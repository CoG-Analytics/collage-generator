import { TemplateDefinition } from "@/lib/types";

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "two-vertical-split",
    label: "2 Photos: Vertical Split",
    imageCount: 2,
    slots: [
      { id: "slot-1", x: 0, y: 0, width: 0.5, height: 1 },
      { id: "slot-2", x: 0.5, y: 0, width: 0.5, height: 1 }
    ]
  },
  {
    id: "two-horizontal-split",
    label: "2 Photos: Horizontal Split",
    imageCount: 2,
    slots: [
      { id: "slot-1", x: 0, y: 0, width: 1, height: 0.5 },
      { id: "slot-2", x: 0, y: 0.5, width: 1, height: 0.5 }
    ]
  },
  {
    id: "three-columns",
    label: "3 Photos: Equal Columns",
    imageCount: 3,
    slots: [
      { id: "slot-1", x: 0, y: 0, width: 1 / 3, height: 1 },
      { id: "slot-2", x: 1 / 3, y: 0, width: 1 / 3, height: 1 },
      { id: "slot-3", x: 2 / 3, y: 0, width: 1 / 3, height: 1 }
    ]
  },
  {
    id: "three-one-plus-two",
    label: "3 Photos: Large + 2 Stacked",
    imageCount: 3,
    slots: [
      { id: "slot-1", x: 0, y: 0, width: 0.65, height: 1 },
      { id: "slot-2", x: 0.65, y: 0, width: 0.35, height: 0.5 },
      { id: "slot-3", x: 0.65, y: 0.5, width: 0.35, height: 0.5 }
    ]
  },
  {
    id: "four-grid",
    label: "4 Photos: 2 x 2 Grid",
    imageCount: 4,
    slots: [
      { id: "slot-1", x: 0, y: 0, width: 0.5, height: 0.5 },
      { id: "slot-2", x: 0.5, y: 0, width: 0.5, height: 0.5 },
      { id: "slot-3", x: 0, y: 0.5, width: 0.5, height: 0.5 },
      { id: "slot-4", x: 0.5, y: 0.5, width: 0.5, height: 0.5 }
    ]
  },
  {
    id: "four-vertical-strips",
    label: "4 Photos: Vertical Strips",
    imageCount: 4,
    slots: [
      { id: "slot-1", x: 0, y: 0, width: 0.25, height: 1 },
      { id: "slot-2", x: 0.25, y: 0, width: 0.25, height: 1 },
      { id: "slot-3", x: 0.5, y: 0, width: 0.25, height: 1 },
      { id: "slot-4", x: 0.75, y: 0, width: 0.25, height: 1 }
    ]
  }
];

export const getTemplatesByCount = (count: number): TemplateDefinition[] =>
  TEMPLATES.filter((template) => template.imageCount === count);

export const getTemplateById = (id: string): TemplateDefinition | undefined =>
  TEMPLATES.find((template) => template.id === id);
