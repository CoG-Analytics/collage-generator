# Project Requirements Document (PRD)

## Scrapbook Collage Generator -- Client-Side Web Application (MVP)

------------------------------------------------------------------------

## 1. Project Overview

### 1.1 Purpose

Build a browser-based web application that allows users to:

-   Upload 2--4 photos\
-   Select a physical print frame size (e.g., 4×6 inches)\
-   Choose a layout template\
-   Automatically generate a collage sized for printing\
-   Export a high-resolution PNG (and optional PDF)

The application will run entirely client-side with no required backend
infrastructure.

------------------------------------------------------------------------

## 2. Goals and Non-Goals

### 2.1 Goals (MVP)

-   Fully client-side image handling and rendering\
-   Accurate print-dimension output at 300 DPI\
-   Simple layout templates for 2--4 photos\
-   Real-time preview of final output\
-   High-resolution PNG export

### 2.2 Non-Goals (MVP)

-   User accounts\
-   Cloud storage\
-   Multi-page projects\
-   Advanced image editing (filters, color correction, etc.)\
-   Payments or e-commerce integration

------------------------------------------------------------------------

## 3. Functional Requirements

### 3.1 Image Upload

#### User Requirements

-   User can upload 2--4 images.\
-   Supported formats: JPG, JPEG, PNG.\
-   Max size per image: 20MB.\
-   Reject unsupported types with clear error message.

#### System Requirements

-   Use drag-and-drop interface.\
-   Decode images using `createImageBitmap()` for performance.\
-   Normalize orientation (handle EXIF rotation).\
-   Generate a preview-resolution bitmap for UI rendering.\
-   Maintain reference to full-resolution image for export rendering.

------------------------------------------------------------------------

### 3.2 Frame Size Selection

#### Supported Frame Sizes (inches at 300 DPI)

  Frame Size   Pixel Dimensions
  ------------ ------------------
  4×6          1200×1800 px
  5×7          1500×2100 px
  8×10         2400×3000 px

#### User Options

-   Select frame size\
-   Select orientation (portrait/landscape)

#### System Behavior

-   Automatically calculate pixel dimensions based on selected inches
    and 300 DPI.\
-   Maintain correct aspect ratio in preview.

------------------------------------------------------------------------

### 3.3 Layout Templates

Provide predefined templates based on number of images.

#### 2 Photos

-   Vertical split (left/right)\
-   Horizontal split (top/bottom)

#### 3 Photos

-   3 equal vertical columns\
-   1 large + 2 stacked

#### 4 Photos

-   2×2 grid\
-   4 vertical strips

Each template must define:

-   Normalized slot rectangles (0--1 coordinate system)\
-   Gutter spacing (percentage of shorter edge)\
-   Default fit mode: `cover`

------------------------------------------------------------------------

### 3.4 Slot Behavior

Each slot must support:

-   Image assignment\
-   Swap/reorder\
-   Fit mode: `cover` (default) or `contain`\
-   Optional rotation (90° increments)\
-   Optional manual pan/zoom adjustment

Each slot maintains:

    {
      imageId,
      scale,
      offsetX,
      offsetY,
      rotation,
      fitMode
    }

------------------------------------------------------------------------

### 3.5 Canvas Preview Rendering

#### Preview Canvas

-   Lower resolution than export (1000--1600px longest side)\
-   Maintains accurate aspect ratio\
-   Displays optional safe-zone and cut-guide overlays

#### Rendering Engine

-   HTML5 Canvas 2D API\
-   Clipping paths per slot\
-   Transformations: translate, scale, rotate\
-   Fit logic:
    -   Cover = fill slot, crop overflow\
    -   Contain = full image visible, possible letterboxing

------------------------------------------------------------------------

### 3.6 Export

#### PNG Export (Required)

-   Render full-resolution canvas at exact pixel target\
-   300 DPI equivalent sizing\
-   Export using `canvas.toBlob("image/png")`\
-   Trigger browser download

#### PDF Export (Optional)

-   Use `pdf-lib`\
-   Single page sized to physical inches\
-   Embed PNG 1:1 without scaling

------------------------------------------------------------------------

## 4. Technical Architecture

### 4.1 Frontend Framework

-   Next.js (React)\
-   TypeScript\
-   App Router

### 4.2 Styling & UI

-   Tailwind CSS\
-   shadcn/ui\
-   lucide-react

### 4.3 State Management

Use Zustand store:

    {
      assets: ImageAsset[],
      projectConfig: {
        frameSize,
        orientation,
        dpi,
        templateId,
        gutter,
        bleed,
        safeZone
      },
      slots: SlotState[],
      uiState: {
        selectedSlot,
        overlaysEnabled
      }
    }

------------------------------------------------------------------------

### 4.4 Optional Persistence

-   IndexedDB\
-   Library: idb-keyval or dexie\
-   Save assets, configuration, and slot transforms

------------------------------------------------------------------------

### 4.5 Performance

-   Use createImageBitmap for decoding\
-   OffscreenCanvas for export if supported\
-   Web Worker for high-res export (recommended)\
-   Scaled preview canvas for responsiveness

------------------------------------------------------------------------

## 5. Component Structure

### Pages

-   `/` -- Main collage builder

### Components

-   Uploader\
-   FrameSizeSelector\
-   TemplateSelector\
-   CanvasPreview\
-   SlotControls\
-   ExportPanel\
-   OverlayToggle\
-   Toolbar

------------------------------------------------------------------------

## 6. Layout Engine Specification

### Input

-   Frame pixel dimensions\
-   Template definition\
-   Gutter size

### Output

-   Absolute pixel rectangles per slot

### Requirements

-   Normalize layout internally (0--1 system)\
-   Convert to pixel coordinates during render\
-   Maintain proportional gutters

------------------------------------------------------------------------

## 7. Error Handling

Handle:

-   Invalid file type\
-   File too large\
-   Decode failure\
-   Less than 2 images\
-   More than 4 images

Provide clear UI feedback.

------------------------------------------------------------------------

## 8. Accessibility

-   Keyboard-accessible controls\
-   Visible focus states\
-   Clear labeling\
-   No color-only indicators

------------------------------------------------------------------------

## 9. Security & Privacy

-   No server uploads\
-   No persistent external storage\
-   EXIF metadata stripped by default\
-   "Clear project" resets memory and IndexedDB

------------------------------------------------------------------------

## 10. Acceptance Criteria

1.  Upload 2--4 JPG/PNG images\
2.  Select frame size and orientation\
3.  Choose layout template\
4.  Accurate aspect ratio preview\
5.  PNG export matches exact 300 DPI pixel dimensions\
6.  Print-ready output without distortion

------------------------------------------------------------------------

## 11. Future Enhancements

-   Drag-to-adjust cropping\
-   Custom layout builder\
-   Borders and backgrounds\
-   HEIC support\
-   Multi-page layouts\
-   Cloud save/share\
-   Mobile editing optimization

------------------------------------------------------------------------

## 12. Recommended Libraries

-   Next.js\
-   TypeScript\
-   Tailwind CSS\
-   shadcn/ui\
-   zustand\
-   react-dropzone\
-   pdf-lib (optional)\
-   idb-keyval or dexie

------------------------------------------------------------------------

End of Document
